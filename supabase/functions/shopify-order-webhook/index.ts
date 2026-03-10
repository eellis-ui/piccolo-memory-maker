import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";


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

/** Download file from storage as base64 */
async function downloadAsBase64(admin: ReturnType<typeof adminClient>, path: string): Promise<string | null> {
  const { data, error } = await admin.storage.from("order-files").download(path);
  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let b64 = "";
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    b64 += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(b64);
}

const A4_W = 210;
const A4_H = 297;

/** Generate PDF for an order and upload to storage. Returns the storage path. */
async function generateAndUploadPdf(admin: ReturnType<typeof adminClient>, orderId: string): Promise<string | null> {
  const { data: order } = await admin
    .from("orders")
    .select("title_page_text, title_page_enabled, dedication_page_text, dedication_page_enabled, cover_image_id")
    .eq("id", orderId)
    .single();

  const { data: photos } = await admin
    .from("order_photos")
    .select("*")
    .eq("order_id", orderId)
    .order("page_position");

  if (!photos || photos.length === 0) return null;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let firstPage = true;

  function addImagePage(b64: string, mimeType = "JPEG") {
    if (!firstPage) doc.addPage();
    firstPage = false;
    doc.addImage(`data:image/${mimeType.toLowerCase()};base64,${b64}`, mimeType, 0, 0, A4_W, A4_H);
  }

  function addTextPage(text: string, fontSize: number, fontStyle: string) {
    if (!firstPage) doc.addPage();
    firstPage = false;
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", fontStyle);
    const lines = doc.splitTextToSize(text, A4_W - 40);
    doc.text(lines, A4_W / 2, A4_H / 2, { align: "center" });
  }

  // Front cover
  if (order?.cover_image_id) {
    const { data: coverPhoto } = await admin
      .from("order_photos")
      .select("converted_path, original_path")
      .eq("id", order.cover_image_id)
      .single();
    if (coverPhoto) {
      const path = coverPhoto.converted_path || coverPhoto.original_path;
      const b64 = await downloadAsBase64(admin, path);
      if (b64) addImagePage(b64);
    }
  }

  // Back cover
  if (!firstPage) doc.addPage(); else firstPage = false;
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, A4_W, A4_H, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.text("piccolo'd", A4_W / 2, A4_H - 10, { align: "center" });

  // Title page
  if (order?.title_page_enabled && order?.title_page_text) {
    addTextPage(order.title_page_text, 28, "bold");
  }

  // Dedication page
  if (order?.dedication_page_enabled && order?.dedication_page_text) {
    addTextPage(order.dedication_page_text, 16, "italic");
  }

  // Photo pages
  for (const photo of photos) {
    if (order?.cover_image_id && photo.id === order.cover_image_id) continue;
    const path = photo.converted_path || photo.original_path;
    const b64 = await downloadAsBase64(admin, path);
    if (!b64) continue;
    addImagePage(b64);
  }

  const pdfBytes = doc.output("arraybuffer");
  const pdfPath = `digital-downloads/${orderId}/coloring-book.pdf`;

  const { error: uploadError } = await admin.storage
    .from("order-files")
    .upload(pdfPath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("PDF upload failed:", uploadError);
    return null;
  }

  return pdfPath;
}

/** Send email with download link using Lovable transactional email */
async function sendDownloadEmail(
  customerEmail: string,
  downloadUrl: string,
  orderId: string,
) {
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
        create an account on our website and find it in your <strong>My Orders</strong> page — it'll be available indefinitely.
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

    // Update all orders in this session
    for (const order of orders) {
      const updates: Record<string, unknown> = {
        payment_status: "paid",
        status: "paid",
        customer_email: customerEmail || null,
        shopify_order_number: shopifyOrderNumber || null,
      };

      if (hasDigitalDownload) {
        updates.digital_download = true;
      }

      await admin.from("orders").update(updates).eq("id", order.id);

      // Generate and email PDF if digital download was purchased
      if (hasDigitalDownload && customerEmail) {
        try {
          const pdfPath = await generateAndUploadPdf(admin, order.id);
          if (pdfPath) {
            // Save path for permanent access
            await admin
              .from("orders")
              .update({ digital_pdf_path: pdfPath })
              .eq("id", order.id);

            // Create signed URL valid for 7 days
            const { data: signedData } = await admin.storage
              .from("order-files")
              .createSignedUrl(pdfPath, 60 * 60 * 24 * 7); // 7 days

            if (signedData?.signedUrl) {
              await sendDownloadEmail(customerEmail, signedData.signedUrl, order.id);
            }
          }
        } catch (pdfErr) {
          console.error("PDF generation/email failed for order", order.id, pdfErr);
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
