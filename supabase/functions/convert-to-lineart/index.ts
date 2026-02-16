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
    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN")!;

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

    // Call Replicate API - create prediction
    const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "854e8727697a057c525cdb45ab037f64ecca770a1769cc52287c2e56c5c572b9",
        input: {
          image: imageUrl,
          prompt:
            "clean black-and-white colouring book line drawing, simple bold outlines, no shading, white background",
          negative_prompt:
            "shadows, grey tones, textures, colour, background noise, realism, pencil texture, sketch, greyscale, shading",
          num_samples: "1",
          image_resolution: "512",
          detect_resolution: 512,
          ddim_steps: 30,
          scale: 9,
          seed: 0,
          a_prompt: "best quality, clean lines, high contrast",
        },
      }),
    });

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      throw new Error(`Replicate API error: ${errText}`);
    }

    let prediction = await createResponse.json();

    // Poll for completion
    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await new Promise((r) => setTimeout(r, 2000));
      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: { Authorization: `Bearer ${replicateToken}` },
        }
      );
      prediction = await pollResponse.json();
    }

    if (prediction.status === "failed") {
      await supabase
        .from("order_photos")
        .update({ conversion_status: "failed" })
        .eq("id", photoId);

      return new Response(
        JSON.stringify({ error: "Conversion failed", details: prediction.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download converted image from Replicate
    const outputUrl = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;

    const imageResponse = await fetch(outputUrl);
    const imageBlob = await imageResponse.blob();
    const imageBuffer = new Uint8Array(await imageBlob.arrayBuffer());

    // Upload to storage
    const convertedPath = `converted/${photo.order_id}/${photoId}.png`;
    const { error: uploadError } = await supabase.storage
      .from("order-files")
      .upload(convertedPath, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Update photo record
    await supabase
      .from("order_photos")
      .update({
        converted_path: convertedPath,
        conversion_status: "completed",
      })
      .eq("id", photoId);

    // Get public URL for the converted image
    const { data: convertedUrlData } = supabase.storage
      .from("order-files")
      .getPublicUrl(convertedPath);

    return new Response(
      JSON.stringify({
        success: true,
        convertedUrl: convertedUrlData.publicUrl,
        convertedPath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
