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
    const shopifyOrderNumber = payload.name || payload.order_number ? `#${payload.order_number}` : null;
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
        order_name: payload.name || null,
        line_items: payload.line_items || [],
      };

      if (hasDigitalDownload) {
        updates.digital_download = true;
      }

      await admin.from("orders").update(updates).eq("id", order.id);
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
