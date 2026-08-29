import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, ArrowRight, Loader2, RefreshCw } from "lucide-react";

const SAMPLES = [
  { label: "Family", src: "/images/before-family.webp" },
  { label: "Pet", src: "/images/before-pet.webp" },
  { label: "Vacation", src: "/images/before-vacation.webp" },
];

const MAX_DIM = 900;

/**
 * On-page "try before you buy": upload a photo, see a line-art style preview.
 *
 * DEMO IMPLEMENTATION: the preview is generated entirely in the browser
 * (grayscale → Sobel edge detection → inverted, watermarked) so the demo page
 * needs no backend changes and photos never leave the visitor's device.
 * Production should call the real `convert-to-lineart` pipeline via a
 * rate-limited, watermarking preview endpoint for true output quality.
 */
const TryYourPhoto = ({ onCtaClick }: { onCtaClick: () => void }) => {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const convert = useCallback((src: string) => {
    setBusy(true);
    setOriginalUrl(src);
    setResultUrl(null);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      const { data } = ctx.getImageData(0, 0, w, h);
      // Grayscale
      const gray = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
      }
      // Sobel edge magnitude → inverted so lines are dark on white
      const out = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          let v = 255;
          if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
            const gx =
              -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
              gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
            const gy =
              -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
              gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
            const mag = Math.sqrt(gx * gx + gy * gy);
            // Noise floor keeps busy backgrounds white; soft threshold keeps
            // sketch-like midtones on real edges instead of harsh binary lines
            if (mag < 60) {
              v = 255;
            } else {
              v = 255 - Math.min(255, (mag - 60) * 1.6);
              v = v < 110 ? v * 0.35 : 255 - (255 - v) * 0.2;
            }
          }
          out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = v;
          out.data[i * 4 + 3] = 255;
        }
      }
      ctx.putImageData(out, 0, 0);

      // Watermark
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-Math.PI / 7);
      ctx.font = `bold ${Math.max(20, w / 12)}px sans-serif`;
      ctx.fillStyle = "rgba(0,0,0,0.13)";
      ctx.textAlign = "center";
      ctx.fillText("PICCOLOAD PREVIEW", 0, 0);
      ctx.restore();

      setResultUrl(canvas.toDataURL("image/jpeg", 0.9));
      setBusy(false);
    };
    img.onerror = () => setBusy(false);
    img.src = src;
  }, []);

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => convert(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <section className="pt-4 pb-12 md:pt-6 md:pb-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
            See the Magic — Try It With Your Photo
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Drop in any photo and watch it become a coloring page. Right here, right now —
            your photo never leaves your device.
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
              <span className="text-xs text-muted-foreground">No photo handy? Try a sample:</span>
              {SAMPLES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => convert(s.src)}
                  className="rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                  aria-label={`Try sample: ${s.label}`}
                >
                  <img src={s.src} alt={s.label} className="w-12 h-12 object-cover" loading="lazy" />
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
                <div className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-primary bg-white flex items-center justify-center">
                  {busy ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  ) : (
                    resultUrl && <img src={resultUrl} alt="Line art preview" className="w-full h-full object-cover" />
                  )}
                </div>
                <p className="text-xs text-primary font-semibold text-center mt-2">Your coloring page ✨</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              <Button onClick={onCtaClick} size="lg" className="rounded-lg font-semibold">
                Turn This Into My Book
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-lg"
                onClick={() => { setOriginalUrl(null); setResultUrl(null); }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try another photo
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center mt-4 max-w-md mx-auto">
              Quick in-browser preview — the book itself is drawn by our full AI line-art
              converter with far more detail than this sketch.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default TryYourPhoto;
