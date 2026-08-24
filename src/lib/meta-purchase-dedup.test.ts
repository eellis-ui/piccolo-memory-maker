import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { purchaseEventId } from "./meta-pixel";

/**
 * Purchase deduplication spans two deploy units: the browser pixel here and
 * the `shopify-order-webhook` edge function, which runs on Deno and cannot
 * import from src/. They agree only because both build the same string from
 * the Shopify order number.
 *
 * Nothing at build time couples them, so this test reads the deployed webhook
 * source and checks the contract still holds. If it fails, browser and server
 * Purchases will both be counted and revenue will read double.
 */
const WEBHOOK_SOURCE = readFileSync(
  resolve(__dirname, "../../supabase/functions/shopify-order-webhook/index.ts"),
  "utf8",
);

describe("Purchase event ID contract", () => {
  it("the webhook derives the order number the way the browser expects", () => {
    // The line the browser's orders row ultimately gets its value from.
    expect(WEBHOOK_SOURCE).toContain(
      'const shopifyOrderNumber = payload.order_number ? `#${payload.order_number}` : orderName;',
    );
  });

  it("the webhook keys its Purchase event ID on that order number", () => {
    expect(WEBHOOK_SOURCE).toContain("eventId: `purchase-${shopifyOrderNumber}`");
  });

  it("both sides produce the identical string for the same order", () => {
    // Replicates the webhook's derivation for a realistic Shopify payload.
    const payload = { order_number: 1042, name: "PIC1042" };
    const orderName = payload.name || null;
    const shopifyOrderNumber = payload.order_number ? `#${payload.order_number}` : orderName;

    // The browser reads shopify_order_number back off the orders row, which the
    // webhook wrote from that same variable.
    expect(purchaseEventId(shopifyOrderNumber!)).toBe(`purchase-${shopifyOrderNumber}`);
    expect(purchaseEventId(shopifyOrderNumber!)).toBe("purchase-#1042");
  });

  it("falls back to the order name identically on both sides", () => {
    const payload = { order_number: undefined, name: "PIC16781962" };
    const orderName = payload.name || null;
    const shopifyOrderNumber = payload.order_number ? `#${payload.order_number}` : orderName;

    expect(purchaseEventId(shopifyOrderNumber!)).toBe("purchase-PIC16781962");
  });

  it("the relay refuses Purchase so only the webhook can report revenue", () => {
    const relay = readFileSync(
      resolve(__dirname, "../../supabase/functions/meta-capi/index.ts"),
      "utf8",
    );
    const allowed = relay.match(/ALLOWED_EVENTS = new Set\(\[([^\]]*)\]\)/)?.[1] ?? "";
    expect(allowed).toContain("AddToCart");
    expect(allowed).toContain("InitiateCheckout");
    expect(allowed).not.toContain("Purchase");
  });
});
