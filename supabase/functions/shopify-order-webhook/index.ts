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

    // Record the purchase here rather than in the browser. CheckoutStep only
    // fired this once its poll saw every order flip to paid, so anyone who
    // closed the tab after paying was never counted — 14 events had been
    // recorded against 31 genuinely paid orders. Payment is settled here, so
    // this is the one place that always runs.
    //
    // Shopify retries webhooks, so guard on the order number to keep a retry
    // from inflating the count. One purchase is one event, not one per book.
    if (shopifyOrderNumber) {
      const { data: already } = await admin
        .from("analytics_events")
        .select("id")
        .eq("event_type", "purchase")
        .eq("metadata->>shopifyOrderNumber", String(shopifyOrderNumber))
        .maybeSingle();

      if (!already) {
        await admin.from("analytics_events").insert({
          event_type: "purchase",
          session_id: orders[0]?.builder_session_id ?? null,
          path: "/builder/checkout",
          metadata: {
            shopifyOrderNumber: String(shopifyOrderNumber),
            bookCount: orders.length,
            source: "shopify_webhook",
          },
        });
      }
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
