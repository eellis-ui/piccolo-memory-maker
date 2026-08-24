/**
 * Meta Conversions API (server-side) bridge.
 *
 * Browser events are mirrored to Meta through the `meta-capi` edge function so
 * that conversions still land when the browser pixel is blocked. Each mirrored
 * event carries the SAME `event_id` as its browser twin — Meta uses that to
 * deduplicate the pair, so a user with a working pixel is counted once, not
 * twice.
 *
 * Purchase is deliberately NOT sent from here. It is sent server-side by the
 * `shopify-order-webhook` function, which has the authoritative order total.
 *
 * Every call is fire-and-forget and never throws — analytics must never break
 * the app or delay a checkout redirect.
 */

import { supabase } from "@/integrations/supabase/client";

export type CapiEventName = "AddToCart" | "InitiateCheckout";

interface CapiPayload {
  event_name: CapiEventName;
  event_id: string;
  event_source_url: string;
  value: number;
  currency: string;
  num_items: number;
  content_name: string;
  /** Meta browser cookies — materially improve match quality when present. */
  fbp?: string;
  fbc?: string;
}

/** Read a cookie without pulling in a dependency. */
function readCookie(name: string): string | undefined {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Mirror a browser pixel event to the Conversions API.
 *
 * Deliberately not awaited by callers: a slow or failing Meta round-trip must
 * never hold up the UI.
 */
export function sendCapiEvent(
  eventName: CapiEventName,
  eventId: string,
  params: { value: number; currency: string; numItems: number; contentName: string },
): void {
  try {
    const payload: CapiPayload = {
      event_name: eventName,
      event_id: eventId,
      event_source_url: window.location.href,
      value: Number(params.value.toFixed(2)),
      currency: params.currency,
      num_items: params.numItems,
      content_name: params.contentName,
      fbp: readCookie("_fbp"),
      fbc: readCookie("_fbc"),
    };

    // invoke() resolves with { error } for a non-2xx function response and
    // only rejects on transport failure, so both have to be handled.
    void supabase.functions
      .invoke("meta-capi", { body: payload })
      .then(({ error }) => {
        if (error) console.warn("Meta CAPI event rejected:", eventName, error);
      })
      .catch((err) => console.warn("Meta CAPI event failed:", eventName, err));
  } catch (err) {
    console.warn("Meta CAPI event failed:", err);
  }
}
