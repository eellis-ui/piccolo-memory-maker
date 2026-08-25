import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Verify Shopify HMAC signature */
async function verifyShopifyWebhook(body: string, hmacHeader: string): Promise<boolean> {
  const secret = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");
  if (!secret) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return computed === hmacHeader;
}

/** SHA-256 hex digest — the format Meta requires for all PII fields. */
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value.trim().toLowerCase()),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Send the server-side Purchase to Meta's Conversions API.
 *
 * `eventId` must be byte-identical to the one the browser pixel used
 * (`purchase-<shopify order number>`, built by purchaseEventId() in
 * src/lib/meta-pixel.ts) so Meta deduplicates the pair rather than counting
 * the order twice.
 *
 * This is the authoritative Purchase: the value comes from Shopify's own
 * order total, so it already includes every add-on.
 *
 * Fire-and-forget — a Meta outage must never fail the Shopify webhook, which
 * Shopify would then retry and double-process.
 */
async function sendMetaPurchase(params: {
  eventId: string;
  value: number;
  currency: string;
  numItems: number;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
}): Promise<void> {
  const accessToken = Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!accessToken) {
    console.warn("META_CAPI_ACCESS_TOKEN is not set — skipping server-side Purchase");
    return;
  }

  try {
    const pixelId = Deno.env.get("META_PIXEL_ID") || "1809702712963152";
    const testEventCode = Deno.env.get("META_TEST_EVENT_CODE");

    const userData: Record<string, unknown> = {};
    if (params.email) userData.em = [await sha256Hex(params.email)];
    if (params.firstName) userData.fn = [await sha256Hex(params.firstName)];
    if (params.lastName) userData.ln = [await sha256Hex(params.lastName)];
    if (params.city) userData.ct = [await sha256Hex(params.city.replace(/\s/g, ""))];
    if (params.zip) userData.zp = [await sha256Hex(params.zip.replace(/\s/g, ""))];
    if (params.country) userData.country = [await sha256Hex(params.country)];

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              event_name: "Purchase",
              event_time: Math.floor(Date.now() / 1000),
              event_id: params.eventId,
              action_source: "website",
              event_source_url: Deno.env.get("SITE_URL") || undefined,
              user_data: userData,
              custom_data: {
                value: Number(params.value.toFixed(2)),
                currency: params.currency,
                content_name: "Personalised Colouring Book",
                content_type: "product",
                num_items: params.numItems,
              },
            },
          ],
          access_token: accessToken,
          ...(testEventCode ? { test_event_code: testEventCode } : {}),
        }),
      },
    );

    const result = await res.json();
    if (!res.ok) {
      console.error("Meta CAPI rejected Purchase:", params.eventId, JSON.stringify(result));
    } else {
      console.log("Meta CAPI accepted Purchase:", params.eventId, JSON.stringify(result));
    }
  } catch (err) {
    console.error("Meta CAPI Purchase failed:", err);
  }
}

console.log(`boot: META_CAPI_ACCESS_TOKEN set: ${!!Deno.env.get("META_CAPI_ACCESS_TOKEN")}`);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const hmac = req.headers.get("X-Shopify-Hmac-Sha256") || "";

    // Verify webhook signature
    const valid = await verifyShopifyWebhook(body, hmac);
    if (!valid) {
      console.error("Invalid Shopify webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(body);
    const customerEmail = payload.email || payload.customer?.email;
    // Shopify "name" is the full order reference incl. prefix (e.g. PIC16781962)
    const orderName = payload.name || null;
    const shopifyOrderNumber = payload.order_number ? `#${payload.order_number}` : orderName;
    const customerName =
      [payload.customer?.first_name, payload.customer?.last_name].filter(Boolean).join(" ") ||
      payload.shipping_address?.name ||
      payload.billing_address?.name ||
      null;
    const orderTotal = parseFloat(payload.total_price || "0");
    
    // Extract discount codes used in this order
    const discountCodes: { code: string; amount: string }[] = payload.discount_codes || [];

    // Extract builder_session_id from cart note attributes
    const noteAttributes: { name: string; value: string }[] = payload.note_attributes || [];
    const sessionId = noteAttributes.find(
      (attr: { name: string }) => attr.name === "builder_session_id",
    )?.value;

    if (!sessionId) {
      console.log("No builder_session_id in order — skipping");
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = adminClient();

    // Find orders for this session
    const { data: orders, error: ordersErr } = await admin
      .from("orders")
      .select("id, digital_download")
      .eq("builder_session_id", sessionId);

    if (ordersErr || !orders || orders.length === 0) {
      console.error("No orders found for session:", sessionId);
      return new Response(JSON.stringify({ ok: true, no_orders: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if digital download was purchased by looking at line items
    const lineItems: { title: string; variant_title: string; sku: string }[] = payload.line_items || [];
    const hasDigitalDownload = lineItems.some(
      (item) =>
        item.title?.toLowerCase().includes("digital") ||
        item.variant_title?.toLowerCase().includes("digital") ||
        item.sku?.toLowerCase().includes("digital"),
    );

    // Update all orders in this session — lightweight status update only
    for (const order of orders) {
      const updates: Record<string, unknown> = {
        payment_status: "paid",
        status: "paid",
        customer_email: customerEmail || null,
        shopify_order_number: shopifyOrderNumber || null,
        order_name: orderName,
        customer_name: customerName,
      };

      if (hasDigitalDownload) {
        updates.digital_download = true;
      }

      await admin.from("orders").update(updates).eq("id", order.id);
    }

    // Record the purchase for the admin live dashboard. Server-side because
    // the browser-side event only fires if the customer returns to the
    // builder tab after paying — most don't. A DB trigger dedupes on
    // metadata->>'shopifyOrderNumber' so webhook retries and the client-side
    // event can never double-count.
    const { error: purchaseEvErr } = await admin.from("analytics_events").insert({
      event_type: "purchase",
      session_id: sessionId,
      path: "/builder/checkout",
      metadata: {
        shopifyOrderNumber,
        bookCount: orders.length,
        orderTotal,
        source: "shopify-webhook",
      },
    });
    if (purchaseEvErr) {
      console.warn("analytics purchase insert failed:", purchaseEvErr.message);
    }

    // Server-side Purchase for Meta — deduplicated against the browser pixel
    // event via the shared, order-derived event ID.
    if (shopifyOrderNumber) {
      await sendMetaPurchase({
        eventId: `purchase-${shopifyOrderNumber}`,
        value: orderTotal,
        currency: payload.currency || "USD",
        numItems: orders.length,
        email: customerEmail,
        firstName: payload.customer?.first_name || payload.shipping_address?.first_name,
        lastName: payload.customer?.last_name || payload.shipping_address?.last_name,
        city: payload.shipping_address?.city,
        zip: payload.shipping_address?.zip,
        country: payload.shipping_address?.country_code,
      });
    }

    // Track affiliate discount codes
    if (discountCodes.length > 0) {
      for (const dc of discountCodes) {
        const code = dc.code?.toUpperCase();
        if (!code) continue;

        const { data: aff } = await admin
          .from("affiliates")
          .select("id")
          .ilike("discount_code", code)
          .maybeSingle();

        if (aff) {
          const commission = orderTotal * 0.1;

          const payoutEligibleAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
          await admin.from("affiliate_orders").insert({
            affiliate_id: aff.id,
            order_id: orders[0]?.id || null,
            shopify_order_number: shopifyOrderNumber,
            order_total: orderTotal,
            commission: commission,
            payout_eligible_at: payoutEligibleAt,
          });

          await admin.rpc("update_affiliate_totals" as any, { _affiliate_id: aff.id });
        }
      }
    }

    // Trigger PDF generation for each order (fire-and-forget — runs in separate edge function instances)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    for (const order of orders) {
      console.log(`Triggering PDF generation for order ${order.id}`);
      fetch(`${supabaseUrl}/functions/v1/generate-customer-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ orderId: order.id }),
      }).catch((err) => console.error(`PDF trigger failed for ${order.id}:`, err));
    }

    return new Response(JSON.stringify({ ok: true, orders_updated: orders.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
