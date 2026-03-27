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

    // Idempotent — if PDF already exists, return it
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

    // Generate PDF
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

    // 1. Front cover
    firstPage = false;
    doc.setFillColor(255, 250, 243);
    doc.rect(0, 0, A4_W, A4_H, "F");

    const logoY = 55;
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text("piccoload", A4_W / 2, logoY, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("FROM PIC TO PEN", A4_W / 2, logoY + 10, { align: "center" });

    const gridMargin = A4_W * 0.0875;
    const gridW = A4_W - gridMargin * 2;
    const cellSize = gridW / 2;
    const gridTop = 80;

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

    const gridPaths = [
      coverPhoto1Data?.original_path ?? null,
      coverPhoto1Data?.converted_path ?? null,
      coverPhoto2Data?.converted_path ?? null,
      coverPhoto2Data?.original_path ?? null,
    ];

    const gridPositions = [
      [gridMargin, gridTop],
      [gridMargin + cellSize, gridTop],
      [gridMargin, gridTop + cellSize],
      [gridMargin + cellSize, gridTop + cellSize],
    ];

    doc.setFillColor(237, 232, 224);
    for (const [x, y] of gridPositions) {
      doc.rect(x, y, cellSize, cellSize, "F");
    }

    for (let i = 0; i < 4; i++) {
      const path = gridPaths[i];
      if (!path || path === "deleted") continue;
      const b64 = await downloadAsBase64(admin, path);
      if (b64) {
        try {
          doc.addImage(`data:image/jpeg;base64,${b64}`, "JPEG", gridPositions[i][0], gridPositions[i][1], cellSize, cellSize);
        } catch (e) {
          console.warn(`Failed to add cover grid image ${i}:`, e);
        }
      }
    }

    const textRightX = A4_W - gridMargin;
    const textTopY = gridTop + cellSize * 2 + 12;

    const subtitle = order.dedication_page_enabled && order.dedication_page_text?.trim()
      ? order.dedication_page_text.trim().toUpperCase()
      : "FOR KIDS AND ADULTS ALIKE";

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(subtitle, textRightX, textTopY, { align: "right" });

    const bottomTitle = order.dedication_page_enabled && order.dedication_page_text?.trim()
      ? order.dedication_page_text.trim()
      : "color your memories";

    doc.setFontSize(18);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(40, 40, 40);
    doc.text(bottomTitle, textRightX, textTopY + 10, { align: "right" });

    // 2. Back cover
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, A4_W, A4_H, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 180);
    doc.text("piccolo'd", A4_W / 2, A4_H - 10, { align: "center" });

    // 3. Title page
    if (order.title_page_enabled && order.title_page_text) {
      addTextPage(order.title_page_text, 28, "bold");
    }

    // 4. Dedication page
    if (order.dedication_page_enabled && order.dedication_page_text) {
      addTextPage(order.dedication_page_text, 16, "italic");
    }

    // 5. Line art pages
    const coverIds = new Set([coverPhotoId1, coverPhotoId2].filter(Boolean));
    for (const photo of photos) {
      if (coverIds.has(photo.id)) continue;
      const path = photo.converted_path || photo.original_path;
      if (!path || path === "deleted") continue;
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
      return new Response(JSON.stringify({ error: "PDF upload failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update order with PDF path
    await admin.from("orders").update({ digital_pdf_path: pdfPath }).eq("id", orderId);

    // Send download email if customer email exists
    if (order.customer_email) {
      const { data: signedData } = await admin.storage
        .from("order-files")
        .createSignedUrl(pdfPath, 60 * 60 * 24 * 7);

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
