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
      if (width > MAX_DIM || height > MAX_DIM) {
        const scale = MAX_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        processedBuffer = (await inputImg.resize(width, height).encode()).buffer;
      } else {
        processedBuffer = (await inputImg.encode()).buffer;
      }
    } catch (e) { processedBuffer = arrayBuffer; }
    const openaiPrompt = `Convert this photo into a high-quality printable COLORING BOOK PAGE in the style of a published children's coloring book.

Count the people in the photo and draw exactly that many — never add a person, a head or a face that is not there. If only part of a person is visible — legs, feet, a hand, an arm, a shoulder — draw only that part, exactly as cropped; do NOT complete them with an invented head, face or body.

MUST: Bold uniform black outlines (#000000) on pure white background (#FFFFFF). Every line is the same thickness — drawn with a single confident black marker. Closed shapes large enough to colour with a crayon.

FACES: For every person draw distinct outlined features — each eye (with iris, pupil, eyelashes), each eyebrow as a clear shape, the nose (bridge + nostrils), the mouth (upper lip + lower lip + parting line; for smiles, individual teeth), each ear (outline + inner detail), and hair (flowing strokes, parting, hairline). Faces must look complete and recognisable, NEVER blank ovals.

ANIMALS: All visible features (eyes with iris and pupil, nose, mouth, ears with inner detail, fur direction shown as bold strokes, whiskers, paws/claws).

TEXT: If the photo contains any letters, numbers, words or signs, draw them as clear bold outlined letters in the same place — they must be readable.

FORBIDDEN: NO grey, NO shading, NO gradients, NO hatching or stippling, NO solid black fills (dark hair / dark clothing → outlines only with white interior), NO photo-realistic detail. Background that is plain, blurred or out-of-focus must be left as plain white — do not invent decoration.

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
      const srcW = srcImg.width;
      const srcH = srcImg.height;
      for (let x = 1; x <= srcW; x++) for (let y = 1; y <= srcH; y++) {
        const rgba = srcImg.getPixelAt(x, y);
        const grey = ((rgba >> 24) & 0xFF) * 0.299 + ((rgba >> 16) & 0xFF) * 0.587 + ((rgba >> 8) & 0xFF) * 0.114;
        const v = grey >= 200 ? 255 : 0;
        srcImg.setPixelAt(x, y, Image.rgbaToColor(v, v, v, 255));
      }
      const a4W = actualIsLandscape ? A4_LW : A4_PW;
      const a4H = actualIsLandscape ? A4_LH : A4_PH;
      finalImageBuffer = await srcImg.resize(a4W, a4H).encode();
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
