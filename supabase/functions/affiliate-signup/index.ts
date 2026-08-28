import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

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
      const res = await fetch("https://piccaload.myshopify.com/admin/oauth/access_token", {
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

async function checkShopifyCodeExists(code: string): Promise<boolean> {
  const shopDomain = "piccaload.myshopify.com";
  const accessToken = await getShopifyToken();
  if (!accessToken) return false;

  try {
    // Search for existing discount codes matching this code
    const resp = await fetchWithTimeout(
      `https://${shopDomain}/admin/api/2025-07/discount_codes/lookup.json?code=${encodeURIComponent(code.toUpperCase())}`,
      {
        method: "GET",
        headers: { "X-Shopify-Access-Token": accessToken },
      },
    );
    // 200 = code exists, 404 = code doesn't exist
    return resp.ok;
  } catch {
    return false; // On error, let creation proceed
  }
}

async function createShopifyDiscountCode(code: string): Promise<{ priceRuleId: string } | { error: string }> {
  const shopDomain = "piccaload.myshopify.com";
  const accessToken = await getShopifyToken();
  if (!accessToken) return { error: "Shopify access token not configured" };

  const upperCode = code.toUpperCase();

  // Check if code already exists on Shopify
  const exists = await checkShopifyCodeExists(upperCode);
  if (exists) {
    return { error: "This discount code already exists on Shopify. Please choose another." };
  }

  // Create a price rule for 10% off — title is just the code, no prefix
  let priceRuleRes: Response;
  try {
    priceRuleRes = await fetchWithTimeout(
      `https://${shopDomain}/admin/api/2025-07/price_rules.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          price_rule: {
            title: upperCode,
            target_type: "line_item",
            target_selection: "all",
            allocation_method: "across",
            value_type: "percentage",
            value: "-10.0",
            customer_selection: "all",
            starts_at: new Date().toISOString(),
            usage_limit: null,
          },
        }),
      },
    );
  } catch (err) {
    console.error("Shopify price rule request failed:", err);
    if (err instanceof DOMException && err.name === "AbortError") {
      return { error: "Shopify request timed out. Please try again." };
    }
    return { error: "Could not reach Shopify. Please try again." };
  }

  if (!priceRuleRes.ok) {
    const errText = await priceRuleRes.text();
    console.error("Price rule creation failed:", errText);
    if (priceRuleRes.status === 401 || errText.includes("Invalid API key")) {
      return { error: "Shopify integration error. Please contact support." };
    }
    return { error: "Failed to create discount in Shopify" };
  }

  const priceRuleData = await priceRuleRes.json();
  const priceRuleId = priceRuleData.price_rule.id;

  // Create the discount code under the price rule
  let discountRes: Response;
  try {
    discountRes = await fetchWithTimeout(
      `https://${shopDomain}/admin/api/2025-07/price_rules/${priceRuleId}/discount_codes.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          discount_code: { code: upperCode },
        }),
      },
    );
  } catch (err) {
    console.error("Shopify discount code request failed:", err);
    return { error: "Shopify request timed out. Please try again." };
  }

  if (!discountRes.ok) {
    const errText = await discountRes.text();
    console.error("Discount code creation failed:", errText);
    return { error: "Failed to create discount code. It may already be in use on Shopify." };
  }

  return { priceRuleId: String(priceRuleId) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the user from the auth header
    const authHeader = req.headers.get("authorization") || "";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;
    const userEmail = authUser.email || "";

    const body = await req.json();
    const { full_name, instagram_handle, tiktok_handle, discount_code } = body;

    if (!full_name || !discount_code) {
      return new Response(JSON.stringify({ error: "Name and discount code are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate discount code format
    const codeRegex = /^[A-Za-z0-9_-]{3,20}$/;
    if (!codeRegex.test(discount_code)) {
      return new Response(JSON.stringify({ error: "Discount code must be 3-20 alphanumeric characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = adminClient();

    // Check if user already has an affiliate account
    const { data: existing } = await admin
      .from("affiliates")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "You already have an affiliate account" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if discount code is already taken in our DB
    const { data: codeTaken } = await admin
      .from("affiliates")
      .select("id")
      .ilike("discount_code", discount_code)
      .maybeSingle();

    if (codeTaken) {
      return new Response(JSON.stringify({ error: "This discount code is already taken. Please choose another." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create discount code in Shopify — block if code already exists
    let shopifyPriceRuleId: string | null = null;
    const shopifyResult = await createShopifyDiscountCode(discount_code);
    if ("error" in shopifyResult) {
      // If the code already exists on Shopify, reject signup
      if (shopifyResult.error.includes("already exists")) {
        return new Response(JSON.stringify({ error: shopifyResult.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.warn("Shopify discount creation failed (will need manual setup):", shopifyResult.error);
    } else {
      shopifyPriceRuleId = shopifyResult.priceRuleId;
    }

    // Insert affiliate record
    const { data: affiliate, error: insertError } = await admin
      .from("affiliates")
      .insert({
        user_id: userId,
        full_name,
        email: userEmail,
        instagram_handle: instagram_handle || null,
        tiktok_handle: tiktok_handle || null,
        discount_code: discount_code.toUpperCase(),
        shopify_price_rule_id: shopifyPriceRuleId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Affiliate insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create affiliate record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, affiliate }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Affiliate signup error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
