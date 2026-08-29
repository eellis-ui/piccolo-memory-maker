import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

/**
 * Public "try it with your photo" preview for the product page.
 *
 * Runs the SAME model, prompt, and post-processing as convert-to-lineart
 * (gpt-image-1.5, quality medium, threshold to pure B/W) so the preview
 * honestly represents book quality — then returns a reduced-resolution
 * copy (max 700px tall) so the preview can't substitute for the product.
 * The client overlays the visible watermark for display.
 *
 * Cost controls (each call is a paid image generation):
 *   - per-IP limit:  PER_IP_PER_HOUR conversions per rolling hour
 *   - global cap:    GLOBAL_PER_DAY conversions per rolling 24h
 * tracked in public.lineart_previews (service-role only, RLS enabled).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PER_IP_PER_HOUR = 3;
const GLOBAL_PER_DAY = 200;
const MAX_INPUT_BYTES = 2_500_000;
const PREVIEW_MAX_H = 700;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

// Kept byte-identical to convert-to-lineart so the preview IS the product's
// style. If the production prompt changes, change this one with it.
function buildPrompt(isLandscape: boolean): string {
  return `Convert this photo into a high-quality printable COLORING BOOK PAGE in the style of a published children's coloring book.

Count the people in the photo and draw exactly that many — never add a person, a head or a face that is not there. If only part of a person is visible — legs, feet, a hand, an arm, a shoulder — draw only that part, exactly as cropped; do NOT complete them with an invented head, face or body.

MUST: Bold uniform black outlines (#000000) on pure white background (#FFFFFF). Every line is the same thickness — drawn with a single confident black marker. Closed shapes large enough to colour with a crayon.

FACES: For every person draw distinct outlined features — each eye (with iris, pupil, eyelashes), each eyebrow as a clear shape, the nose (bridge + nostrils), the mouth (upper lip + lower lip + parting line; for smiles, individual teeth), each ear (outline + inner detail), and hair (flowing strokes, parting, hairline). Faces must look complete and recognisable, NEVER blank ovals.

ANIMALS: All visible features (eyes with iris and pupil, nose, mouth, ears with inner detail, fur direction shown as bold strokes, whiskers, paws/claws).

TEXT: If the photo contains any letters, numbers, words or signs, draw them as clear bold outlined letters in the same place — they must be readable.

FORBIDDEN: NO grey, NO shading, NO gradients, NO hatching or stippling, NO solid black fills (dark hair / dark clothing → outlines only with white interior), NO photo-realistic detail. Background that is plain, blurred or out-of-focus must be left as plain white — do not invent decoration.

LINE QUALITY: Lines must be CRISP and CONTINUOUS — no broken/scratchy strokes. Bold but not overly thick.

OUTPUT: ${isLandscape ? "LANDSCAPE orientation (wider than tall)" : "PORTRAIT orientation (taller than wide)"}. Fill the entire frame edge-to-edge with no margins. Same composition as the input photo.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ error: "Preview not configured" }, 503);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { imageBase64, isLandscape } = await req.json() as {
      imageBase64?: string;
      isLandscape?: boolean;
    };
    if (!imageBase64) return json({ error: "imageBase64 is required" }, 400);

    const b64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    // base64 → bytes is ~3/4, so this caps the decoded image around 2.5MB
    if (b64.length > (MAX_INPUT_BYTES * 4) / 3) return json({ error: "Image too large" }, 413);

    // ── Rate limits ──
    const ip = clientIp(req);
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();

    const [{ count: ipCount }, { count: dayCount }] = await Promise.all([
      supabase.from("lineart_previews").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", hourAgo),
      supabase.from("lineart_previews").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
    ]);
    if ((ipCount ?? 0) >= PER_IP_PER_HOUR) {
      return json({ error: "preview_limit", message: "You've used your free previews for now — start your book to convert every photo in full quality." }, 429);
    }
    if ((dayCount ?? 0) >= GLOBAL_PER_DAY) {
      return json({ error: "preview_limit", message: "Previews are taking a quick break — start your book to see every photo converted in full quality." }, 429);
    }
    await supabase.from("lineart_previews").insert({ ip });

    // ── Decode input ──
    const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    // ── Same OpenAI call as convert-to-lineart ──
    const landscape = !!isLandscape;
    const fd = new FormData();
    fd.append("image", new File([raw], "photo.png", { type: "image/png" }));
    fd.append("prompt", buildPrompt(landscape));
    fd.append("model", "gpt-image-1.5");
    fd.append("size", landscape ? "1536x1024" : "1024x1536");
    fd.append("quality", "medium");

    const openaiResp = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: fd,
    });
    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      console.error("preview-lineart OpenAI failed:", openaiResp.status, errText);
      return json({ error: "Conversion failed — please try another photo" }, 502);
    }
    const result = await openaiResp.json();
    const outB64: string | undefined = result.data?.[0]?.b64_json;
    if (!outB64) return json({ error: "Conversion failed — please try another photo" }, 502);

    // ── Same post-processing as production (threshold to pure B/W)… ──
    const outBytes = Uint8Array.from(atob(outB64), (c) => c.charCodeAt(0));
    const img = await Image.decode(outBytes);
    for (let x = 1; x <= img.width; x++) {
      for (let y = 1; y <= img.height; y++) {
        const rgba = img.getPixelAt(x, y);
        const grey = ((rgba >> 24) & 0xFF) * 0.299 + ((rgba >> 16) & 0xFF) * 0.587 + ((rgba >> 8) & 0xFF) * 0.114;
        const v = grey >= 200 ? 255 : 0;
        img.setPixelAt(x, y, Image.rgbaToColor(v, v, v, 255));
      }
    }

    // ── …then shrink so the preview stays a preview, not a printable page ──
    const scale = Math.min(1, PREVIEW_MAX_H / Math.max(img.width, img.height));
    const preview = img.resize(Math.round(img.width * scale), Math.round(img.height * scale));
    const png = await preview.encode();

    let previewB64 = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < png.length; i += CHUNK) {
      previewB64 += String.fromCharCode(...png.subarray(i, i + CHUNK));
    }

    return json({ success: true, image: `data:image/png;base64,${btoa(previewB64)}` });
  } catch (err) {
    console.error("preview-lineart error:", err);
    return json({ error: "Conversion failed — please try another photo" }, 500);
  }
});
