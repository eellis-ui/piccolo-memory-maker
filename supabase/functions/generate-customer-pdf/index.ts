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

/** Download a file from storage and return as ArrayBuffer */
async function downloadFile(
  admin: ReturnType<typeof adminClient>,
  path: string,
): Promise<ArrayBuffer | null> {
  const { data, error } = await admin.storage.from("order-files").download(path);
  if (error || !data) return null;
  return data.arrayBuffer();
}

/** Download and resize image, return as PNG ArrayBuffer */
async function downloadAndResizeAsPng(
  admin: ReturnType<typeof adminClient>,
  path: string,
  maxDim = 1600,
): Promise<ArrayBuffer | null> {
  const raw = await downloadFile(admin, path);
  if (!raw) return null;

  try {
    const blob = new Blob([raw], { type: "image/png" });
    const bmp = await createImageBitmap(blob);
    let { width, height } = bmp;

    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0, width, height);
    bmp.close();

    const pngBlob = await canvas.convertToBlob({ type: "image/png" });
    return pngBlob.arrayBuffer();
  } catch {
    return raw; // fallback to raw bytes
  }
}

// A4 proportions at 150dpi
const COVER_W = 1240;
const COVER_H = 1754;

/** Render front cover as PNG ArrayBuffer using OffscreenCanvas */
async function renderFrontCover(
  admin: ReturnType<typeof adminClient>,
  gridPaths: (string | null)[],
  subtitle: string,
  title: string,
): Promise<ArrayBuffer> {
  const canvas = new OffscreenCanvas(COVER_W, COVER_H);
  const ctx = canvas.getContext("2d")!;

  // Cream background
  ctx.fillStyle = "#fffaf3";
  ctx.fillRect(0, 0, COVER_W, COVER_H);

  // Logo text "piccoload"
  const logoY = 160;
  ctx.fillStyle = "#282828";
  ctx.font = "bold 72px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("piccoload", COVER_W / 2, logoY);

  // Thin line beneath logo
  const lineY = logoY + 16;
  ctx.strokeStyle = "#787878";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(COVER_W / 2 - 100, lineY);
  ctx.lineTo(COVER_W / 2 + 100, lineY);
  ctx.stroke();

  // "FROM PIC TO PEN" tagline
  ctx.fillStyle = "#787878";
  ctx.font = "20px Helvetica, Arial, sans-serif";
  ctx.fillText("FROM PIC TO PEN", COVER_W / 2, lineY + 28);

  // 2x2 grid
  const gridMargin = Math.round(COVER_W * 0.0875);
  const gridW = COVER_W - gridMargin * 2;
  const cellSize = Math.round(gridW / 2);
  const gridTop = 240;

  const gridPositions = [
    [gridMargin, gridTop],
    [gridMargin + cellSize, gridTop],
    [gridMargin, gridTop + cellSize],
    [gridMargin + cellSize, gridTop + cellSize],
  ];

  // Placeholder fills
  ctx.fillStyle = "#ede8e0";
  for (const [x, y] of gridPositions) {
    ctx.fillRect(x, y, cellSize, cellSize);
  }

  // Draw grid images
  for (let i = 0; i < 4; i++) {
    const path = gridPaths[i];
    if (!path || path === "deleted") continue;
    try {
      const buf = await downloadFile(admin, path);
      if (!buf) continue;
      const blob = new Blob([buf], { type: "image/jpeg" });
      const bmp = await createImageBitmap(blob);
      const [x, y] = gridPositions[i];
      // Cover-fit into the cell
      const srcAspect = bmp.width / bmp.height;
      let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
      if (srcAspect > 1) { // wider than tall
        sw = bmp.height;
        sx = (bmp.width - sw) / 2;
      } else {
        sh = bmp.width;
        sy = (bmp.height - sh) / 2;
      }
      ctx.drawImage(bmp, sx, sy, sw, sh, x, y, cellSize, cellSize);
      bmp.close();
    } catch (e) {
      console.warn(`Cover grid image ${i} failed:`, e);
    }
  }

  // Bottom text — right-aligned
  const textRightX = COVER_W - gridMargin;
  const textTopY = gridTop + cellSize * 2 + 50;

  ctx.fillStyle = "#282828";
  ctx.textAlign = "right";
  ctx.font = "28px Helvetica, Arial, sans-serif";
  ctx.fillText(subtitle.toUpperCase(), textRightX, textTopY);

  ctx.font = "italic 36px Helvetica, Arial, sans-serif";
  ctx.fillText(title, textRightX, textTopY + 44);

  const pngBlob = await canvas.convertToBlob({ type: "image/png" });
  return pngBlob.arrayBuffer();
}

/** Render back cover as PNG ArrayBuffer */
async function renderBackCover(): Promise<ArrayBuffer> {
  const canvas = new OffscreenCanvas(COVER_W, COVER_H);
  const ctx = canvas.getContext("2d")!;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, COVER_W, COVER_H);

  // "piccolo'd" footer text
  ctx.fillStyle = "#b4b4b4";
  ctx.font = "20px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("piccolo'd", COVER_W / 2, COVER_H - 40);

  const pngBlob = await canvas.convertToBlob({ type: "image/png" });
  return pngBlob.arrayBuffer();
}

async function sendDownloadEmail(customerEmail: string, downloadUrl: string, orderRef: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not set — cannot send email");
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

    // Fetch order
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

    // Idempotent — if already generated, return it
    if (order.production_pdf_path) {
      return new Response(JSON.stringify({ pdfPath: order.production_pdf_path, alreadyExists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch photos. Older rows may contain duplicate (order_id, page_position)
    // entries from re-uploads — collapse to one live row per page so the PDF
    // doesn't repeat pages. Prefer approved+completed > completed > most recent.
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

    // --- Build ZIP with covers + line art pages ---
    const zip = new JSZip();

    // 1. Front cover — download pre-rendered PNG from storage (uploaded by client before checkout)
    const frontCoverPath = `covers/${orderId}/front-cover.png`;
    const frontCoverBuf = await downloadFile(admin, frontCoverPath);
    if (frontCoverBuf) {
      console.log("Front cover loaded from storage");
      zip.file("00-front-cover.png", frontCoverBuf);
    } else {
      console.warn("No pre-rendered front cover found at", frontCoverPath);
    }

    // 2. Back cover — shared across all orders
    const backCoverBuf = await downloadFile(admin, "covers/shared/back-cover.png");
    if (backCoverBuf) {
      console.log("Back cover loaded from storage");
      zip.file("01-back-cover.png", backCoverBuf);
    } else {
      console.warn("No shared back cover found");
    }

    // 3. Line art pages — download all in parallel for speed
    const validPhotos = photos.filter((p) => {
      const path = p.converted_path || p.original_path;
      return path && path !== "deleted";
    });

    console.log(`Downloading ${validPhotos.length} photos in parallel...`);
    const downloadResults = await Promise.allSettled(
      validPhotos.map((photo) =>
        downloadAndResizeAsPng(admin, photo.converted_path || photo.original_path, 1600)
      )
    );

    let pageNum = 1;
    for (let i = 0; i < validPhotos.length; i++) {
      const result = downloadResults[i];
      if (result.status !== "fulfilled" || !result.value) {
        console.warn(`Skipping photo ${validPhotos[i].id}: download failed`);
        continue;
      }
      const padded = String(pageNum + 1).padStart(2, "0");
      zip.file(`${padded}-page-${pageNum}.png`, result.value);
      pageNum++;
    }

    console.log(`Generating ZIP with ${pageNum - 1} pages...`);
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE", compressionOptions: { level: 3 } });
    const zipPath = `production-pdfs/${orderId}/coloring-book.zip`;

    const { error: uploadError } = await admin.storage
      .from("order-files")
      .upload(zipPath, zipBuffer, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadError) {
      console.error("ZIP upload failed:", uploadError);
      return new Response(JSON.stringify({ error: "ZIP upload failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update order — always set production_pdf_path, also set digital_pdf_path if digital download
    const updateFields: Record<string, string> = { production_pdf_path: zipPath };
    if (order.digital_download) {
      updateFields.digital_pdf_path = zipPath;
    }
    await admin.from("orders").update(updateFields).eq("id", orderId);

    // Send download email only for digital download orders
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
