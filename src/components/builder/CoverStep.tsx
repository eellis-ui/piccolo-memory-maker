import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBasket } from "@/contexts/BasketContext";
import logoImg from "@/assets/piccoload-logo.png";

const FONT_OPTIONS = [
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Inter', sans-serif", label: "Inter" },
  { value: "'Georgia', serif", label: "Georgia" },
  { value: "'Courier New', monospace", label: "Courier New" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "'Arial', sans-serif", label: "Arial" },
  { value: "'Brush Script MT', cursive", label: "Brush Script" },
  { value: "'Comic Sans MS', cursive", label: "Comic Sans" },
] as const;

interface CoverPhoto {
  id: string;
  originalUrl: string;
  convertedUrl: string | null;
}

interface CoverStepProps {
  availableImages: CoverPhoto[];
  onCoverComplete: (coverData: {
    imageIds: [string, string];
    title: string;
    subtitle: string;
  }) => void;
  onBack: () => void;
}

const CoverStep = ({ availableImages, onCoverComplete, onBack }: CoverStepProps) => {
  const { addOns } = useBasket();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [topTitle, setTopTitle] = useState("");
  const [titleFont, setTitleFont] = useState<string>(FONT_OPTIONS[0].value);

  const toggleImage = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const selectedPhotos = selectedIds
    .map((id) => availableImages.find((img) => img.id === id))
    .filter(Boolean) as CoverPhoto[];

  const canContinue = selectedIds.length === 2;

  // Determine subtitle: dedication note replaces default if enabled
  const subtitle = addOns.dedicationPageEnabled && addOns.dedicationPageText.trim()
    ? addOns.dedicationPageText.trim()
    : "FOR KIDS AND ADULTS ALIKE";

  // Top title on cover only shows if title page is enabled and text is provided
  const showTopTitle = addOns.titlePageEnabled && topTitle.trim();
  // Bottom title only shows if title page is enabled
  const showBottomTitle = addOns.titlePageEnabled;

  const handleContinue = () => {
    if (canContinue) {
      onCoverComplete({
        imageIds: [selectedIds[0], selectedIds[1]],
        title: addOns.bottomTitle,
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
          Select 2 photos for your cover — they'll appear alongside their line art versions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cover Preview */}
        <div className="order-2 lg:order-1">
          <div className="bg-cream rounded-3xl p-6 shadow-soft">
            <div className="aspect-[3/4] bg-cream rounded-2xl shadow-soft-lg overflow-hidden flex flex-col">
              {/* Logo header */}
              <div className="pt-8 pb-3 flex justify-center px-6 shrink-0">
                <img src={logoImg} alt="Piccoload – From Pic to Pen" className="w-[55%]" />
              </div>

              {/* Title – only when enabled */}
              {showTopTitle && (
                <div className="px-6 pb-1 text-center shrink-0">
                  <h3 className="text-sm sm:text-base font-semibold text-foreground leading-tight">
                    {topTitle}
                  </h3>
                </div>
              )}

              {/* Two photo pairs */}
              <div className="flex-1 grid grid-rows-2 gap-[2px] mx-[2px] w-auto min-h-0">
                {[0, 1].map((idx) => {
                  const photo = selectedPhotos[idx];
                  const isReversed = idx === 1;
                  return (
                    <div key={idx} className="grid grid-cols-2 gap-[2px] min-h-0 overflow-hidden">
                      {photo ? (
                        <>
                          <div className="overflow-hidden">
                            <img
                              src={isReversed ? (photo.convertedUrl || photo.originalUrl) : photo.originalUrl}
                              alt={isReversed ? `Line art ${idx + 1}` : `Cover photo ${idx + 1}`}
                              className="w-full h-full object-cover object-center"
                            />
                          </div>
                          <div className="overflow-hidden bg-white">
                            {isReversed ? (
                              <img
                                src={photo.originalUrl}
                                alt={`Cover photo ${idx + 1}`}
                                className="w-full h-full object-cover object-center"
                              />
                            ) : photo.convertedUrl ? (
                              <img
                                src={photo.convertedUrl}
                                alt={`Line art ${idx + 1}`}
                                className="w-full h-full object-cover object-center"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                No line art
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="col-span-2 flex items-center justify-center text-sm text-muted-foreground bg-cream">
                          Select photo {idx + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom text */}
              <div className="px-6 pt-5 pb-6 text-center shrink-0">
                <p className="text-[8px] sm:text-[9px] tracking-[0.25em] uppercase text-muted-foreground font-medium" style={{ fontFamily: "'Yuji Syuku', serif" }}>
                  {subtitle}
                </p>
                {showBottomTitle && (
                  <h3 className="text-lg sm:text-xl italic font-semibold text-foreground leading-tight mt-1.5" style={{ fontFamily: titleFont }}>
                    {addOns.bottomTitle}
                  </h3>
                )}
              </div>
            </div>
          </div>

          {/* Cover Title (top) – only when Title Page add-on is enabled */}
          {addOns.titlePageEnabled && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Cover Title (top)</label>
                <Input
                  value={topTitle}
                  onChange={(e) => setTopTitle(e.target.value)}
                  className="mt-1 rounded-xl"
                  placeholder="e.g. Emma's Coloring Book"
                  maxLength={80}
                />
              </div>
            </div>
          )}
        </div>

        {/* Image Selection */}
        <div className="order-1 lg:order-2">
          <h3 className="font-medium text-foreground mb-2">
            Select 2 Cover Photos{" "}
            <span className="text-muted-foreground font-normal">
              ({selectedIds.length}/2 selected)
            </span>
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto p-1">
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
          {canContinue ? "Continue to Checkout" : `Select ${2 - selectedIds.length} more photo${selectedIds.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
};

export default CoverStep;
