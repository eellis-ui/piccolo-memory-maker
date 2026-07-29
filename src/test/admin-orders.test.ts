import { describe, it, expect } from "vitest";
import { attentionFor, matchesQuery, type AdminOrder, type AdminPhoto } from "@/hooks/use-admin-orders";

const photo = (status: string, position = 1): AdminPhoto => ({
  id: `p${position}-${status}`,
  page_position: position,
  conversion_status: status,
  is_approved: false,
  is_landscape: false,
  original_path: "o",
  converted_path: status === "completed" ? "c" : null,
});

const order = (over: Partial<AdminOrder> = {}): AdminOrder => ({
  id: "11111111-2222-3333-4444-555555555555",
  created_at: new Date("2026-07-20T10:00:00Z").toISOString(),
  status: "draft",
  payment_status: null,
  order_name: "PIC16781964",
  shopify_order_number: "#1964",
  customer_name: "Jo Bloggs",
  customer_email: "jo@example.com",
  customer_phone: "07700900000",
  tracking_number: null,
  shipped_at: null,
  builder_step: "upload",
  digital_download: false,
  production_pdf_path: null,
  digital_pdf_path: null,
  photos: [],
  ...over,
});

const NOW = new Date("2026-07-29T10:00:00Z").getTime();

describe("attentionFor", () => {
  it("flags a paid order whose art was never generated", () => {
    // The real PIC16781964: paid 20 July, 20 photos, none converted.
    const result = attentionFor(
      order({ status: "paid", photos: Array.from({ length: 20 }, (_, i) => photo("pending", i)) }),
      NOW,
    );
    expect(result?.reason).toBe("unconverted_paid");
    expect(result?.detail).toContain("20 of 20");
  });

  it("treats payment_status as paid even when status lags", () => {
    const result = attentionFor(
      order({ status: "draft", payment_status: "paid", photos: [photo("pending")] }),
      NOW,
    );
    expect(result?.reason).toBe("unconverted_paid");
  });

  it("ranks unconverted-paid above a failed conversion", () => {
    const result = attentionFor(
      order({ status: "paid", photos: [photo("pending", 1), photo("failed", 2)] }),
      NOW,
    );
    expect(result?.reason).toBe("unconverted_paid");
  });

  it("flags failed conversions on an unpaid build", () => {
    const result = attentionFor(order({ photos: [photo("failed")] }), NOW);
    expect(result?.reason).toBe("failed_conversions");
  });

  it("flags a paid order that is fully converted but not shipped", () => {
    const result = attentionFor(order({ status: "paid", photos: [photo("completed")] }), NOW);
    expect(result?.reason).toBe("paid_awaiting_shipment");
  });

  it("says nothing about a shipped order", () => {
    expect(attentionFor(order({ status: "shipped", photos: [photo("completed")] }), NOW)).toBeNull();
  });

  it("flags a draft abandoned with work in it, but not a fresh one", () => {
    const stale = order({ created_at: new Date("2026-07-01T10:00:00Z").toISOString(), photos: [photo("completed")] });
    expect(attentionFor(stale, NOW)?.reason).toBe("stalled_draft");

    const fresh = order({ created_at: new Date("2026-07-28T10:00:00Z").toISOString(), photos: [photo("completed")] });
    expect(attentionFor(fresh, NOW)).toBeNull();
  });

  it("ignores an empty draft — nobody abandoned anything", () => {
    const empty = order({ created_at: new Date("2026-06-01T10:00:00Z").toISOString(), photos: [] });
    expect(attentionFor(empty, NOW)).toBeNull();
  });
});

describe("matchesQuery", () => {
  const o = order();

  it("matches the fields staff search by on a support call", () => {
    for (const q of ["PIC16781964", "1964", "#1964", "jo@example.com", "Jo Bloggs", "07700900000"]) {
      expect(matchesQuery(o, q)).toBe(true);
    }
  });

  it("is case and whitespace insensitive", () => {
    expect(matchesQuery(o, "  jo bloggs  ")).toBe(true);
    expect(matchesQuery(o, "pic16781964")).toBe(true);
  });

  it("matches on partial id", () => {
    expect(matchesQuery(o, "11111111")).toBe(true);
  });

  it("returns everything for an empty query", () => {
    expect(matchesQuery(o, "")).toBe(true);
    expect(matchesQuery(o, "   ")).toBe(true);
  });

  it("does not match an unrelated term", () => {
    expect(matchesQuery(o, "zzzz")).toBe(false);
  });

  it("tolerates missing customer fields", () => {
    const sparse = order({ customer_name: null, customer_email: null, customer_phone: null });
    expect(matchesQuery(sparse, "jo")).toBe(false);
    expect(matchesQuery(sparse, "PIC167")).toBe(true);
  });
});
