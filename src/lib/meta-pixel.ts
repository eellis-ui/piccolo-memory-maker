/**
 * Meta (Facebook) Pixel helpers.
 *
 * The base pixel is loaded in index.html (fbq init + initial PageView).
 * These helpers fire the standard funnel events from the SPA:
 *   PageView (route changes) → ViewContent → AddToCart →
 *   InitiateCheckout → Purchase
 *
 * Every call is a safe no-op when the pixel script is unavailable
 * (ad blockers, script failed to load) — analytics must never break the app.
 */

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

const CURRENCY = "GBP";
const CONTENT_NAME = "Personalised Colouring Book";

function fbq(...args: unknown[]) {
  try {
    window.fbq?.(...args);
  } catch {
    // never break the app for analytics
  }
}

/** SPA route change — the initial page load is tracked by index.html. */
export function metaPageView() {
  fbq("track", "PageView");
}

export function metaViewContent(contentName: string = CONTENT_NAME) {
  fbq("track", "ViewContent", {
    content_name: contentName,
    content_type: "product",
    currency: CURRENCY,
  });
}

export function metaAddToCart(value: number, numItems: number) {
  fbq("track", "AddToCart", {
    value: Number(value.toFixed(2)),
    currency: CURRENCY,
    content_name: CONTENT_NAME,
    content_type: "product",
    num_items: numItems,
  });
}

export function metaInitiateCheckout(value: number, numItems: number) {
  fbq("track", "InitiateCheckout", {
    value: Number(value.toFixed(2)),
    currency: CURRENCY,
    content_name: CONTENT_NAME,
    content_type: "product",
    num_items: numItems,
  });
}

/**
 * The eventID (keyed on the Shopify order number) lets Meta deduplicate
 * this browser-side Purchase against any server-side / Shopify-side event
 * for the same order that uses the same ID.
 */
export function metaPurchase(value: number, numItems: number, orderRef?: string | null) {
  fbq(
    "track",
    "Purchase",
    {
      value: Number(value.toFixed(2)),
      currency: CURRENCY,
      content_name: CONTENT_NAME,
      content_type: "product",
      num_items: numItems,
    },
    orderRef ? { eventID: `purchase-${orderRef}` } : undefined,
  );
}
