import { describe, it, expect, beforeEach, vi } from "vitest";

// The CAPI bridge pulls in the Supabase client, which needs env vars at import
// time — mock it out and assert on the calls instead.
vi.mock("./meta-capi", () => ({ sendCapiEvent: vi.fn() }));

import { sendCapiEvent } from "./meta-capi";
import {
  CURRENCY,
  purchaseEventId,
  metaViewContent,
  metaAddToCart,
  metaInitiateCheckout,
  metaPurchase,
} from "./meta-pixel";

const fbq = vi.fn();

/** The params object of the first fbq call. */
function params(): Record<string, unknown> {
  return fbq.mock.calls[0][2] as Record<string, unknown>;
}

/** The options object (where eventID lives) of the first fbq call. */
function options(): Record<string, unknown> | undefined {
  return fbq.mock.calls[0][3] as Record<string, unknown> | undefined;
}

beforeEach(() => {
  fbq.mockClear();
  vi.mocked(sendCapiEvent).mockClear();
  window.fbq = fbq;
});

describe("currency", () => {
  it("is USD — the storefront prices in dollars", () => {
    expect(CURRENCY).toBe("USD");
  });

  it("is USD on every commerce event", () => {
    for (const fire of [
      () => metaViewContent("x", 35),
      () => metaAddToCart(35, 1),
      () => metaInitiateCheckout(35, 1),
      () => metaPurchase(35, 1, "#1001"),
    ]) {
      fbq.mockClear();
      fire();
      expect(params().currency).toBe("USD");
    }
  });
});

describe("metaViewContent", () => {
  it("reports the selected bundle price as value", () => {
    metaViewContent("Personalised Colouring Book", 59.5);
    expect(fbq.mock.calls[0][1]).toBe("ViewContent");
    expect(params().value).toBe(59.5);
  });

  it("omits value entirely when no price is known", () => {
    metaViewContent("Book Builder");
    expect(params()).not.toHaveProperty("value");
  });

  it("rounds float noise to 2dp", () => {
    metaViewContent("x", 69.30000000000001);
    expect(params().value).toBe(69.3);
  });
});

describe("metaAddToCart", () => {
  it("sends value, currency and num_items", () => {
    metaAddToCart(69.3, 3);
    expect(fbq.mock.calls[0][1]).toBe("AddToCart");
    expect(params()).toMatchObject({ value: 69.3, currency: "USD", num_items: 3 });
  });

  it("mirrors to the Conversions API under the same event_id", () => {
    metaAddToCart(35, 1);
    const browserEventId = options()?.eventID;
    expect(browserEventId).toBeTruthy();
    expect(sendCapiEvent).toHaveBeenCalledWith(
      "AddToCart",
      browserEventId,
      expect.objectContaining({ value: 35, currency: "USD", numItems: 1 }),
    );
  });
});

describe("metaInitiateCheckout", () => {
  it("mirrors to the Conversions API under the same event_id", () => {
    metaInitiateCheckout(59.5, 2);
    const browserEventId = options()?.eventID;
    expect(fbq.mock.calls[0][1]).toBe("InitiateCheckout");
    expect(sendCapiEvent).toHaveBeenCalledWith(
      "InitiateCheckout",
      browserEventId,
      expect.objectContaining({ value: 59.5, numItems: 2 }),
    );
  });
});

describe("metaPurchase", () => {
  it("keys the event ID on the order so the webhook can match it", () => {
    metaPurchase(74.29, 2, "#1001");
    expect(options()).toEqual({ eventID: "purchase-#1001" });
    expect(purchaseEventId("#1001")).toBe("purchase-#1001");
  });

  it("includes add-on value in the reported total", () => {
    // 59.50 bundle + 4.99 extra photos + 1.99 custom cover
    metaPurchase(66.48, 2, "#1002");
    expect(params().value).toBe(66.48);
  });

  it("is never mirrored from the browser — the Shopify webhook owns it", () => {
    metaPurchase(35, 1, "#1003");
    expect(sendCapiEvent).not.toHaveBeenCalled();
  });

  it("still fires when there is no order reference to key on", () => {
    metaPurchase(35, 1, null);
    expect(fbq).toHaveBeenCalled();
    expect(options()).toBeUndefined();
  });
});

describe("resilience", () => {
  it("does not throw when the pixel is blocked", () => {
    window.fbq = undefined;
    expect(() => metaAddToCart(35, 1)).not.toThrow();
  });

  it("does not throw when the pixel itself throws", () => {
    window.fbq = () => {
      throw new Error("blocked");
    };
    expect(() => metaPurchase(35, 1, "#1004")).not.toThrow();
  });
});
