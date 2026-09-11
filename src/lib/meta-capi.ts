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
import { isAnalyticsOptedOut } from "@/lib/analytics-tracker";

export function readCookie(name: string): string | null {
  try {
    const m = document.cookie.match(
      new RegExp("(?:^|; )" + name.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&") + "=([^;]*)"),
    );
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Persist the ad click ID on landing. The pixel normally writes it to the
 * _fbc cookie, but a blocked or late-loading pixel would lose the click —
 * and with it, attribution for the whole session.
 */
export function captureFbclid(): void {
  try {
    const fbclid = new URLSearchParams(window.location.search).get("fbclid");
    if (fbclid) sessionStorage.setItem("fbclid", fbclid);
  } catch {
    // storage unavailable — nothing to persist
  }
}

/**
 * Meta's browser identifiers: _fbp (set by the pixel for every visitor) and
 * _fbc (the ad click). When the _fbc cookie is missing, rebuild it from the
 * fbclid in Meta's documented `fb.1.<timestamp>.<fbclid>` format.
 */
export function getMetaBrowserIds(): { fbp: string | null; fbc: string | null } {
  const fbp = readCookie("_fbp");
  let fbc = readCookie("_fbc");
  if (!fbc) {
    let fbclid: string | null = null;
    try {
      fbclid = new URLSearchParams(window.location.search).get("fbclid") || sessionStorage.getItem("fbclid");
    } catch {
      // storage unavailable
    }
    if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
  }
  return { fbp, fbc };
}

export function relayMetaEvent(
  eventName: "AddToCart" | "InitiateCheckout",
  eventId: string,
  value: number,
  numItems: number,
) {
  if (isAnalyticsOptedOut()) return;
  try {
    const { fbp, fbc } = getMetaBrowserIds();
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
          fbp: fbp ?? undefined,
          fbc: fbc ?? undefined,
        },
      })
      .then(({ error }) => {
        if (error) console.warn("[meta-capi]", error.message ?? error);
      });
  } catch {
    // never break the app for analytics
  }
}
