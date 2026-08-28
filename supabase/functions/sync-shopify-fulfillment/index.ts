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

const SHOPIFY_STORE = "piccaload.myshopify.com";
const SHOPIFY_API_VERSION = "2025-07";

/**
 * Shopify Admin API auth. Dev Dashboard apps no longer issue permanent
 * shpat_ tokens: SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET are exchanged via
 * the OAuth client-credentials grant for a 24h token, cached per isolate.
 * A static SHOPIFY_ACCESS_TOKEN / SHOPIFY_ADMIN_TOKEN (legacy custom app)
 * still works as a fallback when the client credentials aren't set.
 */
let shopifyTokenCache: { token: string; expiresAt: number } | null = null;

async function getShopifyToken(): Promise<string | null> {
  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
  if (clientId && clientSecret) {
    if (shopifyTokenCache && Date.now() < shopifyTokenCache.expiresAt - 60_000) {
      return shopifyTokenCache.token;
    }
    try {
      const res = await fetch(`https://${SHOPIFY_STORE}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        shopifyTokenCache = {
          token: data.access_token,
          expiresAt: Date.now() + (data.expires_in ?? 86399) * 1000,
        };
        return shopifyTokenCache.token;
      }
      console.error("Shopify client-credentials grant failed:", res.status, await res.text());
    } catch (err) {
      console.error("Shopify client-credentials grant error:", err);
    }
  }
  return Deno.env.get("SHOPIFY_ACCESS_TOKEN") ?? Deno.env.get("SHOPIFY_ADMIN_TOKEN") ?? null;
}

/**
 * Makes a request to the Shopify Admin REST API.
 */
async function shopifyAdmin(endpoint: string, method = "GET", body?: unknown) {
  const token = await getShopifyToken();
  if (!token) throw new Error("Shopify credentials not configured");

  const url = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Shopify Admin API error (${res.status}):`, text);
    throw new Error(`Shopify API ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Look up a Shopify order by order number (e.g. "#1001").
 * Returns the Shopify order object with id, fulfillments, etc.
 */
async function findShopifyOrder(orderNumber: string) {
  // Strip the # prefix for the API query
  const num = orderNumber.replace(/^#/, "");
  const data = await shopifyAdmin(`orders.json?name=${encodeURIComponent(orderNumber)}&status=any`);
  if (data.orders && data.orders.length > 0) {
    return data.orders[0];
  }
  // Fallback: try by order_number field
  const data2 = await shopifyAdmin(`orders.json?order_number=${num}&status=any`);
  return data2.orders?.[0] || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Admin-only gate (mirrors generate-pdf) ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await caller.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await adminClient()
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId, newStatus, trackingNumber, trackingCompany } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only sync shipped status to Shopify (creates fulfillment with tracking)
    if (newStatus !== "shipped") {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "Only shipped status syncs to Shopify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!trackingNumber) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No tracking number to sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = adminClient();

    // Get the Shopify order number from our DB
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("shopify_order_number")
      .eq("id", orderId)
      .single();

    if (orderErr || !order?.shopify_order_number) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No Shopify order number" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the Shopify order
    const shopifyOrder = await findShopifyOrder(order.shopify_order_number);
    if (!shopifyOrder) {
      return new Response(JSON.stringify({ error: "Shopify order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shopifyOrderId = shopifyOrder.id;

    // Check if already fulfilled
    if (shopifyOrder.fulfillment_status === "fulfilled") {
      // Update tracking on existing fulfillment
      const fulfillment = shopifyOrder.fulfillments?.[0];
      if (fulfillment) {
        await shopifyAdmin(
          `fulfillments/${fulfillment.id}/update_tracking.json`,
          "POST",
          {
            fulfillment: {
              notify_customer: false, // We send our own emails
              tracking_info: {
                number: trackingNumber,
                company: trackingCompany || "Royal Mail",
                url: `https://www.royalmail.com/track-your-item#/tracking-results/${trackingNumber}`,
              },
            },
          },
        );
      }
      return new Response(JSON.stringify({ ok: true, action: "tracking_updated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get fulfillment orders for this order
    const fulfillmentOrdersData = await shopifyAdmin(
      `orders/${shopifyOrderId}/fulfillment_orders.json`,
    );
    const fulfillmentOrders = fulfillmentOrdersData.fulfillment_orders || [];
    const openFO = fulfillmentOrders.find(
      (fo: any) => fo.status === "open" || fo.status === "in_progress",
    );

    if (!openFO) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No open fulfillment orders" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create fulfillment with tracking
    await shopifyAdmin("fulfillments.json", "POST", {
      fulfillment: {
        line_items_by_fulfillment_order: [
          {
            fulfillment_order_id: openFO.id,
          },
        ],
        tracking_info: {
          number: trackingNumber,
          company: trackingCompany || "Royal Mail",
          url: `https://www.royalmail.com/track-your-item#/tracking-results/${trackingNumber}`,
        },
        notify_customer: false, // We handle our own email notifications
      },
    });

    console.log(`Shopify fulfillment created for order ${order.shopify_order_number} with tracking ${trackingNumber}`);

    return new Response(JSON.stringify({ ok: true, action: "fulfillment_created" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-shopify-fulfillment error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
