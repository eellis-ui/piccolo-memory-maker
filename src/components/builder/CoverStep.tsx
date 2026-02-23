import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBasket } from "@/contexts/BasketContext";
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
  const { addOns } = useBasket();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [topTitle, setTopTitle] = useState("");

  const toggleImage = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 4) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const selectedPhotos = selectedIds
    .map((id) => availableImages.find((img) => img.id === id))
    .filter(Boolean) as CoverPhoto[];

  const canContinue = selectedIds.length === 4;

  // Subtitle: dedication note replaces default if enabled
  const subtitle = addOns.dedicationPageEnabled && addOns.dedicationPageText.trim()
    ? addOns.dedicationPageText.trim().toUpperCase()
    : "FOR KIDS AND ADULTS ALIKE";

  const showTopTitle = addOns.titlePageEnabled && topTitle.trim();
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
          Select 4 photos for your cover grid
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cover Preview */}
        <div className="order-2 lg:order-1">
          <div className="bg-[#fffaf3] rounded-3xl p-4 shadow-soft">
            {/*
              Cover canvas: fixed width reference of 800px → scaled via container.
              Margins: 50px each side ≈ 6.25% of 800px.
              Grid: 700px wide (87.5%), each cell square.
              Logo: 500px wide ≈ 62.5%.
            */}
            <div
              className="relative bg-[#fffaf3] rounded-2xl shadow-soft-lg overflow-hidden flex flex-col"
              style={{ aspectRatio: "3 / 4" }}
            >
              {/* ── Top space: logo centered ── */}
              <div className="flex-1 flex items-center justify-center min-h-0">
                <img
                  src={logoImg}
                  alt="Piccoload – From Pic to Pen"
                  style={{ width: "62.5%" }}
                />
              </div>

              {/* ── Optional cover title above grid ── */}
              {showTopTitle && (
                <div className="text-center shrink-0 pb-1 px-[6.25%]">
                  <p className="text-[1.4vw] font-semibold text-foreground leading-tight truncate">
                    {topTitle}
                  </p>
                </div>
              )}

              {/* ── 2×2 photo grid ── */}
              <div
                className="shrink-0 grid grid-cols-2"
                style={{ margin: "0 6.25%", gap: 0 }}
              >
                {[0, 1, 2, 3].map((idx) => {
                  const photo = selectedPhotos[idx];
                  return (
                    <div key={idx} className="aspect-square overflow-hidden bg-[#ede8e0]">
                      {photo ? (
                        <img
                          src={photo.originalUrl}
                          alt={`Cover photo ${idx + 1}`}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[1.2vw] text-muted-foreground">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Bottom space: right-aligned text flush to grid right edge ── */}
              <div className="flex-1 flex flex-col justify-start min-h-0" style={{ paddingRight: "6.25%" }}>
                <div className="flex flex-col items-end" style={{ paddingTop: "2.5%" }}>
                  {/* "FOR KIDS AND ADULTS ALIKE" */}
                  <p
                    className="uppercase text-foreground leading-none"
                    style={{
                      fontFamily: "'Yuji Syuku', serif",
                      fontSize: "1.96vw",
                      letterSpacing: 0,
                    }}
                  >
                    {subtitle}
                  </p>

                  {/* "colour your memories" */}
                  {showBottomTitle && (
                    <p
                      className="leading-none"
                      style={{
                        fontFamily: "Bristol, serif",
                        fontSize: "4.69vw",
                        marginTop: "2.5%",
                        color: "hsl(var(--foreground))",
                      }}
                    >
                      {addOns.bottomTitle || "colour your memories"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cover Title input – only when Title Page add-on is enabled */}
          {addOns.titlePageEnabled && (
            <div className="mt-6">
              <label className="text-sm font-medium text-foreground">Cover Title (top)</label>
              <Input
                value={topTitle}
                onChange={(e) => setTopTitle(e.target.value)}
                className="mt-1 rounded-xl"
                placeholder="e.g. Emma's Coloring Book"
                maxLength={80}
              />
            </div>
          )}
        </div>

        {/* Image Selection */}
        <div className="order-1 lg:order-2">
          <h3 className="font-medium text-foreground mb-2">
            Select 4 Cover Photos{" "}
            <span className="text-muted-foreground font-normal">
              ({selectedIds.length}/4 selected)
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
          {canContinue
            ? "Continue to Checkout"
            : `Select ${4 - selectedIds.length} more photo${4 - selectedIds.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
};

export default CoverStep;
