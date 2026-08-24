/**
 * Shopify Analytics for headless storefront
 *
 * Sends page views, product views, add-to-cart, and checkout events
 * to Shopify's Monorail endpoint so they appear in Shopify Admin
 * under Analytics → Overview (visits, sessions, conversion rate, etc.)
 */
import {
  sendShopifyAnalytics,
  getClientBrowserParameters,
  AnalyticsEventName,
  ShopifySalesChannel,
} from "@shopify/hydrogen-react";

/* ─── Store config ─── */
export const SHOPIFY_ANALYTICS_CONFIG = {
  shopId: "gid://shopify/Shop/91857289589",
  shopDomain: "piccaload.myshopify.com",
  storefrontId: "piccoload-headless",
  // US-only storefront. This must track the market carts are created in
  // (see STOREFRONT_COUNTRY in src/lib/shopify.ts) or Shopify's analytics
  // reports a different currency than the customer is actually charged.
  currency: "USD",
  acceptedLanguage: "en-US",
} as const;

/* ─── Helpers ─── */
function getHasUserConsent(): boolean {
  // Respect DNT header; default to true for analytics
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return false;
  return true;
}

function buildBasePayload() {
  return {
    shopId: SHOPIFY_ANALYTICS_CONFIG.shopId,
    currency: SHOPIFY_ANALYTICS_CONFIG.currency,
    acceptedLanguage: SHOPIFY_ANALYTICS_CONFIG.acceptedLanguage,
    hasUserConsent: getHasUserConsent(),
    shopifySalesChannel: ShopifySalesChannel.headless,
    storefrontId: SHOPIFY_ANALYTICS_CONFIG.storefrontId,
    ...getClientBrowserParameters(),
  };
}

/* ─── Event senders ─── */

/**
 * Track a page view — call on every route change.
 * Feeds: Sessions, Visitors, Live visitors, Top pages
 */
export function trackPageView() {
  try {
    const payload = buildBasePayload();
    sendShopifyAnalytics({
      eventName: AnalyticsEventName.PAGE_VIEW,
      payload,
    });
  } catch (err) {
    console.warn("[Shopify Analytics] PAGE_VIEW failed:", err);
  }
}

/**
 * Track a product view — call when user views pricing / product page.
 * Feeds: Product views, Top products
 */
export function trackProductView(product: {
  id: string;
  title: string;
  price: string;
  vendor?: string;
  variantId?: string;
  variantTitle?: string;
}) {
  try {
    const payload = {
      ...buildBasePayload(),
      products: [
        {
          productGid: product.id,
          title: product.title,
          price: product.price,
          vendor: product.vendor || "Piccoload",
          variantGid: product.variantId || "",
          variantTitle: product.variantTitle || "",
          quantity: 1,
          sku: "",
        },
      ],
    };
    sendShopifyAnalytics({
      eventName: AnalyticsEventName.PRODUCT_VIEW,
      payload,
    });
  } catch (err) {
    console.warn("[Shopify Analytics] PRODUCT_VIEW failed:", err);
  }
}

/**
 * Track add-to-cart — call when items are added to the basket.
 * Feeds: Add to cart rate, Cart analytics
 */
export function trackAddToCart(cartItems: Array<{
  productGid: string;
  variantGid: string;
  title: string;
  price: string;
  quantity: number;
}>) {
  try {
    const totalValue = cartItems.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
    const payload = {
      ...buildBasePayload(),
      cartId: `gid://shopify/Cart/headless-${Date.now()}`,
      totalValue,
      products: cartItems.map((item) => ({
        productGid: item.productGid,
        variantGid: item.variantGid,
        title: item.title,
        price: item.price,
        vendor: "Piccoload",
        variantTitle: "",
        quantity: item.quantity,
        sku: "",
      })),
    };
    sendShopifyAnalytics({
      eventName: AnalyticsEventName.ADD_TO_CART,
      payload,
    });
  } catch (err) {
    console.warn("[Shopify Analytics] ADD_TO_CART failed:", err);
  }
}
