import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { createShopifyCheckout, SHOPIFY_VARIANTS } from "./shopify";

/**
 * The Shopify store has both a GB and a US market. A cart created without a
 * buyer country falls back to GB and prices in GBP, which silently bills a US
 * shopper in pounds at GB-market prices. The storefront is US-only, so every
 * cart has to name its market explicitly.
 */
const okResponse = (currencyCode = "USD") => ({
  ok: true,
  status: 200,
  json: async () => ({
    data: {
      cartCreate: {
        cart: {
          id: "gid://shopify/Cart/1",
          checkoutUrl: "https://piccaload.myshopify.com/cart/c/abc",
          cost: { subtotalAmount: { amount: "49.99", currencyCode } },
          lines: { edges: [] },
        },
        userErrors: [],
      },
    },
  }),
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(okResponse());
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function sentInput() {
  return JSON.parse(fetchMock.mock.calls[0][1].body).variables.input;
}

describe("createShopifyCheckout market", () => {
  it("pins the cart to the US market", async () => {
    await createShopifyCheckout([{ merchandiseId: SHOPIFY_VARIANTS.COLORING_BOOK, quantity: 1 }]);
    expect(sentInput().buyerIdentity).toEqual({ countryCode: "US" });
  });

  it("keeps the market when a builder session note is attached", async () => {
    await createShopifyCheckout(
      [{ merchandiseId: SHOPIFY_VARIANTS.COLORING_BOOK_2_BUNDLE, quantity: 1 }],
      "session-123",
    );
    const input = sentInput();
    expect(input.buyerIdentity).toEqual({ countryCode: "US" });
    expect(input.attributes).toEqual([{ key: "builder_session_id", value: "session-123" }]);
  });

  it("still returns a checkout URL", async () => {
    const url = await createShopifyCheckout([
      { merchandiseId: SHOPIFY_VARIANTS.COLORING_BOOK, quantity: 1 },
    ]);
    expect(url).toContain("piccaload.myshopify.com/cart/c/abc");
  });

  it("shouts if Shopify prices the cart in anything but USD", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(okResponse("GBP"));
    await createShopifyCheckout([{ merchandiseId: SHOPIFY_VARIANTS.COLORING_BOOK, quantity: 1 }]);
    expect(err).toHaveBeenCalledWith(expect.stringContaining("Cart created in GBP"));
    err.mockRestore();
  });
});
