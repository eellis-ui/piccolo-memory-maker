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

interface DownloadedImage {
  dataUrl: string;
  format: "PNG" | "JPEG";
}

async function downloadAsImage(admin: ReturnType<typeof adminClient>, path: string): Promise<DownloadedImage | null> {
  const { data: fileData, error } = await admin.storage.from("order-files").download(path);
  if (error || !fileData) return null;
  const arrayBuffer = await fileData.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  // Sniff the real format — converted line art is PNG, originals are JPEG
  const format: "PNG" | "JPEG" = bytes[0] === 0x89 && bytes[1] === 0x50 ? "PNG" : "JPEG";
  let base64 = "";
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    base64 += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return { dataUrl: `data:image/${format.toLowerCase()};base64,${btoa(base64)}`, format };
}

// A4 dimensions in mm
const A4_W = 210;
const A4_H = 297;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = adminClient();
    const { data: roleData } = await admin
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

    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order } = await admin
      .from("orders")
      .select("title_page_text, title_page_enabled, dedication_page_text, dedication_page_enabled, cover_image_id, cover_image_id_2")
      .eq("id", orderId)
      .single();

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

    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    let firstPage = true;

    function addImagePage(img: DownloadedImage) {
      // Match page orientation to the image and preserve its aspect ratio.
      // Converted line art is exactly A4-proportioned so it fills the page;
      // anything else is fitted and centred instead of stretched.
      const props = doc.getImageProperties(img.dataUrl);
      const landscape = props.width > props.height;
      if (!firstPage) doc.addPage("a4", landscape ? "landscape" : "portrait");
      firstPage = false;
      const pageW = landscape ? A4_H : A4_W;
      const pageH = landscape ? A4_W : A4_H;
      const scale = Math.min(pageW / props.width, pageH / props.height);
      const w = props.width * scale;
      const h = props.height * scale;
      doc.addImage(img.dataUrl, img.format, (pageW - w) / 2, (pageH - h) / 2, w, h);
    }

    function addTextPage(text: string, fontSize: number, fontStyle: string) {
      if (!firstPage) doc.addPage();
      firstPage = false;
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontStyle);
      const lines = doc.splitTextToSize(text, A4_W - 40);
      doc.text(lines, A4_W / 2, A4_H / 2, { align: "center" });
    }

    if (!firstPage) doc.addPage();
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

    const coverPhotoId1 = order?.cover_image_id;
    const coverPhotoId2 = order?.cover_image_id_2 || coverPhotoId1;

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

    // Draw images over placeholders (downloaded in parallel)
    const gridImages = await Promise.all(
      gridPaths.map((path) => (path ? downloadAsImage(admin, path) : Promise.resolve(null))),
    );
    for (let i = 0; i < 4; i++) {
      const img = gridImages[i];
      if (!img) continue;
      try {
        doc.addImage(img.dataUrl, img.format, gridPositions[i][0], gridPositions[i][1], cellSize, cellSize);
      } catch (e) {
        console.warn(`Failed to add cover grid image ${i}:`, e);
      }
    }

    const textRightX = A4_W - gridMargin;
    const textTopY = gridTop + cellSize * 2 + 12;

    const subtitle = order?.dedication_page_enabled && order?.dedication_page_text?.trim()
      ? order.dedication_page_text.trim().toUpperCase()
      : "FOR KIDS AND ADULTS ALIKE";

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(subtitle, textRightX, textTopY, { align: "right" });

    const bottomTitle = order?.dedication_page_enabled && order?.dedication_page_text?.trim()
      ? order.dedication_page_text.trim()
      : "color your memories";

    doc.setFontSize(18);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(40, 40, 40);
    doc.text(bottomTitle, textRightX, textTopY + 10, { align: "right" });

    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, A4_W, A4_H, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 180);
    doc.text("piccoload", A4_W / 2, A4_H - 10, { align: "center" });

    if (order?.title_page_enabled && order?.title_page_text) {
      addTextPage(order.title_page_text, 28, "bold");
    }

    if (order?.dedication_page_enabled && order?.dedication_page_text) {
      addTextPage(order.dedication_page_text, 16, "italic");
    }

    // One page per photo (prefer converted line-art, fallback original),
    // skipping cover images; download all in parallel
    const coverIds = new Set([coverPhotoId1, coverPhotoId2].filter(Boolean));
    const interiorPhotos = photos.filter((photo) => !coverIds.has(photo.id));
    const interiorImages = await Promise.allSettled(
      interiorPhotos.map((photo) => downloadAsImage(admin, photo.converted_path || photo.original_path)),
    );
    for (let i = 0; i < interiorPhotos.length; i++) {
      const result = interiorImages[i];
      if (result.status !== "fulfilled" || !result.value) {
        console.warn(`Skipping photo ${interiorPhotos[i].id}: download failed`);
        continue;
      }
      addImagePage(result.value);
    }

    const pdfBytes = doc.output("arraybuffer");

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="order-${orderId.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
