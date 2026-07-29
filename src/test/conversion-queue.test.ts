import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const invoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

// Imported after the mock so the module picks it up.
const { enqueueConversion, onConversion, isQueued, queueDepth, allowRetry } =
  await import("@/lib/conversion-queue");

/** Resolve once the queue has drained or the wait times out. */
function drained(timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (queueDepth() === 0) return resolve();
      if (Date.now() - started > timeoutMs) return reject(new Error("queue did not drain"));
      setTimeout(tick, 5);
    };
    tick();
  });
}

let unsubscribers: Array<() => void> = [];

beforeEach(() => {
  invoke.mockReset();
  invoke.mockResolvedValue({ data: { success: true, convertedUrl: "u", convertedPath: "p" }, error: null });
});

afterEach(() => {
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
});

function collect(): { outcomes: Array<{ photoId: string; ok: boolean }> } {
  const bucket: Array<{ photoId: string; ok: boolean }> = [];
  unsubscribers.push(onConversion((o) => bucket.push({ photoId: o.photoId, ok: o.ok })));
  return { outcomes: bucket };
}

describe("conversion queue", () => {
  it("converts a queued photo once", async () => {
    const { outcomes } = collect();
    enqueueConversion("photo-a", "sess");
    await drained();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(outcomes).toEqual([{ photoId: "photo-a", ok: true }]);
  });

  it("does not pay to convert the same photo twice", async () => {
    enqueueConversion("photo-b", "sess");
    enqueueConversion("photo-b", "sess");
    enqueueConversion("photo-b", "sess");
    await drained();
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("ignores a re-queue after the photo has already converted", async () => {
    enqueueConversion("photo-c", "sess");
    await drained();
    enqueueConversion("photo-c", "sess");
    await drained();
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("never runs more than four conversions at once", async () => {
    let inFlight = 0;
    let peak = 0;
    invoke.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 10));
      inFlight -= 1;
      return { data: { success: true }, error: null };
    });

    for (let i = 0; i < 12; i++) enqueueConversion(`bulk-${i}`, "sess");
    await drained();

    expect(invoke).toHaveBeenCalledTimes(12);
    expect(peak).toBeLessThanOrEqual(4);
  });

  it("reports failure and leaves the photo retryable", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "boom" } });
    const { outcomes } = collect();

    enqueueConversion("photo-d", "sess");
    await drained();
    expect(outcomes).toEqual([{ photoId: "photo-d", ok: false }]);

    // A failed photo must be re-queueable, otherwise the retry button is inert.
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    enqueueConversion("photo-d", "sess");
    await drained();
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("treats a success:false body as a failure", async () => {
    invoke.mockResolvedValue({ data: { success: false, error: "no" }, error: null });
    const { outcomes } = collect();
    enqueueConversion("photo-e", "sess");
    await drained();
    expect(outcomes).toEqual([{ photoId: "photo-e", ok: false }]);
  });

  it("reports a photo as queued while in flight", async () => {
    invoke.mockImplementation(
      () => new Promise((r) => setTimeout(() => r({ data: { success: true }, error: null }), 20)),
    );
    enqueueConversion("photo-f", "sess");
    expect(isQueued("photo-f")).toBe(true);
    await drained();
    expect(isQueued("photo-f")).toBe(false);
  });

  it("allowRetry re-opens a converted photo", async () => {
    enqueueConversion("photo-g", "sess");
    await drained();
    allowRetry("photo-g");
    enqueueConversion("photo-g", "sess");
    await drained();
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("ignores calls with a missing id or session", async () => {
    enqueueConversion("", "sess");
    enqueueConversion("photo-h", "");
    await drained();
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe("eager conversion cap", () => {
  it("converts only the first four photos of an order on upload", async () => {
    const { enqueueEagerConversion, eagerUsed } = await import("@/lib/conversion-queue");
    const queued = Array.from({ length: 9 }, (_, i) =>
      enqueueEagerConversion(`eager-${i}`, "sess", "order-1"),
    );
    await drained();
    expect(queued.filter(Boolean)).toHaveLength(4);
    expect(invoke).toHaveBeenCalledTimes(4);
    expect(eagerUsed("order-1")).toBe(4);
  });

  it("counts the cap per order, not globally", async () => {
    const { enqueueEagerConversion } = await import("@/lib/conversion-queue");
    for (let i = 0; i < 6; i++) enqueueEagerConversion(`a-${i}`, "sess", "order-a");
    for (let i = 0; i < 6; i++) enqueueEagerConversion(`b-${i}`, "sess", "order-b");
    await drained();
    // Four each, not four between them.
    expect(invoke).toHaveBeenCalledTimes(8);
  });

  it("still lets Approve convert the photos the cap skipped", async () => {
    const { enqueueEagerConversion, enqueueConversion } = await import("@/lib/conversion-queue");
    for (let i = 0; i < 6; i++) enqueueEagerConversion(`c-${i}`, "sess", "order-c");
    await drained();
    expect(invoke).toHaveBeenCalledTimes(4);

    // Approve enqueues unconditionally; the two skipped photos must go through.
    enqueueConversion("c-4", "sess");
    enqueueConversion("c-5", "sess");
    await drained();
    expect(invoke).toHaveBeenCalledTimes(6);
  });

  it("ignores a missing order id rather than converting uncapped", async () => {
    const { enqueueEagerConversion } = await import("@/lib/conversion-queue");
    expect(enqueueEagerConversion("no-order", "sess", "")).toBe(false);
    await drained();
    expect(invoke).not.toHaveBeenCalled();
  });
});
