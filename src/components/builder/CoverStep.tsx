import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Heart, Link2 } from "lucide-react";
import type { BookAddOnsLocal } from "@/pages/Builder";
import { useBasket } from "@/contexts/BasketContext";
import logoImg from "@/assets/piccoload-logo.png";

const PROFANITY_LIST = [
  // Core profanity
  "fuck","shit","cunt","bitch","asshole","bastard","arse","arsehole","bollocks","bugger",
  "bloody hell","damn","crap","piss","pissed","wank","wanker","twat","tosser","git",
  // Sexualized words
  "dick","cock","penis","vagina","pussy","boobs","boob","tits","tit","ass","butt",
  "butthole","anus","anal","whore","slut","hoe","cum","cumshot","orgasm","erection",
  "boner","dildo","vibrator","porn","porno","pornography","sex","sexy","nude","naked",
  "blowjob","handjob","masturbat","horny","kinky","fetish","nipple","genitals",
  // Slurs
  "fag","faggot","nigger","nigga","retard","spastic","tranny","dyke","kike","chink",
  "spic","wetback","cracker","honky","gook","raghead","towelhead",
];

const containsProfanity = (text: string) => {
  const lower = text.toLowerCase();
  return PROFANITY_LIST.some((word) => lower.includes(word));
};

interface CoverPhoto {
  id: string;
  originalUrl: string;
  convertedUrl: string | null;
}

interface CoverStepProps {
  availableImages: CoverPhoto[];
  bookAddOns: BookAddOnsLocal;
  onBookAddOnsChange: (addOns: BookAddOnsLocal) => void;
  onCoverComplete: (coverData: {
    imageIds: [string, string];
    title: string;
    subtitle: string;
  }) => void;
  onBack: () => void;
  sharedBookCount?: number;
}

const CoverStep = ({ availableImages, bookAddOns, onBookAddOnsChange, onCoverComplete, onBack, sharedBookCount }: CoverStepProps) => {
  const { addOnPrice } = useBasket();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleImage = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 2) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const photo1 = selectedIds[0] ? availableImages.find((img) => img.id === selectedIds[0]) ?? null : null;
  const photo2 = selectedIds[1] ? availableImages.find((img) => img.id === selectedIds[1]) ?? null : null;

  // Grid cells:
  // [0] top-left:     photo1 original
  // [1] top-right:    photo1 converted
  // [2] bottom-left:  photo2 converted
  // [3] bottom-right: photo2 original
  const gridCells = [
    photo1 ? photo1.originalUrl : null,
    photo1 ? photo1.convertedUrl : null,
    photo2 ? photo2.convertedUrl : null,
    photo2 ? photo2.originalUrl : null,
  ];

  const hasProfanity = bookAddOns.dedicationPageEnabled && containsProfanity(bookAddOns.dedicationPageText);
  const canContinue = selectedIds.length === 2 && !hasProfanity;

  // Subtitle: "bottom title" custom text if dedication enabled, else default
  const subtitle = bookAddOns.dedicationPageEnabled && bookAddOns.dedicationPageText.trim()
    ? bookAddOns.dedicationPageText.trim().toUpperCase()
    : "FOR KIDS AND ADULTS ALIKE";

  const handleContinue = () => {
    if (canContinue) {
      onCoverComplete({
        imageIds: [selectedIds[0], selectedIds[1]],
        title: bookAddOns.bottomTitle,
        subtitle,
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Design Your Cover
        </h2>
        <p className="text-muted-foreground">
          Select 2 photos — each will appear alongside its line-art drawing
        </p>
      </div>

      {sharedBookCount && sharedBookCount > 1 && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <Link2 className="w-4 h-4 text-primary shrink-0" />
          <span>
            This cover design will be applied to all <strong>{sharedBookCount} books</strong> — your photos are shared across the bundle.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cover Preview */}
        <div className="order-2 lg:order-1">
          <div className="bg-[#fffaf3] rounded-lg p-4 shadow-soft">
            <div
              className="relative bg-[#fffaf3] overflow-hidden flex flex-col"
              style={{ aspectRatio: "3 / 4" }}
            >
              {/* ── Top space: logo centered ── */}
              <div className="flex-1 flex items-center justify-center min-h-0">
                <img
                  src={logoImg}
                  alt="Piccoload – From Pic to Pen"
                  style={{ width: "50%" }}
                />
              </div>

              {/* ── 2×2 photo grid ── */}
              <div
                className="shrink-0 grid grid-cols-2"
                style={{ margin: "0 8.75%", gap: 0 }}
              >
                {gridCells.map((url, idx) => (
                  <div key={idx} className="aspect-square overflow-hidden bg-[#ede8e0]">
                    {url ? (
                      <img
                        src={url}
                        alt={`Cover cell ${idx + 1}`}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[1.2vw] text-muted-foreground">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Bottom text: right-aligned flush to right grid edge ── */}
              <div
                className="flex-1 flex flex-col justify-start min-h-0"
                style={{ paddingRight: "8.75%" }}
              >
                <div className="flex flex-col items-end" style={{ paddingTop: "2.5%" }}>
                  {/* "FOR KIDS AND ADULTS ALIKE" */}
                  <p
                    className="uppercase text-foreground leading-none"
                    style={{
                      fontFamily: "'Yuji Syuku', serif",
                      fontSize: "1.59vw",
                      letterSpacing: 0,
                    }}
                  >
                    {subtitle}
                  </p>

                  {/* "colour your memories" */}
                  <p
                    className="leading-none"
                    style={{
                      fontFamily: "Bristol, serif",
                      fontSize: "1.875vw",
                      marginTop: "2.5%",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {bookAddOns.bottomTitle || "color your memories"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: image selection + add-ons */}
        <div className="order-1 lg:order-2 space-y-6">

          {/* Image Selection */}
          <div>
            <h3 className="font-medium text-foreground mb-1">
              Select 2 Photos{" "}
              <span className="text-muted-foreground font-normal">
                ({selectedIds.length}/2 selected)
              </span>
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Photo 1 → top-left (original) &amp; top-right (drawing)
              <br />
              Photo 2 → bottom-right (original) &amp; bottom-left (drawing)
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[320px] overflow-y-auto p-1">
              {availableImages.map((image) => {
                const isSelected = selectedIds.includes(image.id);
                const selectionIndex = selectedIds.indexOf(image.id);
                return (
                  <button
                    key={image.id}
                    onClick={() => toggleImage(image.id)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative ${
                      isSelected
                        ? "border-primary shadow-soft ring-2 ring-primary/20"
                        : "border-transparent hover:border-border"
                    }`}
                  >
                    <img
                      src={image.originalUrl}
                      alt="Option"
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {selectionIndex + 1}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cover Add-ons */}
          <div className="rounded-lg border-2 border-foreground bg-background p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-foreground flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 text-background" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-sm font-semibold text-foreground">
                  Personalize Cover
                </h3>
                <p className="text-xs text-foreground mt-0.5">
                  Replaces "color your memories" with your own custom text on the cover. Max 25 characters - must be family-friendly.
                </p>
              </div>
            </div>

            {!bookAddOns.dedicationPageEnabled ? (
              <button
                onClick={() => onBookAddOnsChange({ ...bookAddOns, dedicationPageEnabled: true })}
                className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-foreground bg-background hover:bg-muted transition-all text-left"
              >
                <div>
                  <span className="font-semibold text-foreground text-sm">
                    Custom Cover Text
                  </span>
                  <span className="text-xs text-primary ml-2 font-bold">
                    +${addOnPrice.toFixed(2)}
                  </span>
                </div>
                <span className="font-bold text-foreground shrink-0 ml-4">
                  Add to cover
                </span>
              </button>
            ) : (
              <div className="space-y-2 rounded-lg border border-primary bg-primary/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs bg-primary text-primary-foreground border-0">Added</Badge>
                    <span className="font-semibold text-foreground text-sm">Custom Cover Text</span>
                    <span className="text-xs text-primary font-bold">+${addOnPrice.toFixed(2)}</span>
                  </div>
                  <button
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => onBookAddOnsChange({ ...bookAddOns, dedicationPageEnabled: false })}
                  >
                    Remove
                  </button>
                </div>
                <div className="relative">
                  <Input
                    value={bookAddOns.dedicationPageText}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 25);
                      onBookAddOnsChange({ ...bookAddOns, dedicationPageText: val });
                    }}
                    placeholder="e.g. Color your world"
                    maxLength={25}
                    className={`rounded-lg pr-16 ${containsProfanity(bookAddOns.dedicationPageText) ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {bookAddOns.dedicationPageText.length}/25
                  </span>
                </div>
                {containsProfanity(bookAddOns.dedicationPageText) && (
                  <p className="text-xs text-destructive">Please use family-friendly language.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} className="rounded-2xl">
          Back to Approval
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          className="rounded-2xl px-8"
        >
          {canContinue
            ? "Continue to Checkout"
            : `Select ${2 - selectedIds.length} more photo${2 - selectedIds.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
};

export default CoverStep;
