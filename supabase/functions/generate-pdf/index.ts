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
  const { data: fileData, error } = await admin.storage.from("order-files").download(path);
  if (error || !fileData) return null;
  const arrayBuffer = await fileData.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let base64 = "";
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    base64 += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(base64);
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

    // Fetch order + photos
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

    if (!photos || photos.length === 0) {
      return new Response(JSON.stringify({ error: "No photos found for this order" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    let firstPage = true;

    function addImagePage(base64: string, mimeType = "JPEG") {
      if (!firstPage) doc.addPage();
      firstPage = false;
      // Fill full A4 page
      doc.addImage(`data:image/${mimeType.toLowerCase()};base64,${base64}`, mimeType, 0, 0, A4_W, A4_H);
    }

    function addTextPage(text: string, fontSize: number, fontStyle: string) {
      if (!firstPage) doc.addPage();
      firstPage = false;
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontStyle);
      const lines = doc.splitTextToSize(text, A4_W - 40);
      doc.text(lines, A4_W / 2, A4_H / 2, { align: "center" });
    }

    // 1. Front cover — use the selected cover image
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

    // 2. Back cover — plain white page with branding
    if (!firstPage) doc.addPage(); else firstPage = false;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, A4_W, A4_H, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 180);
    doc.text("piccolo'd", A4_W / 2, A4_H - 10, { align: "center" });

    // 3. Title page
    if (order?.title_page_enabled && order?.title_page_text) {
      addTextPage(order.title_page_text, 28, "bold");
    }

    // 4. Dedication page
    if (order?.dedication_page_enabled && order?.dedication_page_text) {
      addTextPage(order.dedication_page_text, 16, "italic");
    }

    // 5. One page per converted photo (prefer converted line-art, fallback original)
    for (const photo of photos) {
      // Skip the cover image (already used as front cover)
      if (order?.cover_image_id && photo.id === order.cover_image_id) continue;

      const path = photo.converted_path || photo.original_path;
      const b64 = await downloadAsBase64(admin, path);
      if (!b64) {
        console.warn(`Skipping photo ${photo.id}: download failed`);
        continue;
      }
      addImagePage(b64);
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
