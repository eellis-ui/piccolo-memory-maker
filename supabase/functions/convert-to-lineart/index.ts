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
    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY")!;

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

    const prompt = `Convert this photo into a BLACK-AND-WHITE LINE DRAWING suitable for a printed coloring book page.

STYLE — BOLD ILLUSTRATED COLORING BOOK:
- Draw BOLD, CONFIDENT outlines using medium-to-thick marker-weight lines — like a professional coloring book illustrator
- Use VARIED line weights: slightly thicker outlines for main subjects and key shapes, slightly thinner lines for fine details and background elements
- Every enclosed area must be PURE WHITE (left empty for coloring in)
- Lines must be CLEAN, SMOOTH, and WELL-DEFINED — no sketchy, scratchy, or wispy strokes
- Think high-quality published coloring book, NOT a pencil sketch or digital edge detection

CRITICAL RULES:
1. BLACK LINES (#000000) on PURE WHITE (#FFFFFF) background ONLY
2. ABSOLUTELY NO fills, shading, gradients, cross-hatching, halftones, or grey areas
3. Dark areas in the photo (dark hair, dark clothing, shadows) must be drawn as OUTLINES ONLY — never filled with solid black
4. NO color of any kind — no green, brown, grey, or skin tones
5. PRESERVE THE EXACT LIKENESS of every person — same face shape, same features, same hair texture/style, same pose, same expression. The result must be clearly recognizable as the same person(s)
6. Keep ALL accessories, clothing details, and background elements, rendered as bold outlines
7. ${isLandscape ? "LANDSCAPE orientation — output MUST remain landscape" : "PORTRAIT orientation — output MUST remain portrait"}
8. Maintain the EXACT same orientation, rotation, and aspect ratio as the input

Output ONLY the converted image, no text.`;

    let imageBase64: string | null = null;
    let lastError = "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`AI conversion attempt ${attempt}/${MAX_RETRIES}`);

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${googleApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: imageBase64Input,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
            },
          }),
        }
      );

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
        if (aiResponse.status === 403) {
          lastError = "Invalid or unauthorized Google AI API key.";
          break;
        }
        lastError = `AI service error (${aiResponse.status})`;
        break;
      }

      const aiResult = await aiResponse.json();
      const candidate = aiResult.candidates?.[0];

      const finishReason = candidate?.finishReason;
      if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT") {
        lastError = "This photo was blocked by the AI content filter. Try a different photo.";
        break;
      }

      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> =
        candidate?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          imageBase64 = part.inlineData.data;
          break;
        }
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
