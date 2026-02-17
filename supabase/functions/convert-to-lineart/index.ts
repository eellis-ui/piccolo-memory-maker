import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    // Download the original image and convert to base64
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("order-files")
      .download(photo.original_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download original image: ${downloadError?.message}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Chunked base64 encoding to avoid memory exhaustion
    const CHUNK_SIZE = 32768;
    const chunks: string[] = [];
    for (let i = 0; i < uint8.length; i += CHUNK_SIZE) {
      const slice = uint8.subarray(i, Math.min(i + CHUNK_SIZE, uint8.length));
      chunks.push(String.fromCharCode(...slice));
    }
    const imageBase64Input = btoa(chunks.join(""));
    const mimeType = fileData.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${imageBase64Input}`;

    const prompt = `You are a coloring book illustration engine. Convert this photo into a STRICTLY black-and-white line drawing suitable for a coloring book.

ABSOLUTE RULES — NO EXCEPTIONS:
- Output ONLY pure black (#000000) lines on a pure white (#FFFFFF) background.
- ZERO color of any kind. No blue, no green, no red, no brown, no grey, no fill colors whatsoever.
- NO shading, NO gradients, NO grey tones, NO halftones, NO cross-hatching fills.
- NO colored regions or filled areas. Every enclosed shape must be empty white, bounded by black outlines only.
- Lines must be clean, bold, and consistent in weight — like a professional coloring book page.
- Maintain the key features, likeness, and composition of the original subject.
- The output MUST have the EXACT same orientation, rotation, and aspect ratio as the input. Do NOT rotate or flip.
${isLandscape ? "- This is a LANDSCAPE photo — output MUST remain landscape." : "- This is a PORTRAIT photo — output MUST remain portrait."}

Think of this as a page from a store-bought coloring book: only black outlines on white paper, ready to be colored in by hand. Output ONLY the converted image, no text.`;

    let imageBase64: string | null = null;
    let lastError = "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`AI conversion attempt ${attempt}/${MAX_RETRIES}`);

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
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error(`AI Gateway HTTP error (${aiResponse.status}):`, errText);

        if (aiResponse.status === 429) {
          lastError = "Rate limited by AI service";
          if (attempt < MAX_RETRIES) {
            console.log(`Rate limited, waiting ${RETRY_DELAY_MS * attempt}ms before retry...`);
            await sleep(RETRY_DELAY_MS * attempt);
            continue;
          }
          break;
        }
        if (aiResponse.status === 402) {
          lastError = "AI credits exhausted. Please add funds to continue.";
          break;
        }
        lastError = `AI service error (${aiResponse.status})`;
        break;
      }

      const aiResult = await aiResponse.json();

      // Check for embedded errors in the response (gateway returns 200 but with error in choices)
      const choice = aiResult.choices?.[0];
      if (choice?.error) {
        const embeddedCode = choice.error.code;
        const embeddedMsg = choice.error.message || "";
        console.error(`Embedded AI error (code ${embeddedCode}):`, embeddedMsg);

        if (embeddedCode === 502 && embeddedMsg.includes("429")) {
          lastError = "AI service temporarily busy";
          if (attempt < MAX_RETRIES) {
            console.log(`Embedded rate limit, waiting ${RETRY_DELAY_MS * attempt}ms before retry...`);
            await sleep(RETRY_DELAY_MS * attempt);
            continue;
          }
          break;
        }
        lastError = `AI error: ${embeddedMsg.substring(0, 100)}`;
        break;
      }

      // Check for content filtering
      const finishReason = choice?.native_finish_reason;
      if (finishReason === "IMAGE_PROHIBITED_CONTENT") {
        console.error("Content filter blocked this image");
        lastError = "This photo was blocked by the AI content filter. Try a different photo.";
        break;
      }

      // Extract image from response
      const message = choice?.message;

      // Primary: check message.images array
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

      if (imageBase64) {
        console.log("Successfully extracted image on attempt", attempt);
        break;
      }

      // No image but no clear error — retry
      console.warn(`Attempt ${attempt}: No image in response. finish_reason: ${finishReason}`);
      lastError = "AI did not return an image. Please try again.";
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    }

    if (!imageBase64) {
      console.error("All attempts failed. Last error:", lastError);
      await supabase.from("order_photos").update({ conversion_status: "failed" }).eq("id", photoId);
      return new Response(
        JSON.stringify({ error: lastError || "AI did not return an image" }),
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
