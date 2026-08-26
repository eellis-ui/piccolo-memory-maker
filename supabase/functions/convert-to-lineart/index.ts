import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

function getExifOrientation(buf: Uint8Array): number {
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) return 0;
  let offset = 2;
  while (offset < buf.length - 1) {
    if (buf[offset] !== 0xFF) break;
    const marker = buf[offset + 1];
    if (marker === 0xE1) {
      const len = (buf[offset + 2] << 8) | buf[offset + 3];
      const exif = buf.subarray(offset + 4, offset + 2 + len);
      if (exif[0] === 0x45 && exif[1] === 0x78 && exif[2] === 0x69 && exif[3] === 0x66) {
        const tiffStart = 6;
        const littleEndian = exif[tiffStart] === 0x49;
        const read16 = (o: number) => littleEndian ? exif[tiffStart + o] | (exif[tiffStart + o + 1] << 8) : (exif[tiffStart + o] << 8) | exif[tiffStart + o + 1];
        const ifdOffset = littleEndian ? exif[tiffStart + 4] | (exif[tiffStart + 5] << 8) | (exif[tiffStart + 6] << 16) | (exif[tiffStart + 7] << 24) : (exif[tiffStart + 4] << 24) | (exif[tiffStart + 5] << 16) | (exif[tiffStart + 6] << 8) | exif[tiffStart + 7];
        const entries = read16(ifdOffset);
        for (let i = 0; i < entries; i++) { const eo = ifdOffset + 2 + i * 12; if (read16(eo) === 0x0112) return read16(eo + 8); }
      }
      break;
    }
    const segLen = (buf[offset + 2] << 8) | buf[offset + 3];
    offset += 2 + segLen;
  }
  return 0;
}
function exifSwapsDimensions(o: number): boolean { return o >= 5 && o <= 8; }
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };
const A4_PW = 1240, A4_PH = 1754, A4_LW = 1754, A4_LH = 1240;

/**
 * Stretch the input's contrast before sending it to the model.
 *
 * A dark or flat photo carries very little edge information, and the model
 * fills that vacuum by inventing detail — added faces, invented furniture,
 * populated shelves. Normalising first gives it real edges to trace. Clips
 * the top and bottom 1% of the luminance histogram and rescales.
 *
 * No-ops on an image that is already well spread, or too flat to rescale
 * safely.
 */
function autoContrast(img: Image): void {
  const hist = new Uint32Array(256);
  for (let x = 1; x <= img.width; x++) {
    for (let y = 1; y <= img.height; y++) {
      const p = img.getPixelAt(x, y);
      const l = Math.round(((p >> 24) & 0xFF) * 0.299 + ((p >> 16) & 0xFF) * 0.587 + ((p >> 8) & 0xFF) * 0.114);
      hist[l]++;
    }
  }
  const cut = Math.floor((img.width * img.height) * 0.01);
  let lo = 0, hi = 255, acc = 0;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > cut) { lo = i; break; } }
  acc = 0;
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc > cut) { hi = i; break; } }
  // Already using most of the range, or so flat that stretching would only
  // amplify noise — leave it alone.
  if (hi - lo < 16 || (lo < 12 && hi > 243)) return;
  const scale = 255 / (hi - lo);
  const clamp = (v: number) => v < 0 ? 0 : v > 255 ? 255 : v;
  for (let x = 1; x <= img.width; x++) {
    for (let y = 1; y <= img.height; y++) {
      const p = img.getPixelAt(x, y);
      img.setPixelAt(x, y, Image.rgbaToColor(
        clamp(Math.round((((p >> 24) & 0xFF) - lo) * scale)),
        clamp(Math.round((((p >> 16) & 0xFF) - lo) * scale)),
        clamp(Math.round((((p >> 8) & 0xFF) - lo) * scale)),
        255,
      ));
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { photoId, sessionId } = await req.json() as { photoId: string; sessionId?: string };
    if (!photoId) return new Response(JSON.stringify({ error: "photoId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: photo, error: photoError } = await supabase.from("order_photos").select("*, orders!inner(id, user_id, builder_session_id, bundle_id, unique_photos)").eq("id", photoId).single() as { data: any; error: any };
    if (photoError || !photo) return new Response(JSON.stringify({ error: "Photo not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (photo.conversion_status === "completed" && photo.converted_path) {
      const { data: signed } = await supabase.storage.from("order-files").createSignedUrl(photo.converted_path, 3600);
      return new Response(JSON.stringify({ success: true, convertedUrl: signed?.signedUrl || "", convertedPath: photo.converted_path, alreadyDone: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!photo.orders.unique_photos && (photo.orders.bundle_id || photo.orders.builder_session_id)) {
      const sibQuery = supabase.from("orders").select("id").eq("unique_photos", false);
      const scopedSibQuery = photo.orders.bundle_id ? sibQuery.eq("bundle_id", photo.orders.bundle_id) : sibQuery.eq("builder_session_id", photo.orders.builder_session_id);
      const { data: siblingOrders } = await scopedSibQuery;
      const sibOrderIds = (siblingOrders || []).map((o: { id: string }) => o.id).filter((id: string) => id !== photo.order_id);
      if (sibOrderIds.length > 0) {
        const { data: doneSibling } = await supabase.from("order_photos").select("converted_path").in("order_id", sibOrderIds).eq("page_position", photo.page_position).eq("conversion_status", "completed").not("converted_path", "is", null).limit(1).maybeSingle();
        if (doneSibling?.converted_path) {
          await supabase.from("order_photos").update({ converted_path: doneSibling.converted_path, conversion_status: "completed" }).eq("id", photoId);
          const { data: signed } = await supabase.storage.from("order-files").createSignedUrl(doneSibling.converted_path, 3600);
          return new Response(JSON.stringify({ success: true, convertedUrl: signed?.signedUrl || "", convertedPath: doneSibling.converted_path, copiedFromSibling: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") ?? "";
    let isAuthed = false;
    if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader! } } });
      const { data: claimsData, error: claimsError } = await authClient.auth.getUser(token);
      if (!claimsError && claimsData?.user) {
        const userId = claimsData.user.id;
        if (photo.orders.user_id !== null && photo.orders.user_id !== userId) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (photo.orders.user_id === userId) isAuthed = true;
      }
    }
    if (!isAuthed) {
      if (!sessionId) return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (photo.orders.builder_session_id !== sessionId) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const isLandscape = photo.is_landscape ?? false;
    await supabase.from("order_photos").update({ conversion_status: "converting" }).eq("id", photoId);
    const { data: fileData, error: downloadError } = await supabase.storage.from("order-files").download(photo.original_path);
    if (downloadError || !fileData) throw new Error(`Failed to download original image: ${downloadError?.message}`);
    const arrayBuffer = await fileData.arrayBuffer();
    let processedBuffer: ArrayBuffer;
    let actualIsLandscape = isLandscape;
    try {
      const rawInput = new Uint8Array(arrayBuffer);
      const inputImg = await Image.decode(rawInput);
      let { width, height } = inputImg;
      const exifOri = getExifOrientation(rawInput);
      const swapped = exifSwapsDimensions(exifOri);
      actualIsLandscape = (swapped ? height : width) > (swapped ? width : height);
      const MAX_DIM = 1536;
      let prepared = inputImg;
      if (width > MAX_DIM || height > MAX_DIM) {
        const scale = MAX_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        prepared = inputImg.resize(width, height);
      }
      // Resize first so the histogram pass runs over fewer pixels.
      autoContrast(prepared);
      processedBuffer = (await prepared.encode()).buffer;
    } catch (e) { processedBuffer = arrayBuffer; }
    const openaiPrompt = `Trace this photograph into a printable COLORING BOOK PAGE. This is a TRACING task, not an illustration task — reproduce what is actually in the photograph, do not reinterpret, restyle or embellish it.

FIDELITY — THE MOST IMPORTANT RULE: Draw ONLY what is visibly present in the photograph. Do NOT add objects, people, animals, patterns, props, scenery, borders or decoration that are not in the original. Count the people in the photo and draw exactly that many — never add a person or a face that is not there. Do not populate empty rooms, walls, shelves or surfaces with invented pictures, portraits, plants or ornaments. Keep every subject in the same position, pose, scale and proportion as the photo. If the photo is dark, dim or hard to read, draw only the shapes you can genuinely make out and leave the rest white — do NOT fill the uncertainty with invented detail.

PEOPLE — LIKENESS IS CRITICAL: Each person must stay recognisable as that specific individual. Follow the photograph exactly for head and face shape, jawline, the spacing/size/shape of the eyes, the shape of the nose and of the mouth, and the actual hairstyle, parting and hairline. Do NOT substitute a generic, idealised or cartoon face — a stock face that does not resemble the person in the photo is a failure. Draw only the features you can actually see. Faces must still be complete and readable, never blank ovals.

MUST: Bold uniform black outlines (#000000) on pure white background (#FFFFFF). Every line is the same thickness — drawn with a single confident black marker. Closed shapes large enough to colour with a crayon.

ANIMALS: Draw the features that are actually visible (eyes, nose, mouth, ears, fur direction as bold strokes, paws). Keep the animal's real markings, proportions and pose.

TEXT: If the photo contains any letters, numbers, words or signs, draw them as clear bold outlined letters in the same place — they must be readable.

NO SOLID BLACK AREAS: Every region must be WHITE inside its outline. Dark hair, dark clothing, shadows, sunglasses, dark fur and dark backgrounds are drawn as OUTLINES ONLY with white interiors — never filled in, never blocked out. A black or dark suit, tuxedo, dinner jacket, dress or coat must show its lapels, buttons, seams and folds as LINES on a WHITE interior — a filled-in garment is a failure. The single exception is the pupil of an eye, which may be a small filled dot. There must be no black patch anywhere else on the page.

FORBIDDEN: NO grey, NO shading, NO gradients, NO hatching or stippling, NO photo-realistic rendering. Background that is plain, blurred or out-of-focus must be left as plain white — do not invent decoration to fill it.

LINE QUALITY: Lines must be CRISP and CONTINUOUS — no broken/scratchy strokes. Bold but not overly thick.

OUTPUT: ${actualIsLandscape ? "LANDSCAPE orientation (wider than tall)" : "PORTRAIT orientation (taller than wide)"}. Fill the entire frame edge-to-edge with no margins. Same composition as the input photo.`;
    let imageBase64: string | null = null;
    let lastError = "";
    try {
      const fd = new FormData();
      fd.append("image", new File([new Uint8Array(processedBuffer)], "photo.png", { type: "image/png" }));
      fd.append("prompt", openaiPrompt);
      fd.append("model", "gpt-image-1");
      fd.append("size", actualIsLandscape ? "1536x1024" : "1024x1536");
      fd.append("quality", "medium");
      // Preserves faces so people stay recognisable as themselves. Costs extra
      // input tokens per image (~6k for these non-square sizes) but generic,
      // idealised faces were the single biggest complaint about conversions.
      fd.append("input_fidelity", "high");
      const openaiResp = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${openaiKey}` }, body: fd });
      if (openaiResp.ok) { const r = await openaiResp.json(); if (r.data?.[0]?.b64_json) imageBase64 = r.data[0].b64_json; }
      else { const errText = await openaiResp.text(); console.error("OpenAI failed:", openaiResp.status, errText); lastError = `OpenAI error ${openaiResp.status}`; }
    } catch (e) { console.error("OpenAI error:", e); lastError = String(e); }
    if (!imageBase64) {
      await supabase.from("order_photos").update({ conversion_status: "failed" }).eq("id", photoId);
      return new Response(JSON.stringify({ error: lastError || "Conversion failed." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let finalImageBuffer: Uint8Array;
    try {
      const rawBinary = atob(imageBase64);
      const rawBytes = new Uint8Array(rawBinary.length);
      for (let i = 0; i < rawBinary.length; i++) rawBytes[i] = rawBinary.charCodeAt(i);
      imageBase64 = null;
      const srcImg = await Image.decode(rawBytes);
      // Scale to print size BEFORE touching the levels. The previous version
      // thresholded first, which turned every stroke into a hard stair-step,
      // and resampling those stairs up to A4 broke the strokes into dashes.
      const a4W = actualIsLandscape ? A4_LW : A4_PW;
      const a4H = actualIsLandscape ? A4_LH : A4_PH;
      const out = srcImg.resize(a4W, a4H);
      // A levels curve, not a cliff. The previous version forced every pixel
      // lighter than grey 200 to pure white, which erased any stroke lighter
      // than that — exactly the thin interior lines carrying eyes, nose and
      // mouth — so faces lost their features and lines broke mid-stroke.
      // Dark goes solid black, near-white goes paper white, and the band
      // between keeps its anti-aliasing so strokes stay continuous.
      const LO = 110, HI = 225;
      for (let x = 1; x <= out.width; x++) for (let y = 1; y <= out.height; y++) {
        const rgba = out.getPixelAt(x, y);
        const grey = ((rgba >> 24) & 0xFF) * 0.299 + ((rgba >> 16) & 0xFF) * 0.587 + ((rgba >> 8) & 0xFF) * 0.114;
        const v = grey <= LO ? 0 : grey >= HI ? 255 : Math.round(((grey - LO) / (HI - LO)) * 255);
        out.setPixelAt(x, y, Image.rgbaToColor(v, v, v, 255));
      }
      finalImageBuffer = await out.encode();
    } catch (ppErr) {
      await supabase.from("order_photos").update({ conversion_status: "failed" }).eq("id", photoId);
      return new Response(JSON.stringify({ error: `Post-processing failed: ${ppErr}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const convertedPath = `converted/${photo.order_id}/${photoId}.png`;
    const { error: uploadError } = await supabase.storage.from("order-files").upload(convertedPath, finalImageBuffer, { contentType: "image/png", upsert: true });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
    await supabase.from("order_photos").update({ converted_path: convertedPath, conversion_status: "completed" }).eq("id", photoId);
    if (!photo.orders.unique_photos && (photo.orders.bundle_id || photo.orders.builder_session_id)) {
      const propQuery = supabase.from("orders").select("id").eq("unique_photos", false);
      const scopedPropQuery = photo.orders.bundle_id ? propQuery.eq("bundle_id", photo.orders.bundle_id) : propQuery.eq("builder_session_id", photo.orders.builder_session_id);
      const { data: sibOrders } = await scopedPropQuery;
      const sibIds = (sibOrders || []).map((o: { id: string }) => o.id).filter((id: string) => id !== photo.order_id);
      if (sibIds.length > 0) await supabase.from("order_photos").update({ converted_path: convertedPath, conversion_status: "completed" }).in("order_id", sibIds).eq("page_position", photo.page_position);
    }
    const { data: signedUrlData } = await supabase.storage.from("order-files").createSignedUrl(convertedPath, 3600);
    return new Response(JSON.stringify({ success: true, convertedUrl: signedUrlData?.signedUrl || "", convertedPath }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Unexpected: ${error}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
