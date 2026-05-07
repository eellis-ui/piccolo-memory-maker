import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

/** Read EXIF orientation from JPEG bytes. Returns 1-8 or 0 if not found. */
function getExifOrientation(buf: Uint8Array): number {
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) return 0; // not JPEG
  let offset = 2;
  while (offset < buf.length - 1) {
    if (buf[offset] !== 0xFF) break;
    const marker = buf[offset + 1];
    if (marker === 0xE1) { // APP1 (EXIF)
      const len = (buf[offset + 2] << 8) | buf[offset + 3];
      const exif = buf.subarray(offset + 4, offset + 2 + len);
      // Check for "Exif\0\0"
      if (exif[0] === 0x45 && exif[1] === 0x78 && exif[2] === 0x69 && exif[3] === 0x66) {
        const tiffStart = 6;
        const littleEndian = exif[tiffStart] === 0x49; // II = little endian
        const read16 = (o: number) => littleEndian
          ? exif[tiffStart + o] | (exif[tiffStart + o + 1] << 8)
          : (exif[tiffStart + o] << 8) | exif[tiffStart + o + 1];
        const ifdOffset = littleEndian
          ? exif[tiffStart + 4] | (exif[tiffStart + 5] << 8) | (exif[tiffStart + 6] << 16) | (exif[tiffStart + 7] << 24)
          : (exif[tiffStart + 4] << 24) | (exif[tiffStart + 5] << 16) | (exif[tiffStart + 6] << 8) | exif[tiffStart + 7];
        const entries = read16(ifdOffset);
        for (let i = 0; i < entries; i++) {
          const entryOffset = ifdOffset + 2 + i * 12;
          const tag = read16(entryOffset);
          if (tag === 0x0112) { // Orientation tag
            return read16(entryOffset + 8);
          }
        }
      }
      break;
    }
    const segLen = (buf[offset + 2] << 8) | buf[offset + 3];
    offset += 2 + segLen;
  }
  return 0;
}

/** Returns true if EXIF orientation means the image should be rotated 90/270° (swapping w/h) */
function exifSwapsDimensions(orientation: number): boolean {
  return orientation >= 5 && orientation <= 8;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
// A4 at 150 DPI — keeps canvas memory low while still print-quality
const A4_PW = 1240;
const A4_PH = 1754;
const A4_LW = 1754;
const A4_LH = 1240;

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

    const { data: photo, error: photoError } = await supabase
      .from("order_photos")
      .select("*, orders!inner(id, user_id, builder_session_id, unique_photos)")
      .eq("id", photoId)
      .single() as { data: any; error: any };

    if (photoError || !photo) {
      return new Response(JSON.stringify({ error: "Photo not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already converted — short-circuit (idempotent re-trigger).
    if (photo.conversion_status === "completed" && photo.converted_path) {
      const { data: signed } = await supabase.storage
        .from("order-files")
        .createSignedUrl(photo.converted_path, 3600);
      return new Response(
        JSON.stringify({ success: true, convertedUrl: signed?.signedUrl || "", convertedPath: photo.converted_path, alreadyDone: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Shared-photos bundle: if a sibling row at the same page_position already
    // converted this image, just copy its converted_path instead of paying for
    // another AI call.
    if (!photo.orders.unique_photos && photo.orders.builder_session_id) {
      const { data: siblingOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("builder_session_id", photo.orders.builder_session_id)
        .eq("unique_photos", false);
      const sibOrderIds = (siblingOrders || [])
        .map((o: { id: string }) => o.id)
        .filter((id: string) => id !== photo.order_id);
      if (sibOrderIds.length > 0) {
        const { data: doneSibling } = await supabase
          .from("order_photos")
          .select("converted_path")
          .in("order_id", sibOrderIds)
          .eq("page_position", photo.page_position)
          .eq("conversion_status", "completed")
          .not("converted_path", "is", null)
          .limit(1)
          .maybeSingle();
        if (doneSibling?.converted_path) {
          await supabase.from("order_photos").update({
            converted_path: doneSibling.converted_path,
            conversion_status: "completed",
          }).eq("id", photoId);
          const { data: signed } = await supabase.storage
            .from("order-files")
            .createSignedUrl(doneSibling.converted_path, 3600);
          return new Response(
            JSON.stringify({ success: true, convertedUrl: signed?.signedUrl || "", convertedPath: doneSibling.converted_path, copiedFromSibling: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // --- Auth: user tokens or guest sessions ---
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
        if (photo.orders.user_id === userId) isAuthed = true;
      }
    }

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

    await supabase
      .from("order_photos")
      .update({ conversion_status: "converting" })
      .eq("id", photoId);

    // Download original image
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("order-files")
      .download(photo.original_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download original image: ${downloadError?.message}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();

    // --- STEP 1: Resize large images to max 1024px before sending to AI ---
    // Also detect actual orientation from image dimensions (don't trust DB flag)
    let processedBuffer: ArrayBuffer;
    const mimeType = "image/png";
    let actualIsLandscape = isLandscape; // fallback to DB flag
    try {
      const rawInput = new Uint8Array(arrayBuffer);
      const inputImg = await Image.decode(rawInput);
      let { width, height } = inputImg;

      // Check EXIF orientation — if orientation 5-8, width/height are swapped visually
      const exifOri = getExifOrientation(rawInput);
      const swapped = exifSwapsDimensions(exifOri);
      const visualW = swapped ? height : width;
      const visualH = swapped ? width : height;
      actualIsLandscape = visualW > visualH;
      console.log(`Input: ${width}x${height} exif=${exifOri} visual=${visualW}x${visualH} => ${actualIsLandscape ? "LANDSCAPE" : "PORTRAIT"} (db: ${isLandscape ? "L" : "P"})`);

      const MAX_DIM = 1536; // Higher res = better detail from Gemini
      if (width > MAX_DIM || height > MAX_DIM) {
        const scale = MAX_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const resized = inputImg.resize(width, height);
        const encoded = await resized.encode();
        processedBuffer = encoded.buffer;
        console.log(`Resized input: ${arrayBuffer.byteLength} -> ${encoded.length} bytes (${width}x${height})`);
      } else {
        const encoded = await inputImg.encode();
        processedBuffer = encoded.buffer;
        console.log(`Input OK: ${width}x${height}, ${encoded.length} bytes`);
      }
    } catch (resizeErr) {
      console.warn("Image resize failed, using original:", resizeErr);
      processedBuffer = arrayBuffer;
    }

    // Convert to base64 for AI API
    const uint8 = new Uint8Array(processedBuffer);
    const CHUNK_SIZE = 32768;
    const chunks: string[] = [];
    for (let i = 0; i < uint8.length; i += CHUNK_SIZE) {
      const slice = uint8.subarray(i, Math.min(i + CHUNK_SIZE, uint8.length));
      chunks.push(String.fromCharCode(...slice));
    }
    const imageBase64Input = btoa(chunks.join(""));

    const prompt = `Generate an image: Convert this photo into a PROFESSIONAL COLORING BOOK PAGE in the style of a published coloring book.

STYLE — this is critical:
- Draw in a BOLD ILLUSTRATED CARTOON STYLE, NOT a photorealistic trace. Think professional coloring book illustration.
- Lines must be THICK, BOLD, and CONFIDENT — like drawn with a thick marker or pen. NOT thin scratchy pencil lines.
- Simplify details into clean, bold shapes with clear outlines. Do not try to capture every photorealistic detail.
- Hair should be drawn as flowing bold strokes. Clothing patterns as clear repeating shapes. Faces as clean cartoon-style features.
- Every enclosed area must be large enough to colour in with a crayon.
- ABSOLUTELY NO cross-hatching, stippling, parallel lines for shading, or any texture fills. Every area is either a bold outline or empty white space.

RULES:
1. ONLY bold black lines on pure white background. NO grey, NO shading, NO gradients, NO filled areas, NO cross-hatching.
2. Every region inside outlines MUST be pure white — ready to be coloured in.
3. Dark areas (hair, dark clothing, shadows) = draw OUTLINES ONLY with white inside. NEVER fill with solid black.
4. Preserve the likeness, pose, and composition of the original photo.
5. The drawing MUST fill the ENTIRE image edge-to-edge with NO margins or white borders.
6. DO NOT crop or reframe. Keep the same framing as the input.
7. ${actualIsLandscape ? "Output MUST be LANDSCAPE (wider than tall)." : "Output MUST be PORTRAIT (taller than wide)."}

Return the converted image.`;

    let imageBase64: string | null = null;
    let lastError = "";

    // --- STEP 2: Call Gemini for line art conversion ---
    const SKIP_GEMINI = false;
    for (let attempt = 1; !SKIP_GEMINI && attempt <= MAX_RETRIES; attempt++) {
      console.log(`Gemini attempt ${attempt}/${MAX_RETRIES}`);
      try {
        const aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${googleApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64Input } }] }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
          }
        );

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`Gemini HTTP ${aiResponse.status}:`, errText);
          if (aiResponse.status === 429 && attempt < MAX_RETRIES) {
            lastError = "Rate limited";
            await sleep(RETRY_DELAY_MS * attempt);
            continue;
          }
          if (aiResponse.status === 403) { lastError = "Invalid API key"; break; }
          lastError = `Gemini error ${aiResponse.status}`;
          break;
        }

        const aiResult = await aiResponse.json();
        const candidate = aiResult.candidates?.[0];
        const finishReason = candidate?.finishReason;

        if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT") {
          lastError = "Photo blocked by AI content filter. Try a different photo.";
          break;
        }

        for (const part of (candidate?.content?.parts ?? [])) {
          if (part.inlineData?.data) {
            imageBase64 = part.inlineData.data;
            break;
          }
        }

        if (imageBase64) {
          console.log("Gemini returned image on attempt", attempt);
          break;
        }

        lastError = "AI did not return an image";
        if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
      } catch (e) {
        lastError = String(e);
        if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
      }
    }

    // --- STEP 3: OpenAI fallback if Gemini failed ---
    if (!imageBase64) {
      console.warn("Gemini failed. Trying OpenAI gpt-image-1.");
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (openaiKey) {
        try {
          const fd = new FormData();
          fd.append("image", new File([new Uint8Array(processedBuffer)], "photo.png", { type: "image/png" }));
          fd.append("prompt", "Convert this photo into a PROFESSIONAL COLORING BOOK PAGE. Bold thick illustrated cartoon-style lines like a published coloring book. NOT a thin photo trace. Thick confident marker-style outlines on pure white background. Every area inside outlines must be white for colouring in. NO shading, NO grey, NO filled areas, NO cross-hatching, NO stippling. Simplify into clean bold shapes. Preserve likeness and composition.");
          fd.append("model", "gpt-image-1");
          fd.append("size", actualIsLandscape ? "1536x1024" : "1024x1536");
          fd.append("quality", "high");

          const openaiResp = await fetch("https://api.openai.com/v1/images/edits", {
            method: "POST",
            headers: { Authorization: `Bearer ${openaiKey}` },
            body: fd,
          });

          if (openaiResp.ok) {
            const openaiResult = await openaiResp.json();
            if (openaiResult.data?.[0]?.b64_json) {
              imageBase64 = openaiResult.data[0].b64_json;
              console.log("OpenAI succeeded");
            }
          } else {
            const errText = await openaiResp.text();
            console.error("OpenAI failed:", openaiResp.status, errText);
          }
        } catch (openaiErr) {
          console.error("OpenAI error:", openaiErr);
        }
      }
    }

    if (!imageBase64) {
      console.error("All AI providers failed.");
      await supabase.from("order_photos").update({ conversion_status: "failed" }).eq("id", photoId);
      return new Response(
        JSON.stringify({ error: lastError || "Conversion failed. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- STEP 4: Post-process — B&W first, then trim borders, then A4 resize ---
    let finalImageBuffer: Uint8Array;
    try {
      const rawBinary = atob(imageBase64);
      const rawBytes = new Uint8Array(rawBinary.length);
      for (let i = 0; i < rawBinary.length; i++) rawBytes[i] = rawBinary.charCodeAt(i);
      imageBase64 = null;

      const srcImg = await Image.decode(rawBytes);
      const srcW = srcImg.width;
      const srcH = srcImg.height;
      console.log(`AI output: ${srcW}x${srcH}`);

      // STEP 4a: B&W threshold
      for (let x = 1; x <= srcW; x++) {
        for (let y = 1; y <= srcH; y++) {
          const rgba = srcImg.getPixelAt(x, y);
          const r = (rgba >> 24) & 0xFF;
          const g = (rgba >> 16) & 0xFF;
          const b = (rgba >> 8) & 0xFF;
          const grey = r * 0.299 + g * 0.587 + b * 0.114;
          const val = grey >= 180 ? 255 : 0;
          srcImg.setPixelAt(x, y, Image.rgbaToColor(val, val, val, 255));
        }
      }

      // STEP 4a1: Line dilation — thicken all lines by 1px for bolder coloring book look
      // Build snapshot of current black/white state
      const dilateMap = new Uint8Array(srcW * srcH);
      for (let y = 0; y < srcH; y++) {
        for (let x = 0; x < srcW; x++) {
          const px = srcImg.getPixelAt(x + 1, y + 1);
          dilateMap[y * srcW + x] = ((px >> 24) & 0xFF) === 0 ? 1 : 0;
        }
      }
      let dilated = 0;
      for (let y = 0; y < srcH; y++) {
        for (let x = 0; x < srcW; x++) {
          if (dilateMap[y * srcW + x]) continue; // already black
          // If any 4-connected neighbor is black, make this pixel black
          const up = y > 0 && dilateMap[(y - 1) * srcW + x];
          const dn = y < srcH - 1 && dilateMap[(y + 1) * srcW + x];
          const lt = x > 0 && dilateMap[y * srcW + (x - 1)];
          const rt = x < srcW - 1 && dilateMap[y * srcW + (x + 1)];
          if (up || dn || lt || rt) {
            srcImg.setPixelAt(x + 1, y + 1, Image.rgbaToColor(0, 0, 0, 255));
            dilated++;
          }
        }
      }
      console.log(`Line dilation: ${dilated} pixels added`);

      // STEP 4a2: Remove black fills — keep only lines
      // For each black pixel, check a 9x9 neighborhood. If >60% is black, it's part
      // of a filled area (not a line) — convert to white. Lines are thin so most
      // neighbors will be white.
      // Use a larger window with a stricter threshold so we only flag truly
      // solid black regions, not thick (or freshly dilated) lines. The previous
      // R=4 / 0.60 combo was too aggressive: a 5–7px line through the centre of
      // a 9x9 window already covered ~50–60% of pixels, so the fill-removal
      // pass would chip into legitimate strokes — which read as inconsistent
      // line thickness and uneven dark patches in the finished page.
      const R = 5; // 11x11 neighbourhood
      const FILL_THRESHOLD = 0.72; // require >72% black before treating as fill
      // Build a fresh copy of black/white state after dilation
      const isBlack = new Uint8Array(srcW * srcH);
      for (let y = 0; y < srcH; y++) {
        for (let x = 0; x < srcW; x++) {
          const px = srcImg.getPixelAt(x + 1, y + 1);
          isBlack[y * srcW + x] = ((px >> 24) & 0xFF) === 0 ? 1 : 0;
        }
      }
      let fillsRemoved = 0;
      for (let y = 0; y < srcH; y++) {
        for (let x = 0; x < srcW; x++) {
          if (!isBlack[y * srcW + x]) continue; // skip white pixels
          // Count black neighbors
          let blackCount = 0;
          let totalCount = 0;
          for (let dy = -R; dy <= R; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= srcH) continue;
            for (let dx = -R; dx <= R; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= srcW) continue;
              totalCount++;
              if (isBlack[ny * srcW + nx]) blackCount++;
            }
          }
          if (blackCount / totalCount > FILL_THRESHOLD) {
            srcImg.setPixelAt(x + 1, y + 1, Image.rgbaToColor(255, 255, 255, 255));
            fillsRemoved++;
          }
        }
      }
      console.log(`Fill removal: ${fillsRemoved} pixels converted to white`);

      // STEP 4b: Auto-trim white borders
      // Only trim borders that are at least 3% of image dimension to prevent
      // cutting off anti-aliased content at edges
      let trimTop = 0, trimBottom = srcH - 1, trimLeft = 0, trimRight = srcW - 1;
      const MIN_BORDER_X = Math.max(5, Math.round(srcW * 0.03));
      const MIN_BORDER_Y = Math.max(5, Math.round(srcH * 0.03));

      // Helper: is pixel pure white? (after B&W, check just red channel)
      const isWhitePx = (x: number, y: number) => {
        const px = srcImg.getPixelAt(x + 1, y + 1);
        return ((px >> 24) & 0xFF) === 255; // r=255 means white
      };

      // Scan top: find first row with any black pixel
      outer_top: for (let y = 0; y < srcH; y++) {
        for (let x = 0; x < srcW; x++) {
          if (!isWhitePx(x, y)) { trimTop = y; break outer_top; }
        }
      }

      // Scan bottom
      outer_bottom: for (let y = srcH - 1; y >= trimTop; y--) {
        for (let x = 0; x < srcW; x++) {
          if (!isWhitePx(x, y)) { trimBottom = y; break outer_bottom; }
        }
      }

      // Scan left
      outer_left: for (let x = 0; x < srcW; x++) {
        for (let y = trimTop; y <= trimBottom; y++) {
          if (!isWhitePx(x, y)) { trimLeft = x; break outer_left; }
        }
      }

      // Scan right
      outer_right: for (let x = srcW - 1; x >= trimLeft; x--) {
        for (let y = trimTop; y <= trimBottom; y++) {
          if (!isWhitePx(x, y)) { trimRight = x; break outer_right; }
        }
      }

      // Only trim if borders are significant (>3% of dimension), not just anti-aliased edges
      const borderTop = trimTop;
      const borderBottom = srcH - 1 - trimBottom;
      const borderLeft = trimLeft;
      const borderRight = srcW - 1 - trimRight;
      const shouldTrim = (borderTop >= MIN_BORDER_Y || borderBottom >= MIN_BORDER_Y ||
                          borderLeft >= MIN_BORDER_X || borderRight >= MIN_BORDER_X);
      const trimW = trimRight - trimLeft + 1;
      const trimH = trimBottom - trimTop + 1;

      const content = shouldTrim && trimW > 10 && trimH > 10
        ? srcImg.crop(trimLeft, trimTop, trimW, trimH)
        : srcImg;

      console.log(`Trim: should=${shouldTrim} borders=(L${borderLeft},T${borderTop},R${borderRight},B${borderBottom}) min=(${MIN_BORDER_X},${MIN_BORDER_Y}) => ${content.width}x${content.height}`);

      // STEP 4c: Resize to A4 — NO CROPPING, preserve full scene
      // Use the INPUT photo's orientation (not AI output or DB) to decide page layout
      // Then resize the content to fill A4 in both dimensions (slight stretch is fine
      // for line art and prevents both white space AND content being cut off)
      const a4W = actualIsLandscape ? A4_LW : A4_PW;
      const a4H = actualIsLandscape ? A4_LH : A4_PH;
      console.log(`Output: ${actualIsLandscape ? 'L' : 'P'} A4 ${a4W}x${a4H} from content ${content.width}x${content.height}`);

      // Resize to exact A4 dimensions — fills edge to edge, no cropping
      const resized = content.resize(a4W, a4H);

      finalImageBuffer = await resized.encode();
      console.log(`Final A4 (${a4W}x${a4H}), ${finalImageBuffer.length} bytes`);
    } catch (ppErr) {
      console.error("Post-processing failed:", ppErr);
      await supabase.from("order_photos").update({ conversion_status: "failed" }).eq("id", photoId);
      return new Response(
        JSON.stringify({ error: `Post-processing failed: ${ppErr}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- STEP 5: Upload and finalize ---
    const convertedPath = `converted/${photo.order_id}/${photoId}.png`;
    const { error: uploadError } = await supabase.storage
      .from("order-files")
      .upload(convertedPath, finalImageBuffer, { contentType: "image/png", upsert: true });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    await supabase.from("order_photos").update({
      converted_path: convertedPath,
      conversion_status: "completed",
    }).eq("id", photoId);

    // Propagate the converted file to sibling rows in shared-photos mode so the
    // admin sees the same line art under every book in the bundle.
    if (!photo.orders.unique_photos && photo.orders.builder_session_id) {
      const { data: sibOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("builder_session_id", photo.orders.builder_session_id)
        .eq("unique_photos", false);
      const sibIds = (sibOrders || [])
        .map((o: { id: string }) => o.id)
        .filter((id: string) => id !== photo.order_id);
      if (sibIds.length > 0) {
        await supabase
          .from("order_photos")
          .update({ converted_path: convertedPath, conversion_status: "completed" })
          .in("order_id", sibIds)
          .eq("page_position", photo.page_position);
      }
    }

    const { data: signedUrlData } = await supabase.storage
      .from("order-files")
      .createSignedUrl(convertedPath, 3600);

    return new Response(
      JSON.stringify({ success: true, convertedUrl: signedUrlData?.signedUrl || "", convertedPath }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Conversion error:", error);
    return new Response(
      JSON.stringify({ error: `Unexpected: ${error}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
