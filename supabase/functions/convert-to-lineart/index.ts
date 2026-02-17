import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoId } = await req.json() as { photoId: string };
    if (!photoId) {
      return new Response(JSON.stringify({ error: "photoId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get photo record
    const { data: photo, error: photoError } = await supabase
      .from("order_photos")
      .select("*, orders!inner(id)")
      .eq("id", photoId)
      .single() as { data: any; error: any };

    const isLandscape = photo?.is_landscape ?? false;

    if (photoError || !photo) {
      return new Response(
        JSON.stringify({ error: "Photo not found", details: photoError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to converting
    await supabase
      .from("order_photos")
      .update({ conversion_status: "converting" })
      .eq("id", photoId);

    // Download the original image and convert to base64 to strip EXIF issues
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("order-files")
      .download(photo.original_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download original image: ${downloadError?.message}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const imageBase64Input = btoa(binary);
    const mimeType = fileData.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${imageBase64Input}`;

    // Call Lovable AI Gateway with Gemini pro image model
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Convert this photo into a clean black-and-white coloring book line drawing. CRITICAL RULES: 1) The output image MUST have the EXACT same orientation, rotation, and aspect ratio as the input photo. Do NOT rotate or flip. ${isLandscape ? "This is a LANDSCAPE photo — the output MUST remain landscape orientation." : "This is a PORTRAIT photo — the output MUST remain portrait orientation."} 2) Use simple bold outlines only, no shading, no grey tones, no textures, no color. 3) Pure black outlines on a pure white background. 4) Maintain the key features and likeness of the subject. Output ONLY the converted image.`,
              },
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", errText);
      throw new Error(`AI conversion error: ${errText}`);
    }

    const aiResult = await aiResponse.json();
    console.log("AI response structure:", JSON.stringify(aiResult).substring(0, 500));

    // Extract the image from the response - check message.images array first
    const message = aiResult.choices?.[0]?.message;
    let imageBase64: string | null = null;

    // Primary: check message.images array (Lovable AI image generation format)
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const imgUrl = message.images[0]?.image_url?.url;
      if (imgUrl && imgUrl.startsWith("data:image")) {
        const match = imgUrl.match(/base64,(.+)/);
        if (match) imageBase64 = match[1];
      }
    }

    // Fallback: check content for inline base64
    if (!imageBase64 && typeof message?.content === "string") {
      const base64Match = message.content.match(/data:image\/[^;]+;base64,([^\s"]+)/);
      if (base64Match) imageBase64 = base64Match[1];
    }

    if (!imageBase64) {
      console.error("Could not extract image from AI response. Full response:", JSON.stringify(aiResult).substring(0, 2000));
      await supabase.from("order_photos").update({ conversion_status: "failed" }).eq("id", photoId);
      return new Response(
        JSON.stringify({ error: "AI did not return an image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode base64 and upload
    const binaryString = atob(imageBase64);
    const imageBuffer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      imageBuffer[i] = binaryString.charCodeAt(i);
    }

    const convertedPath = `converted/${photo.order_id}/${photoId}.png`;
    const { error: uploadError } = await supabase.storage
      .from("order-files")
      .upload(convertedPath, imageBuffer, { contentType: "image/png", upsert: true });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    await supabase.from("order_photos").update({
      converted_path: convertedPath,
      conversion_status: "completed",
    }).eq("id", photoId);

    const { data: convertedUrlData } = supabase.storage
      .from("order-files")
      .getPublicUrl(convertedPath);

    return new Response(
      JSON.stringify({ success: true, convertedUrl: convertedUrlData.publicUrl, convertedPath }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Conversion error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
