/**
 * Meta Conversions API relay caller — the browser half of the meta-capi
 * edge function (which was deployed waiting for exactly this file).
 *
 * For AddToCart / InitiateCheckout the pixel event and the relay event share
 * one event_id, so Meta deduplicates the pair: pixel-blocked visitors still
 * produce the server event, everyone else counts once.
 *
 * Purchase is deliberately NOT sent from here — shopify-order-webhook sends
 * it with the authoritative Shopify order total.
 */
import { supabase } from "@/integrations/supabase/client";

const getCookie = (name: string): string | undefined => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
};

/** Meta's browser ID cookie — set by the pixel for every visitor. */
export const getFbp = () => getCookie("_fbp");
/** Meta's click ID cookie — set when the visitor arrived from an ad. */
export const getFbc = () => getCookie("_fbc");

export function relayMetaEvent(
  eventName: "AddToCart" | "InitiateCheckout",
  eventId: string,
  value: number,
  numItems: number,
) {
  try {
    // Fire-and-forget: analytics must never block or break the app.
    supabase.functions
      .invoke("meta-capi", {
        body: {
          event_name: eventName,
          event_id: eventId,
          value: Number(value.toFixed(2)),
          currency: "USD",
          num_items: numItems,
          content_name: "Personalized Coloring Book",
          event_source_url: window.location.href,
          fbp: getFbp(),
          fbc: getFbc(),
        },
      })
      .then(({ error }) => {
        if (error) console.warn("[meta-capi]", error.message ?? error);
      });
  } catch {
    // never break the app for analytics
  }
}
