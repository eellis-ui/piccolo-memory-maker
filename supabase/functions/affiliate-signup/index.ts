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

async function createShopifyDiscountCode(code: string): Promise<{ priceRuleId: string } | { error: string }> {
  const shopDomain = "piccaload.myshopify.com";
  const accessToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
  if (!accessToken) return { error: "Shopify access token not configured" };

  // Create a price rule for 10% off
  const priceRuleRes = await fetch(
    `https://${shopDomain}/admin/api/2025-07/price_rules.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        price_rule: {
          title: `AFFILIATE_${code}`,
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

  if (!priceRuleRes.ok) {
    const errText = await priceRuleRes.text();
    console.error("Price rule creation failed:", errText);
    return { error: "Failed to create discount in Shopify" };
  }

  const priceRuleData = await priceRuleRes.json();
  const priceRuleId = priceRuleData.price_rule.id;

  // Create the discount code under the price rule
  const discountRes = await fetch(
    `https://${shopDomain}/admin/api/2025-07/price_rules/${priceRuleId}/discount_codes.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        discount_code: { code: code.toUpperCase() },
      }),
    },
  );

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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "You already have an affiliate account" }), {
        status: 400,
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

    // Create discount code in Shopify
    const shopifyResult = await createShopifyDiscountCode(discount_code);
    if ("error" in shopifyResult) {
      return new Response(JSON.stringify({ error: shopifyResult.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert affiliate record
    const { data: affiliate, error: insertError } = await admin
      .from("affiliates")
      .insert({
        user_id: user.id,
        full_name,
        email: user.email,
        instagram_handle: instagram_handle || null,
        tiktok_handle: tiktok_handle || null,
        discount_code: discount_code.toUpperCase(),
        shopify_price_rule_id: shopifyResult.priceRuleId,
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
