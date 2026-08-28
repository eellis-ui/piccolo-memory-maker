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

interface StatusEmailConfig {
  subject: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}

function getEmailConfig(
  status: string,
  orderNumber: string,
  trackingNumber?: string | null,
): StatusEmailConfig | null {
  switch (status) {
    case "paid":
      return {
        subject: "Order Confirmed — We're On It!",
        heading: "Your Order Has Been Confirmed!",
        body: `Thank you for your order <strong>${orderNumber}</strong>! We've received your payment and our team is now getting started on your personalized coloring book. We'll keep you updated at every step.`,
        ctaText: "View Your Order",
        ctaUrl: "https://piccoload.com/my-orders",
      };
    case "converted":
      return {
        subject: "Your Book Is Being Created!",
        heading: "Your Coloring Book Is Being Made!",
        body: `Great news! Your photos for order <strong>${orderNumber}</strong> have been converted into beautiful line art and your coloring book is now being put together. We'll let you know once it's been sent for printing.`,
        ctaText: "View Your Order",
        ctaUrl: "https://piccoload.com/my-orders",
      };
    case "sent_to_print":
      return {
        subject: "Your Book Has Been Sent to Print!",
        heading: "Your Book Is Being Printed!",
        body: `Your coloring book for order <strong>${orderNumber}</strong> has been sent to our printers! Once printed and packaged, we'll ship it out and send you a tracking number.`,
        ctaText: "View Your Order",
        ctaUrl: "https://piccoload.com/my-orders",
      };
    case "shipped":
      return {
        subject: "Your Book Has Been Shipped!",
        heading: "Your Coloring Book Is On Its Way!",
        body: `Your order <strong>${orderNumber}</strong> has been shipped!${
          trackingNumber
            ? ` Your tracking number is <strong>${trackingNumber}</strong>.`
            : ""
        } Keep an eye on your mailbox — it'll be with you soon!`,
        ctaText: trackingNumber ? "Track Your Order" : "View Your Order",
        ctaUrl: trackingNumber
          ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`
          : "https://piccoload.com/my-orders",
      };
    default:
      return null;
  }
}

function buildEmailHtml(config: StatusEmailConfig): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #fffaf3;">
      <div style="text-align: center; margin-bottom: 32px;">
        <p style="font-size: 28px; font-weight: bold; color: #1a1a1a; margin: 0 0 4px;">piccoload</p>
        <p style="font-size: 11px; color: #999; letter-spacing: 2px; margin: 0;">FROM PIC TO PEN</p>
      </div>
      <div style="background: #ffffff; border-radius: 16px; padding: 32px 24px; border: 1px solid #eee;">
        <h1 style="font-size: 22px; color: #1a1a1a; margin: 0 0 16px; text-align: center;">${config.heading}</h1>
        <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 24px;">
          ${config.body}
        </p>
        ${config.ctaText && config.ctaUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${config.ctaUrl}"
             style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px;">
            ${config.ctaText}
          </a>
        </div>` : ""}
        <p style="font-size: 13px; color: #888; line-height: 1.6; margin-top: 20px;">
          If you have any questions, reply to this email or contact us at <a href="mailto:hello@piccoload.com" style="color: #1a1a1a;">hello@piccoload.com</a>.
        </p>
      </div>
      <div style="text-align: center; margin-top: 24px;">
        <p style="font-size: 12px; color: #bbb;">Piccoload — Personalized Coloring Books</p>
      </div>
    </div>
  `;
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

    const { orderId, newStatus, trackingNumber } = await req.json();
    if (!orderId || !newStatus) {
      return new Response(JSON.stringify({ error: "orderId and newStatus required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = adminClient();

    // Fetch order details
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, customer_email, shopify_order_number, order_name, tracking_number")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.customer_email) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No customer email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderNumber = order.shopify_order_number || order.order_name || order.id.slice(0, 8).toUpperCase();
    const tracking = trackingNumber || order.tracking_number;
    const config = getEmailConfig(newStatus, orderNumber, tracking);

    if (!config) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: `No email for status: ${newStatus}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("LOVABLE_API_KEY not set");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectId = Deno.env.get("SUPABASE_URL")?.match(/\/\/([^.]+)/)?.[1];
    const html = buildEmailHtml(config);

    const emailRes = await fetch("https://api.lovable.dev/v1/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        project_id: projectId,
        to: order.customer_email,
        subject: config.subject,
        html,
        purpose: "transactional",
      }),
    });

    if (!emailRes.ok) {
      const text = await emailRes.text();
      console.error("Email send failed:", emailRes.status, text);
      return new Response(JSON.stringify({ error: "Email send failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Status email (${newStatus}) sent to ${order.customer_email} for order ${orderId}`);

    return new Response(JSON.stringify({ ok: true, emailSent: true, status: newStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-order-status error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
