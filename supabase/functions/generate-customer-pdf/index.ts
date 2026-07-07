import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

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

async function downloadFile(
  admin: ReturnType<typeof adminClient>,
  path: string,
): Promise<ArrayBuffer | null> {
  const { data, error } = await admin.storage.from("order-files").download(path);
  if (error || !data) return null;
  return data.arrayBuffer();
}

// A4 at 150 DPI — must match convert-to-lineart's output dimensions
const A4_PW = 1240;
const A4_PH = 1754;

/** Read PNG width/height straight from the IHDR header (no decode). */
function pngDims(buf: ArrayBuffer): { w: number; h: number } | null {
  const b = new Uint8Array(buf);
  if (b.length < 24 || b[0] !== 0x89 || b[1] !== 0x50) return null;
  const dv = new DataView(buf);
  return { w: dv.getUint32(16), h: dv.getUint32(20) };
}

/**
 * Print-consistency guard: every page in the production ZIP must be a PNG
 * at exactly A4 proportions. Pages straight from the converter already are
 * and pass through untouched (no quality loss). Anything else — a failed
 * conversion falling back to the original JPEG photo, or a legacy page from
 * an older converter — is fitted onto a white A4 canvas and re-encoded.
 */
async function normalizeToA4Png(raw: ArrayBuffer, label: string): Promise<ArrayBuffer> {
  const dims = pngDims(raw);
  if (dims && ((dims.w === A4_PW && dims.h === A4_PH) || (dims.w === A4_PH && dims.h === A4_PW))) {
    return raw;
  }
  console.warn(`Normalizing non-A4 page to A4 PNG: ${label}`);
  const bmp = await createImageBitmap(new Blob([raw]));
  const landscape = bmp.width > bmp.height;
  const W = landscape ? A4_PH : A4_PW;
  const H = landscape ? A4_PW : A4_PH;
  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const scale = Math.min(W / bmp.width, H / bmp.height);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  ctx.drawImage(bmp, Math.round((W - w) / 2), Math.round((H - h) / 2), w, h);
  bmp.close();
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return blob.arrayBuffer();
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

    const zip = new JSZip();

    const frontCoverPath = `covers/${orderId}/front-cover.png`;
    const frontCoverBuf = await downloadFile(admin, frontCoverPath);
    if (frontCoverBuf) zip.file("00-front-cover.png", frontCoverBuf);

    // Per-order back cover (rendered fresh from the React BackCoverPage at
    // checkout). Fall back to the legacy shared PNG only for orders placed
    // before per-order back covers existed.
    const backCoverBuf =
      (await downloadFile(admin, `covers/${orderId}/back-cover.png`)) ??
      (await downloadFile(admin, "covers/shared/back-cover.png"));
    if (backCoverBuf) zip.file("01-back-cover.png", backCoverBuf);

    const validPhotos = photos.filter((p) => {
      const path = p.converted_path || p.original_path;
      return path && path !== "deleted";
    });

    const downloadResults = await Promise.allSettled(
      validPhotos.map(async (photo) => {
        const path = photo.converted_path || photo.original_path;
        const raw = await downloadFile(admin, path);
        return raw ? normalizeToA4Png(raw, path) : null;
      })
    );

    let pageNum = 1;
    for (let i = 0; i < validPhotos.length; i++) {
      const result = downloadResults[i];
      if (result.status !== "fulfilled" || !result.value) continue;
      const padded = String(pageNum + 1).padStart(2, "0");
      zip.file(`${padded}-page-${pageNum}.png`, result.value);
      pageNum++;
    }

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE", compressionOptions: { level: 3 } });
    const zipPath = `production-pdfs/${orderId}/coloring-book.zip`;

    const { error: uploadError } = await admin.storage
      .from("order-files")
      .upload(zipPath, zipBuffer, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: "ZIP upload failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updateFields: Record<string, string> = { production_pdf_path: zipPath };
    if (order.digital_download) updateFields.digital_pdf_path = zipPath;
    await admin.from("orders").update(updateFields).eq("id", orderId);

    if (order.digital_download && order.customer_email) {
      const { data: signedData } = await admin.storage
        .from("order-files")
        .createSignedUrl(zipPath, 60 * 60 * 24 * 7);
      if (signedData?.signedUrl) {
        await sendDownloadEmail(order.customer_email, signedData.signedUrl, order.shopify_order_number || orderId.slice(0, 8).toUpperCase());
      }
    }

    return new Response(JSON.stringify({ pdfPath: zipPath }), {
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
