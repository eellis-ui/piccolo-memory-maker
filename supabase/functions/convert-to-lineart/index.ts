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
    const { photoId } = await req.json();
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
      .single();

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

    // Get public URL for the original image
    const { data: urlData } = supabase.storage
      .from("order-files")
      .getPublicUrl(photo.original_path);

    const imageUrl = urlData.publicUrl;

    // Call Lovable AI Gateway with Gemini image generation model
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Convert this photo into a clean black-and-white colouring book line drawing. Use simple bold outlines only, no shading, no grey tones, no textures, no colour. Pure black outlines on a pure white background. The result should look like a professional colouring book page that a child could colour in. Maintain the key features and likeness of the subject. Output ONLY the converted image, no text.",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
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

    // Extract the image from the response
    const content = aiResult.choices?.[0]?.message?.content;
    let imageBase64: string | null = null;

    if (typeof content === "string") {
      // Check if content contains inline base64 image data
      const base64Match = content.match(/data:image\/[^;]+;base64,([^\s"]+)/);
      if (base64Match) {
        imageBase64 = base64Match[1];
      }
    } else if (Array.isArray(content)) {
      // Multi-part response - look for image parts
      for (const part of content) {
        if (part.type === "image_url" && part.image_url?.url) {
          const url = part.image_url.url;
          if (url.startsWith("data:image")) {
            const match = url.match(/base64,(.+)/);
            if (match) imageBase64 = match[1];
          } else {
            // It's a URL - download it
            const imgResp = await fetch(url);
            const imgBuf = new Uint8Array(await imgResp.arrayBuffer());
            const convertedPath = `converted/${photo.order_id}/${photoId}.png`;
            const { error: uploadError } = await supabase.storage
              .from("order-files")
              .upload(convertedPath, imgBuf, { contentType: "image/png", upsert: true });
            if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

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
          }
        } else if (part.type === "inline_data" || part.inline_data) {
          imageBase64 = part.inline_data?.data || part.data;
        }
      }
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
