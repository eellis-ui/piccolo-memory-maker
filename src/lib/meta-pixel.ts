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

import { relayMetaEvent } from "@/lib/meta-capi";

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

// The store sells in USD (Shopify charges USD; the server-side Purchase
// reports USD). This was "GBP" for months, corrupting value reporting.
const CURRENCY = "USD";
const CONTENT_NAME = "Personalized Coloring Book";

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

/**
 * AddToCart / InitiateCheckout fire twice with one shared event_id: the
 * browser pixel AND the meta-capi server relay. Meta deduplicates the pair,
 * so ad-blocked visitors still count (server) and everyone else counts once.
 */
export function metaAddToCart(value: number, numItems: number) {
  const eventId = `atc-${crypto.randomUUID()}`;
  fbq(
    "track",
    "AddToCart",
    {
      value: Number(value.toFixed(2)),
      currency: CURRENCY,
      content_name: CONTENT_NAME,
      content_type: "product",
      num_items: numItems,
    },
    { eventID: eventId },
  );
  relayMetaEvent("AddToCart", eventId, value, numItems);
}

export function metaInitiateCheckout(value: number, numItems: number) {
  const eventId = `ic-${crypto.randomUUID()}`;
  fbq(
    "track",
    "InitiateCheckout",
    {
      value: Number(value.toFixed(2)),
      currency: CURRENCY,
      content_name: CONTENT_NAME,
      content_type: "product",
      num_items: numItems,
    },
    { eventID: eventId },
  );
  relayMetaEvent("InitiateCheckout", eventId, value, numItems);
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
