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

async function sendDownloadEmail(customerEmail: string, downloadUrl: string, orderId: string) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not set — cannot send email");
    return;
  }

  const projectId = Deno.env.get("SUPABASE_URL")?.match(/\/\/([^.]+)/)?.[1];

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; color: #1a1a1a; margin: 0;">Your Digital Coloring Book is Ready! 🎨</h1>
      </div>
      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        Thank you for your purchase! Your personalized coloring book PDF is ready to download.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${downloadUrl}" 
           style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Download Your PDF
        </a>
      </div>
      <p style="font-size: 14px; color: #666; line-height: 1.6;">
        This download link is valid for <strong>7 days</strong>. To access your digital download anytime, 
        create an account on our website and find it in your <strong>My Orders</strong> page.
      </p>
      <p style="font-size: 14px; color: #666; line-height: 1.6;">
        Order reference: <strong>${orderId.slice(0, 8).toUpperCase()}</strong>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="font-size: 12px; color: #999; text-align: center;">
        piccolo'd — Personalised Coloring Books
      </p>
    </div>
  `;

  try {
    const response = await fetch(`https://api.lovable.dev/v1/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        project_id: projectId,
        to: customerEmail,
        subject: "Your Digital Coloring Book is Ready! 🎨",
        html,
        purpose: "transactional",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Email send failed:", response.status, text);
    } else {
      console.log("Download email sent to", customerEmail);
    }
  } catch (err) {
    console.error("Email send error:", err);
  }
}

/**
 * Lightweight edge function — no PDF generation (that's done client-side now).
 * This function handles:
 * 1. Sending digital download email (if applicable)
 * 2. Cleaning up original photos (only if production_pdf_path is set)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, action } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = adminClient();

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, digital_download, digital_pdf_path, production_pdf_path, customer_email")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: send-email — send digital download email after client uploaded PDF
    if (action === "send-email" && order.digital_download && order.customer_email && order.production_pdf_path) {
      // Set digital_pdf_path = production_pdf_path
      await admin.from("orders").update({ digital_pdf_path: order.production_pdf_path }).eq("id", orderId);

      const { data: signedData } = await admin.storage
        .from("order-files")
        .createSignedUrl(order.production_pdf_path, 60 * 60 * 24 * 7);

      if (signedData?.signedUrl) {
        await sendDownloadEmail(order.customer_email, signedData.signedUrl, orderId);
      }

      return new Response(JSON.stringify({ success: true, emailSent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: cleanup — delete original photos after PDF is confirmed
    if (action === "cleanup" && order.production_pdf_path) {
      try {
        const { data: origPhotos } = await admin
          .from("order_photos")
          .select("original_path")
          .eq("order_id", orderId)
          .neq("original_path", "deleted");

        if (origPhotos && origPhotos.length > 0) {
          const pathsToRemove = origPhotos.map((p) => p.original_path).filter(Boolean);
          if (pathsToRemove.length > 0) {
            await admin.storage.from("order-files").remove(pathsToRemove);
          }
          await admin
            .from("order_photos")
            .update({ original_path: "deleted" })
            .eq("order_id", orderId);
          console.log(`Deleted ${pathsToRemove.length} original photos for order ${orderId}`);
        }
      } catch (cleanupErr) {
        console.error("Cleanup failed:", cleanupErr);
      }

      return new Response(JSON.stringify({ success: true, cleaned: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: return current state
    return new Response(JSON.stringify({
      productionPdfPath: order.production_pdf_path,
      digitalPdfPath: order.digital_pdf_path,
      needsPdf: !order.production_pdf_path,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-customer-pdf error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
