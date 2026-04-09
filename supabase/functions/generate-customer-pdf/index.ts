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

async function sendDownloadEmail(customerEmail: string, downloadUrl: string, orderId: string) {
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
        Order reference: <strong>${orderId.slice(0, 8).toUpperCase()}</strong>
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
      .select("id, digital_download, digital_pdf_path, customer_email, title_page_text, title_page_enabled, dedication_page_text, dedication_page_enabled, cover_image_id, cover_image_id_2")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.digital_download) {
      return new Response(JSON.stringify({ error: "Not a digital download order" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotent — if already generated, return it
    if (order.digital_pdf_path) {
      return new Response(JSON.stringify({ pdfPath: order.digital_pdf_path, alreadyExists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch photos
    const { data: photos } = await admin
      .from("order_photos")
      .select("*")
      .eq("order_id", orderId)
      .order("page_position");

    if (!photos || photos.length === 0) {
      return new Response(JSON.stringify({ error: "No photos found for this order" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Build ZIP with covers + line art pages ---
    const zip = new JSZip();

    // Resolve cover photo data
    const coverPhotoId1 = order.cover_image_id;
    const coverPhotoId2 = order.cover_image_id_2 || coverPhotoId1;

    let coverPhoto1Data: { original_path: string; converted_path: string | null } | null = null;
    let coverPhoto2Data: { original_path: string; converted_path: string | null } | null = null;

    if (coverPhotoId1) {
      const { data } = await admin.from("order_photos").select("original_path, converted_path").eq("id", coverPhotoId1).single();
      coverPhoto1Data = data;
    }
    if (coverPhotoId2 && coverPhotoId2 !== coverPhotoId1) {
      const { data } = await admin.from("order_photos").select("original_path, converted_path").eq("id", coverPhotoId2).single();
      coverPhoto2Data = data;
    } else if (coverPhotoId2 === coverPhotoId1) {
      coverPhoto2Data = coverPhoto1Data;
    }

    // Grid: [original1, lineart1, lineart2, original2]
    const gridPaths = [
      coverPhoto1Data?.original_path ?? null,
      coverPhoto1Data?.converted_path ?? null,
      coverPhoto2Data?.converted_path ?? null,
      coverPhoto2Data?.original_path ?? null,
    ];

    const subtitle = order.dedication_page_enabled && order.dedication_page_text?.trim()
      ? order.dedication_page_text.trim()
      : "FOR KIDS AND ADULTS ALIKE";

    const title = order.dedication_page_enabled && order.dedication_page_text?.trim()
      ? order.dedication_page_text.trim()
      : (order.title_page_enabled && order.title_page_text?.trim()) || "color your memories";

    // 1. Front cover
    console.log("Rendering front cover...");
    const frontCoverBuf = await renderFrontCover(admin, gridPaths, subtitle, title);
    zip.file("00-front-cover.png", frontCoverBuf);

    // 2. Back cover
    console.log("Rendering back cover...");
    const backCoverBuf = await renderBackCover();
    zip.file("01-back-cover.png", backCoverBuf);

    // 3. Line art pages
    let pageNum = 1;
    for (const photo of photos) {
      const path = photo.converted_path || photo.original_path;
      if (!path || path === "deleted") continue;
      try {
        console.log(`Adding page ${pageNum}: ${photo.id}`);
        const buf = await downloadAndResizeAsPng(admin, path, 1600);
        if (!buf) continue;
        const padded = String(pageNum + 1).padStart(2, "0");
        zip.file(`${padded}-page-${pageNum}.png`, buf);
        pageNum++;
      } catch (e) {
        console.warn(`Skipping photo ${photo.id}:`, e);
      }
    }

    console.log(`Generating ZIP with ${pageNum - 1} pages...`);
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE", compressionOptions: { level: 3 } });
    const zipPath = `digital-downloads/${orderId}/coloring-book.zip`;

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

    // Update order with ZIP path
    await admin.from("orders").update({ digital_pdf_path: zipPath }).eq("id", orderId);

    // Send download email
    if (order.customer_email) {
      const { data: signedData } = await admin.storage
        .from("order-files")
        .createSignedUrl(zipPath, 60 * 60 * 24 * 7);

      if (signedData?.signedUrl) {
        await sendDownloadEmail(order.customer_email, signedData.signedUrl, orderId);
      }
    }

    // Delete original photos (keep converted line art)
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
      console.error("Original photo cleanup failed:", cleanupErr);
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
