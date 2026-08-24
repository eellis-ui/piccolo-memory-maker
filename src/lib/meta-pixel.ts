/**
 * Meta (Facebook) Pixel helpers.
 *
 * The base pixel is loaded in index.html (fbq init + initial PageView).
 * These helpers fire the standard funnel events from the SPA:
 *   PageView (route changes) → ViewContent (/pricing) → AddToCart →
 *   InitiateCheckout (builder entry) → Purchase
 *
 * Commerce events carry an `eventID`. The same ID is sent with the
 * server-side twin of the event (Conversions API) so Meta deduplicates the
 * pair instead of double-counting it. See src/lib/meta-capi.ts.
 *
 * Every call is a safe no-op when the pixel script is unavailable
 * (ad blockers, script failed to load) — analytics must never break the app.
 */

import { sendCapiEvent } from "./meta-capi";

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

/** US-only storefront: all displayed prices and all pixel values are USD. */
export const CURRENCY = "USD";
const CONTENT_NAME = "Personalised Colouring Book";

function fbq(...args: unknown[]) {
  try {
    window.fbq?.(...args);
  } catch {
    // never break the app for analytics
  }
}

/** Round to 2dp — Meta rejects values with float noise (e.g. 59.500000000001). */
function money(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(2));
}

/**
 * A one-off ID shared between a browser event and its Conversions API twin.
 * Purchase does not use this — it derives a deterministic ID from the order
 * reference so the Shopify webhook can compute the identical ID server-side.
 */
function newEventId(prefix: string): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // fall through to the timestamp form
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Deterministic Purchase event ID, keyed on the Shopify order number.
 *
 * Must stay byte-identical to the ID built in the `shopify-order-webhook`
 * edge function — that shared string is what makes Meta deduplicate the
 * browser Purchase against the server-side one.
 */
export function purchaseEventId(orderRef: string): string {
  return `purchase-${orderRef}`;
}

/** SPA route change — the initial page load is tracked by index.html. */
export function metaPageView() {
  fbq("track", "PageView");
}

/**
 * Product view. `value` is the price of the bundle the user is currently
 * looking at, so Meta can optimise against real basket sizes.
 */
export function metaViewContent(contentName: string = CONTENT_NAME, value?: number) {
  fbq("track", "ViewContent", {
    content_name: contentName,
    content_type: "product",
    currency: CURRENCY,
    ...(typeof value === "number" ? { value: money(value) } : {}),
  });
}

export function metaAddToCart(value: number, numItems: number) {
  const eventId = newEventId("atc");
  fbq(
    "track",
    "AddToCart",
    {
      value: money(value),
      currency: CURRENCY,
      content_name: CONTENT_NAME,
      content_type: "product",
      num_items: numItems,
    },
    { eventID: eventId },
  );
  sendCapiEvent("AddToCart", eventId, {
    value: money(value),
    currency: CURRENCY,
    numItems,
    contentName: CONTENT_NAME,
  });
}

export function metaInitiateCheckout(value: number, numItems: number) {
  const eventId = newEventId("ic");
  fbq(
    "track",
    "InitiateCheckout",
    {
      value: money(value),
      currency: CURRENCY,
      content_name: CONTENT_NAME,
      content_type: "product",
      num_items: numItems,
    },
    { eventID: eventId },
  );
  sendCapiEvent("InitiateCheckout", eventId, {
    value: money(value),
    currency: CURRENCY,
    numItems,
    contentName: CONTENT_NAME,
  });
}

/**
 * The eventID (keyed on the Shopify order number) lets Meta deduplicate
 * this browser-side Purchase against the server-side Purchase sent by the
 * `shopify-order-webhook` edge function for the same order.
 *
 * Without an order reference there is nothing to deduplicate against, so the
 * event is sent unkeyed rather than suppressed.
 */
export function metaPurchase(value: number, numItems: number, orderRef?: string | null) {
  fbq(
    "track",
    "Purchase",
    {
      value: money(value),
      currency: CURRENCY,
      content_name: CONTENT_NAME,
      content_type: "product",
      num_items: numItems,
    },
    orderRef ? { eventID: purchaseEventId(orderRef) } : undefined,
  );
}
