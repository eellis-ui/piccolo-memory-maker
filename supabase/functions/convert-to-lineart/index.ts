import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { photoId, sessionId } = await req.json() as { photoId: string; sessionId?: string };
    if (!photoId) {
      return new Response(JSON.stringify({ error: "photoId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Fetch photo with order info in a single query for auth + conversion ---
    const { data: photo, error: photoError } = await supabase
      .from("order_photos")
      .select("*, orders!inner(id, user_id, builder_session_id)")
      .eq("id", photoId)
      .single() as { data: any; error: any };

    if (photoError || !photo) {
      return new Response(JSON.stringify({ error: "Photo not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Authentication: support both user tokens and guest sessions ---
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") ?? "";
    let isAuthed = false;

    if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader! } },
      });
      const { data: claimsData, error: claimsError } = await authClient.auth.getUser(token);
      if (!claimsError && claimsData?.user) {
        const userId = claimsData.user.id;
        if (photo.orders.user_id !== null && photo.orders.user_id !== userId) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (photo.orders.user_id === userId) {
          isAuthed = true;
        }
      }
    }

    // Fallback to guest session auth
    if (!isAuthed) {
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "Missing authorization" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (photo.orders.builder_session_id !== sessionId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const isLandscape = photo.is_landscape ?? false;

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

    const CHUNK_SIZE = 32768;
    const chunks: string[] = [];
    for (let i = 0; i < uint8.length; i += CHUNK_SIZE) {
      const slice = uint8.subarray(i, Math.min(i + CHUNK_SIZE, uint8.length));
      chunks.push(String.fromCharCode(...slice));
    }
    const imageBase64Input = btoa(chunks.join(""));
    const mimeType = fileData.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${imageBase64Input}`;

    const prompt = `Convert this photo into a clean black-and-white LINE DRAWING for a coloring book.

CRITICAL REQUIREMENTS:
1. OUTLINES ONLY — every element must be represented as thin black (#000000) outlines/contours on a pure white (#FFFFFF) background. NEVER fill or flood any area with solid black. Hair, clothing, shadows, dark objects — ALL must be drawn as OUTLINES ONLY, never filled in. Think of it as a coloring book page where every area is left empty/white for someone to color in.
2. ABSOLUTELY NO COLOR — no green, no brown, no grey, no skin tones, no colored fills of ANY kind. Every area enclosed by outlines must be pure empty white space.
3. PRESERVE THE EXACT LIKENESS of the person in the photo — same face shape, same features, same hair texture and style, same pose, same expression. Do NOT replace the person with a generic or different-looking face. The converted image must be clearly recognizable as the same person.
4. Use clean, consistent thin line weight throughout — like a professional coloring book page.
5. Keep ALL accessories, clothing details, and background elements from the original photo, but render them as OUTLINES ONLY.
6. NO shading, NO gradients, NO cross-hatching, NO halftones, NO grey areas, NO solid black fills. Areas that are dark in the photo (e.g. dark hair, dark clothing) should still be drawn as empty outlines, NOT filled with black.
7. ${isLandscape ? "This is LANDSCAPE — output MUST remain landscape." : "This is PORTRAIT — output MUST remain portrait."}
8. Maintain the EXACT same orientation, rotation, and aspect ratio as the input.

Output ONLY the converted image, no text.`;

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
          model: "google/gemini-2.5-flash-image",
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
      const choice = aiResult.choices?.[0];
      if (choice?.error) {
        const embeddedCode = choice.error.code;
        const embeddedMsg = choice.error.message || "";
        console.error(`Embedded AI error (code ${embeddedCode}):`, embeddedMsg);

        if (embeddedCode === 502 || embeddedCode === 429) {
          lastError = "AI service temporarily busy";
          if (attempt < MAX_RETRIES) {
            await sleep(RETRY_DELAY_MS * attempt);
            continue;
          }
          break;
        }
        lastError = `AI error: ${embeddedMsg.substring(0, 100)}`;
        break;
      }

      const finishReason = choice?.native_finish_reason;
      if (finishReason === "IMAGE_PROHIBITED_CONTENT") {
        lastError = "This photo was blocked by the AI content filter. Try a different photo.";
        break;
      }

      const message = choice?.message;
      if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
        const imgUrl = message.images[0]?.image_url?.url;
        if (imgUrl && imgUrl.startsWith("data:image")) {
          const match = imgUrl.match(/base64,(.+)/);
          if (match) imageBase64 = match[1];
        }
      }

      if (!imageBase64 && typeof message?.content === "string") {
        const base64Match = message.content.match(/data:image\/[^;]+;base64,([^\s"]+)/);
        if (base64Match) imageBase64 = base64Match[1];
      }

      if (imageBase64) {
        console.log("Successfully extracted image on attempt", attempt);
        break;
      }

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

    // Return signed URL (bucket is private)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("order-files")
      .createSignedUrl(convertedPath, 3600);

    const convertedUrl = signedUrlError ? "" : signedUrlData.signedUrl;

    return new Response(
      JSON.stringify({ success: true, convertedUrl, convertedPath }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Conversion error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
