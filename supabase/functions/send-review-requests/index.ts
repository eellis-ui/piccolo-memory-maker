import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── EMAIL TEMPLATE ───────────────────────────────────────────────
// Edit the subject line, body copy, button text, colors and layout below.
// Changes deploy automatically when you save this file.

const EMAIL_SUBJECT = "How did you enjoy your Piccoload colouring book? 🎨";

function buildEmailHtml(customerName?: string): string {
  const siteUrl = Deno.env.get("SITE_URL") || "https://piccoload.com";
  const greeting = customerName ? `Hi ${customerName}` : "Hi there";
  const reviewUrl = `${siteUrl}/#reviews`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Leave a Review</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'Poppins',Helvetica,Arial,sans-serif;color:#1c1c1c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img
                src="${siteUrl}/images/piccoload-logo-large.png"
                alt="Piccoload"
                width="140"
                style="display:block;"
              />
            </td>
          </tr>

          <!-- Hero card -->
          <tr>
            <td style="background-color:#faf8f5;border-radius:16px;padding:40px 32px;text-align:center;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;color:#1c1c1c;">
                We'd Love Your Feedback! ⭐
              </h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#555;">
                ${greeting}, it's been a month since your Piccoload colouring book was created.
                We hope it brought plenty of smiles and colouring fun!
              </p>
              <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#555;">
                Your review helps other families discover Piccoload and means the world to our
                small team. It only takes a minute!
              </p>

              <!-- CTA button -->
              <a
                href="${reviewUrl}"
                target="_blank"
                style="display:inline-block;background-color:#1c1c1c;color:#ffffff;font-size:16px;font-weight:600;padding:14px 36px;border-radius:9999px;text-decoration:none;"
              >
                Leave a Review
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#999;line-height:1.5;">
                You're receiving this because you purchased a Piccoload colouring book.<br/>
                If you have any questions, reply to this email — we're happy to help!
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:#ccc;">
                © ${new Date().getFullYear()} Piccoload. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── HANDLER ──────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const fromEmail = Deno.env.get("FROM_EMAIL") || "Piccoload <hello@piccoload.com>";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find paid orders older than 30 days that haven't received a review request
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select("id, customer_email, created_at")
      .eq("payment_status", "paid")
      .eq("review_request_sent", false)
      .not("customer_email", "is", null)
      .lte("created_at", thirtyDaysAgo.toISOString())
      .limit(50); // process in batches

    if (fetchError) {
      throw new Error(`Failed to fetch orders: ${fetchError.message}`);
    }

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ message: "No orders to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${orders.length} review request(s)`);

    let sent = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        // Send email via Resend transactional email API
        const emailRes = await fetch(
          "https://api.resend.com/emails",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [order.customer_email],
              subject: EMAIL_SUBJECT,
              html: buildEmailHtml(),
            }),
          }
        );

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error(
            `Failed to send to ${order.customer_email}: ${errText}`
          );
          failed++;
          continue;
        }

        await emailRes.text(); // consume body

        // Mark as sent
        const { error: updateError } = await supabase
          .from("orders")
          .update({ review_request_sent: true })
          .eq("id", order.id);

        if (updateError) {
          console.error(
            `Failed to mark order ${order.id}: ${updateError.message}`
          );
        }

        sent++;
      } catch (emailErr) {
        console.error(`Error processing order ${order.id}:`, emailErr);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, total: orders.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-review-requests error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
