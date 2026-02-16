import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logoImg from "@/assets/piccoload-logo.png";

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState("colour in your memories");
  const [subtitle, setSubtitle] = useState("FOR KIDS AND ADULTS ALIKE");

  const toggleImage = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 2) return [prev[1], id]; // replace oldest
      return [...prev, id];
    });
  };

  const selectedPhotos = selectedIds
    .map((id) => availableImages.find((img) => img.id === id))
    .filter(Boolean) as CoverPhoto[];

  const canContinue = selectedIds.length === 2;

  const handleContinue = () => {
    if (canContinue) {
      onCoverComplete({
        imageIds: [selectedIds[0], selectedIds[1]],
        title,
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
            <div className="aspect-[3/4] bg-background rounded-2xl shadow-soft-lg overflow-hidden flex flex-col items-center">
              {/* Logo header */}
              <div className="pt-6 pb-2 flex flex-col items-center px-8">
                <img src={logoImg} alt="Piccoload – From Pic to Pen" className="w-[55%] max-w-[220px]" />
              </div>

              {/* Two photo pairs – alternating layout, no gap, fills space */}
              <div className="flex-1 flex flex-col gap-0 w-full">
                {[0, 1].map((idx) => {
                  const photo = selectedPhotos[idx];
                  // Row 0: original | lineart, Row 1: lineart | original
                  const isReversed = idx === 1;
                  return (
                    <div
                      key={idx}
                      className="flex overflow-hidden flex-1"
                    >
                      {photo ? (
                        <>
                          <div className="w-1/2 relative">
                            <img
                              src={isReversed ? (photo.convertedUrl || photo.originalUrl) : photo.originalUrl}
                              alt={isReversed ? `Line art ${idx + 1}` : `Cover photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="w-1/2 relative bg-white">
                            {isReversed ? (
                              <img
                                src={photo.originalUrl}
                                alt={`Cover photo ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : photo.convertedUrl ? (
                              <img
                                src={photo.convertedUrl}
                                alt={`Line art ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                No line art
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="w-full min-h-[80px] flex items-center justify-center text-sm text-muted-foreground bg-cream">
                          Select photo {idx + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Subtitle + Title at bottom */}
              <div className="px-6 pb-5 text-center">
                <p className="text-[9px] sm:text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium">
                  {subtitle}
                </p>
                <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground leading-tight mt-1">
                  {title}
                </h3>
              </div>
            </div>
          </div>

          {/* Editable text fields */}
          <div className="mt-6 space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Cover Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 rounded-xl"
                placeholder="colour in your memories"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Subtitle</label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="mt-1 rounded-xl"
                placeholder="FOR KIDS AND ADULTS ALIKE"
              />
            </div>
          </div>
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
