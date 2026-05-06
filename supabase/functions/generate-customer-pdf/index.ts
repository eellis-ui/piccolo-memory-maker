import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

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

async function downloadBytes(
  admin: ReturnType<typeof adminClient>,
  path: string,
): Promise<Uint8Array | null> {
  const { data, error } = await admin.storage.from("order-files").download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

function bytesToBase64(bytes: Uint8Array): string {
  // Chunked btoa avoids "Maximum call stack size exceeded" on big buffers.
  let s = "";
  const CHUNK = 32768;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(s);
}

async function sendDownloadEmail(customerEmail: string, downloadUrl: string, orderRef: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not set");
    return;
  }

  const fromEmail = Deno.env.get("FROM_EMAIL") || "Piccoload <hello@piccoload.com>";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; color: #1a1a1a; margin: 0;">Your Digital Colouring Book is Ready!</h1>
      </div>
      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        Thank you for your purchase! Your personalised colouring book is ready to download.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${downloadUrl}"
           style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Download Your Colouring Book
        </a>
      </div>
      <p style="font-size: 14px; color: #666; line-height: 1.6;">
        This download link is valid for <strong>7 days</strong>. To access your digital download anytime,
        create an account on our website and find it in your <strong>My Orders</strong> page.
      </p>
      <p style="font-size: 14px; color: #666; line-height: 1.6;">
        Order reference: <strong>${orderRef}</strong>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="font-size: 12px; color: #999; text-align: center;">
        piccolo'd — Personalised Colouring Books
      </p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [customerEmail],
        subject: "Your Digital Colouring Book is Ready!",
        html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Resend email failed:", response.status, text);
    } else {
      console.log("Download email sent to", customerEmail);
    }
  } catch (err) {
    console.error("Email send error:", err);
  }
}

// A4 in mm
const A4_W = 210;
const A4_H = 297;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = adminClient();

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, digital_download, digital_pdf_path, production_pdf_path, customer_email, shopify_order_number, title_page_text, title_page_enabled, dedication_page_text, dedication_page_enabled, cover_image_id, cover_image_id_2")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.production_pdf_path) {
      return new Response(JSON.stringify({ pdfPath: order.production_pdf_path, alreadyExists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Photos with dedupe (legacy data may have duplicate rows per page_position).
    const { data: rawPhotos } = await admin
      .from("order_photos")
      .select("*")
      .eq("order_id", orderId)
      .order("page_position");

    const score = (r: { is_approved?: boolean | null; conversion_status?: string | null }) =>
      (r.is_approved && r.conversion_status === "completed" ? 3 : 0) +
      (r.conversion_status === "completed" ? 1 : 0);
    const byPage = new Map<number, any>();
    for (const r of rawPhotos ?? []) {
      const existing = byPage.get(r.page_position);
      if (!existing) { byPage.set(r.page_position, r); continue; }
      const sNew = score(r); const sOld = score(existing);
      if (sNew > sOld) { byPage.set(r.page_position, r); continue; }
      if (sNew === sOld) {
        const tNew = r.created_at ? Date.parse(r.created_at) : 0;
        const tOld = existing.created_at ? Date.parse(existing.created_at) : 0;
        if (tNew > tOld) byPage.set(r.page_position, r);
      }
    }
    const photos = Array.from(byPage.values()).sort((a, b) => a.page_position - b.page_position);

    if (!photos || photos.length === 0) {
      return new Response(JSON.stringify({ error: "No photos found for this order" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the PDF. compress=true wraps the page streams in FlateDecode; the
    // line art PNGs themselves are embedded as PNG (lossless) at their native
    // resolution — no resize before embedding.
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    let firstPage = true;

    async function addImagePage(path: string | null, mimeType: "PNG" | "JPEG" = "PNG") {
      if (!path || path === "deleted") return false;
      const bytes = await downloadBytes(admin, path);
      if (!bytes) {
        console.warn(`Skipping ${path}: download failed`);
        return false;
      }
      if (!firstPage) doc.addPage();
      firstPage = false;
      const dataUri = `data:image/${mimeType.toLowerCase()};base64,${bytesToBase64(bytes)}`;
      // compression "SLOW" = best Flate level on the embedded image stream.
      // For coloring-book pages (mostly white) this shrinks the PDF significantly
      // with zero loss of quality (PNG is lossless regardless).
      doc.addImage(dataUri, mimeType, 0, 0, A4_W, A4_H, undefined, "SLOW");
      return true;
    }

    // 1. Front cover (pre-rendered PNG)
    await addImagePage(`covers/${orderId}/front-cover.png`);

    // 2. Back cover (shared)
    await addImagePage(`covers/shared/back-cover.png`);

    // 3. Line-art pages — one per photo, in order, embedded at native resolution.
    // Process sequentially so memory doesn't balloon (a 22-page PDF can hold
    // ~40MB of decoded image data if processed in parallel).
    const coverIds = new Set([order.cover_image_id, order.cover_image_id_2].filter(Boolean));
    for (const photo of photos) {
      if (coverIds.has(photo.id)) continue;
      const path = photo.converted_path || photo.original_path;
      await addImagePage(path);
    }

    const pdfBytes = new Uint8Array(doc.output("arraybuffer"));
    const pdfPath = `production-pdfs/${orderId}/coloring-book.pdf`;

    const { error: uploadError } = await admin.storage
      .from("order-files")
      .upload(pdfPath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("PDF upload failed:", uploadError);
      return new Response(JSON.stringify({ error: "PDF upload failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updateFields: Record<string, string> = { production_pdf_path: pdfPath };
    if (order.digital_download) updateFields.digital_pdf_path = pdfPath;
    await admin.from("orders").update(updateFields).eq("id", orderId);

    if (order.digital_download && order.customer_email) {
      const { data: signedData } = await admin.storage
        .from("order-files")
        .createSignedUrl(pdfPath, 60 * 60 * 24 * 7);

      if (signedData?.signedUrl) {
        await sendDownloadEmail(
          order.customer_email,
          signedData.signedUrl,
          order.shopify_order_number || orderId.slice(0, 8).toUpperCase(),
        );
      }
    }

    return new Response(JSON.stringify({ pdfPath }), {
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
