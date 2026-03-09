import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Verify Shopify HMAC signature */
function verifyWebhook(body: string, hmacHeader: string, secret: string): boolean {
  try {
    const computed = hmac("sha256", secret, body, "utf8", "base64") as string;
    return computed === hmacHeader;
  } catch (e) {
    console.error("HMAC verification error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const topic = req.headers.get("x-shopify-topic") || "";
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256") || "";

    // Verify HMAC if secret is configured
    const webhookSecret = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");
    if (webhookSecret) {
      if (!verifyWebhook(rawBody, hmacHeader, webhookSecret)) {
        console.error("HMAC verification failed");
        return json({ error: "Unauthorized" }, 401);
      }
    }

    const payload = JSON.parse(rawBody);
    console.log(`Received Shopify webhook: ${topic}`);

    // Handle orders/paid
    if (topic === "orders/paid" || topic === "orders/create") {
      const note = payload.note || "";
      const noteAttributes = payload.note_attributes || [];

      // Extract sessionId from cart note (format: "sessionId:UUID")
      let sessionId: string | null = null;

      // Check note field first
      const noteMatch = note.match(/sessionId:([0-9a-f-]{36})/i);
      if (noteMatch) {
        sessionId = noteMatch[1];
      }

      // Fallback: check note_attributes
      if (!sessionId) {
        const attr = noteAttributes.find(
          (a: { name: string; value: string }) => a.name === "_sessionId"
        );
        if (attr?.value) {
          sessionId = attr.value;
        }
      }

      if (!sessionId) {
        console.warn("No sessionId found in webhook payload note or attributes");
        return json({ warning: "No sessionId found" });
      }

      console.log(`Updating payment_status to 'paid' for session: ${sessionId}`);

      const supabase = adminClient();
      const { data: orders, error } = await supabase
        .from("orders")
        .update({ payment_status: "paid", status: "paid" })
        .eq("builder_session_id", sessionId)
        .eq("status", "draft")
        .select("id");

      if (error) {
        console.error("Failed to update orders:", error);
        return json({ error: "Database update failed" }, 500);
      }

      console.log(`Updated ${orders?.length ?? 0} orders to paid`);

      // Trigger conversions for all photos in paid orders
      if (orders && orders.length > 0) {
        const orderIds = orders.map((o) => o.id);
        const { data: photos } = await supabase
          .from("order_photos")
          .select("id")
          .in("order_id", orderIds)
          .eq("conversion_status", "pending");

        if (photos && photos.length > 0) {
          console.log(`Triggering conversion for ${photos.length} photos`);
          // Fire-and-forget conversions
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

          for (const photo of photos) {
            fetch(`${supabaseUrl}/functions/v1/convert-to-lineart`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceKey}`,
                "Content-Type": "application/json",
                apikey: serviceKey,
              },
              body: JSON.stringify({ photoId: photo.id, sessionId }),
            }).catch((err) =>
              console.error(`Failed to trigger conversion for ${photo.id}:`, err)
            );
          }
        }
      }

      return json({ success: true, ordersUpdated: orders?.length ?? 0 });
    }

    return json({ received: true, topic });
  } catch (err) {
    console.error("Webhook error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
