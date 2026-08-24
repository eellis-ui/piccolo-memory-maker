/**
 * Meta Conversions API relay for browser-originated funnel events.
 *
 * The browser fires the pixel event AND calls this function with the same
 * `event_id`. Meta deduplicates the pair, so a visitor whose pixel loads is
 * counted once; a visitor whose pixel is blocked still produces the server
 * event. See src/lib/meta-capi.ts for the caller.
 *
 * Purchase is NOT accepted here — it is sent by `shopify-order-webhook`,
 * which reads the authoritative order total from Shopify. Accepting a
 * client-supplied Purchase value would let anyone inflate revenue reporting.
 *
 * Required secret: META_CAPI_ACCESS_TOKEN
 * Optional secrets: META_PIXEL_ID (defaults to the live pixel),
 *                   META_TEST_EVENT_CODE (routes events to Test Events)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GRAPH_API_VERSION = "v21.0";
const DEFAULT_PIXEL_ID = "1809702712963152";

/** Only funnel events the browser is allowed to originate. */
const ALLOWED_EVENTS = new Set(["AddToCart", "InitiateCheckout"]);

/** Ceiling on a client-supplied value — a sanity bound, not a business rule. */
const MAX_VALUE = 10_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** First hop in X-Forwarded-For is the real client. */
function clientIp(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const accessToken = Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!accessToken) {
    // Not configured yet — succeed quietly so the browser never sees an error.
    console.warn("META_CAPI_ACCESS_TOKEN is not set — skipping server-side event");
    return json({ ok: true, skipped: "no_access_token" });
  }

  try {
    const payload = await req.json();

    const eventName = String(payload.event_name || "");
    if (!ALLOWED_EVENTS.has(eventName)) {
      return json({ error: `Unsupported event_name: ${eventName}` }, 400);
    }

    const eventId = String(payload.event_id || "");
    if (!eventId) {
      return json({ error: "event_id is required for deduplication" }, 400);
    }

    const rawValue = Number(payload.value);
    if (!Number.isFinite(rawValue) || rawValue < 0 || rawValue > MAX_VALUE) {
      return json({ error: "value out of range" }, 400);
    }
    const value = Number(rawValue.toFixed(2));

    const numItems = Number.isFinite(Number(payload.num_items))
      ? Math.max(0, Math.trunc(Number(payload.num_items)))
      : undefined;

    const userData: Record<string, unknown> = {
      client_user_agent: req.headers.get("user-agent") || undefined,
      client_ip_address: clientIp(req),
    };
    if (payload.fbp) userData.fbp = String(payload.fbp);
    if (payload.fbc) userData.fbc = String(payload.fbc);

    const event = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: payload.event_source_url ? String(payload.event_source_url) : undefined,
      action_source: "website",
      user_data: userData,
      custom_data: {
        value,
        currency: String(payload.currency || "USD"),
        content_name: payload.content_name ? String(payload.content_name) : undefined,
        content_type: "product",
        ...(numItems !== undefined ? { num_items: numItems } : {}),
      },
    };

    const pixelId = Deno.env.get("META_PIXEL_ID") || DEFAULT_PIXEL_ID;
    const testEventCode = Deno.env.get("META_TEST_EVENT_CODE");

    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [event],
          access_token: accessToken,
          ...(testEventCode ? { test_event_code: testEventCode } : {}),
        }),
      },
    );

    const result = await res.json();
    if (!res.ok) {
      console.error("Meta CAPI rejected event:", eventName, eventId, JSON.stringify(result));
      return json({ ok: false, error: result }, 502);
    }

    console.log("Meta CAPI accepted:", eventName, eventId, JSON.stringify(result));
    return json({ ok: true, event_name: eventName, event_id: eventId, result });
  } catch (err) {
    console.error("Meta CAPI relay error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
