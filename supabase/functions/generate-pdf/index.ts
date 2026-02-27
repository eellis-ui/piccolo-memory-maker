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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin via JWT
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

    // Check admin role
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
      .select("title_page_text, title_page_enabled, dedication_page_text, dedication_page_enabled")
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

    // A5 dimensions in mm
    const A5_W = 148;
    const A5_H = 210;

    const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
    let firstPage = true;

    // Title page
    if (order?.title_page_enabled && order?.title_page_text) {
      if (!firstPage) doc.addPage();
      firstPage = false;
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      const lines = doc.splitTextToSize(order.title_page_text, A5_W - 20);
      doc.text(lines, A5_W / 2, A5_H / 2, { align: "center" });
    }

    // Dedication page
    if (order?.dedication_page_enabled && order?.dedication_page_text) {
      if (!firstPage) doc.addPage();
      firstPage = false;
      doc.setFontSize(14);
      doc.setFont("helvetica", "italic");
      const lines = doc.splitTextToSize(order.dedication_page_text, A5_W - 20);
      doc.text(lines, A5_W / 2, A5_H / 2, { align: "center" });
    }

    // Photo pages — prefer converted (line art), fallback to original
    for (const photo of photos) {
      const path = photo.converted_path || photo.original_path;
      const { data: fileData, error: dlErr } = await admin.storage
        .from("order-files")
        .download(path);

      if (dlErr || !fileData) {
        console.warn(`Skipping photo ${photo.id}: ${dlErr?.message}`);
        continue;
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let base64 = "";
      const chunkSize = 32768;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        base64 += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const dataUrl = `data:image/jpeg;base64,${btoa(base64)}`;

      if (!firstPage) doc.addPage();
      firstPage = false;

      // Fill page with image, maintaining aspect ratio
      if (photo.is_landscape) {
        // Landscape photo on portrait A5 — rotate or letterbox
        doc.addImage(dataUrl, "JPEG", 0, (A5_H - (A5_W * 0.667)) / 2, A5_W, A5_W * 0.667);
      } else {
        doc.addImage(dataUrl, "JPEG", 0, 0, A5_W, A5_H);
      }
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
