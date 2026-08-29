import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Samples show real, already-converted pages from the marketing assets —
// instant, and zero API cost.
const SAMPLES = [
  { label: "Family", before: "/images/before-family.webp", after: "/images/after-family.webp" },
  { label: "Pet", before: "/images/before-pet.webp", after: "/images/after-pet.webp" },
  { label: "Vacation", before: "/images/before-vacation.webp", after: "/images/after-vacation.webp" },
];

const UPLOAD_MAX_DIM = 1024;
const SKETCH_MAX_DIM = 700;

type Phase = "idle" | "drawing" | "done" | "limited" | "failed";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Rough client-side sketch shown instantly while the real conversion draws. */
const makeSketch = (img: HTMLImageElement): string => {
  const scale = Math.min(1, SKETCH_MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }
  const out = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = 255;
      if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
        const gx = -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] + gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
        const gy = -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] + gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
        const mag = Math.sqrt(gx * gx + gy * gy);
        if (mag >= 60) v = Math.max(0, 255 - (mag - 60) * 1.6);
      }
      out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = v;
      out.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.85);
};

/** Resize for upload; returns base64 JPEG + orientation. */
const prepareUpload = (img: HTMLImageElement) => {
  const scale = Math.min(1, UPLOAD_MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return { base64: canvas.toDataURL("image/jpeg", 0.9), isLandscape: w > h };
};

/** Bake the visible watermark into the displayed preview. */
const watermark = async (src: string): Promise<string> => {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 7);
  ctx.font = `bold ${Math.max(20, canvas.width / 11)}px sans-serif`;
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.textAlign = "center";
  ctx.fillText("PICCOLOAD PREVIEW", 0, 0);
  ctx.restore();
  return canvas.toDataURL("image/png");
};

/**
 * On-page "try before you buy": upload a photo, watch the real AI converter
 * draw it. Uses the preview-lineart edge function — the same model, prompt
 * and post-processing as the book's converter — with a rough client-side
 * sketch as the instant placeholder while it draws (~30s).
 */
const TryYourPhoto = ({ onCtaClick }: { onCtaClick: () => void }) => {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [limitMessage, setLimitMessage] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const runRef = useRef(0);

  const reset = () => {
    runRef.current++;
    setOriginalUrl(null);
    setResultUrl(null);
    setLimitMessage("");
    setPhase("idle");
  };

  const showSample = useCallback(async (sample: (typeof SAMPLES)[number]) => {
    runRef.current++;
    setOriginalUrl(sample.before);
    setResultUrl(sample.after);
    setPhase("done");
  }, []);

  const convert = useCallback(async (src: string) => {
    const run = ++runRef.current;
    setOriginalUrl(src);
    setResultUrl(null);
    setPhase("drawing");
    try {
      const img = await loadImage(src);
      // Instant rough sketch while the real page draws
      const sketch = makeSketch(img);
      if (run !== runRef.current) return;
      setResultUrl(sketch);

      const { base64, isLandscape } = prepareUpload(img);
      const { data, error } = await supabase.functions.invoke("preview-lineart", {
        body: { imageBase64: base64, isLandscape },
      });

      if (run !== runRef.current) return;

      if (error) {
        // Rate limit comes back as a FunctionsHttpError with our JSON body
        let body: { error?: string; message?: string } | null = null;
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx && typeof ctx.json === "function") body = await ctx.json();
        } catch { /* keep the sketch */ }
        if (run !== runRef.current) return;
        if (body?.error === "preview_limit") {
          setLimitMessage(body.message || "Preview limit reached — start your book to convert every photo in full quality.");
          setPhase("limited");
        } else {
          setPhase("failed");
        }
        return;
      }

      if (data?.image) {
        const marked = await watermark(data.image);
        if (run !== runRef.current) return;
        setResultUrl(marked);
        setPhase("done");
      } else {
        setPhase("failed");
      }
    } catch {
      if (run === runRef.current) setPhase("failed");
    }
  }, []);

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => convert(reader.result as string);
    reader.readAsDataURL(file);
  };

  const drawing = phase === "drawing";

  return (
    <section className="pt-4 pb-12 md:pt-6 md:pb-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
            See the Magic — Try It With Your Photo
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Drop in any photo and our AI illustrator draws it as a real coloring
            page — the same artist that draws every page of your book.
          </p>
        </div>

        {!originalUrl ? (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className={`w-full rounded-xl border-2 border-dashed p-10 sm:p-14 flex flex-col items-center gap-3 transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="bg-primary/10 rounded-full p-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold text-foreground">Drop a photo here, or tap to choose one</p>
              <p className="text-xs text-muted-foreground">JPG or PNG — portraits, pets and clear subjects work best</p>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <div className="flex items-center justify-center gap-3 mt-5">
              <span className="text-xs text-muted-foreground">No photo handy? See an example:</span>
              {SAMPLES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => showSample(s)}
                  className="rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                  aria-label={`See example: ${s.label}`}
                >
                  <img src={s.before} alt={s.label} className="w-12 h-12 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-2xl mx-auto">
              <div>
                <div className="aspect-[3/4] rounded-lg overflow-hidden border border-border bg-secondary">
                  <img src={originalUrl} alt="Your photo" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">Your photo</p>
              </div>
              <div>
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-primary bg-white flex items-center justify-center">
                  {resultUrl ? (
                    <img
                      src={resultUrl}
                      alt={drawing ? "Rough sketch while your page is drawn" : "Coloring page preview"}
                      className={`w-full h-full object-cover ${drawing ? "opacity-40" : ""}`}
                    />
                  ) : (
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  )}
                  {drawing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60">
                      <Loader2 className="w-7 h-7 text-primary animate-spin" />
                      <p className="text-xs font-semibold text-foreground bg-white/90 rounded-full px-3 py-1">
                        Drawing your page… ~30 seconds
                      </p>
                    </div>
                  )}
                </div>
                <p className={`text-xs font-semibold text-center mt-2 ${phase === "done" ? "text-primary" : "text-muted-foreground"}`}>
                  {drawing ? "Our AI illustrator is drawing…" : phase === "done" ? "Your coloring page ✨" : "Rough sketch"}
                </p>
              </div>
            </div>

            {phase === "limited" && (
              <p className="text-sm text-foreground bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 text-center mt-5 max-w-md mx-auto">
                {limitMessage}
              </p>
            )}
            {phase === "failed" && (
              <p className="text-sm text-foreground bg-secondary rounded-lg px-4 py-3 text-center mt-5 max-w-md mx-auto">
                The full conversion didn&apos;t come through — the sketch above is a rough
                stand-in. Try another photo, or start your book to see the real thing.
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              <Button onClick={onCtaClick} size="lg" className="rounded-lg font-semibold">
                Turn This Into My Book
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="rounded-lg" onClick={reset} disabled={drawing}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try another photo
              </Button>
            </div>
            {phase === "done" && (
              <p className="text-[11px] text-muted-foreground text-center mt-4 max-w-md mx-auto">
                Drawn by the same AI illustrator that draws your book — shown here as a
                watermarked preview.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default TryYourPhoto;
