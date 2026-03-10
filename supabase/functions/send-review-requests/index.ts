import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find paid orders from ~30 days ago that haven't had a review request sent
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dayBefore = new Date(thirtyDaysAgo);
    dayBefore.setDate(dayBefore.getDate() - 1);

    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select("id, customer_email, title_page_text, created_at")
      .eq("payment_status", "paid")
      .eq("review_request_sent", false)
      .not("customer_email", "is", null)
      .lte("created_at", thirtyDaysAgo.toISOString())
      .gte("created_at", dayBefore.toISOString());

    if (fetchError) throw fetchError;

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ message: "No review requests to send" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = "https://piccolo-memory-maker.lovable.app";
    let sent = 0;

    for (const order of orders) {
      try {
        // Send email via Lovable API
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        if (!lovableApiKey) {
          console.error("LOVABLE_API_KEY not set, skipping email send");
          continue;
        }

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <h1 style="font-size:24px;font-weight:700;color:#1a1a1a;margin:0 0 16px;">How are you enjoying your Piccoload book?</h1>
    <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 24px;">
      Hi${order.customer_email ? '' : ''}! It's been about a month since your Piccoload coloring book arrived. We'd love to hear what you think!
    </p>
    <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 24px;">
      Your feedback helps other customers discover the magic of personalized coloring books, and it only takes a minute.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${siteUrl}/pricing#reviews" 
         style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
        Leave a Review ✏️
      </a>
    </div>
    <p style="font-size:13px;color:#999;line-height:1.5;margin:32px 0 0;border-top:1px solid #eee;padding-top:24px;">
      Thank you for choosing Piccoload! If you have any questions or concerns, simply reply to this email.
    </p>
  </div>
</body>
</html>`;

        const response = await fetch("https://api.lovable.dev/v1/email/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            to: order.customer_email,
            subject: "How's your Piccoload coloring book? We'd love your review! ✏️",
            html: emailHtml,
            purpose: "transactional",
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Failed to send email to ${order.customer_email}:`, errText);
          continue;
        }

        // Mark as sent
        await supabase
          .from("orders")
          .update({ review_request_sent: true })
          .eq("id", order.id);

        sent++;
      } catch (emailErr) {
        console.error(`Error sending review request for order ${order.id}:`, emailErr);
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sent} review request(s)`, total: orders.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in send-review-requests:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
