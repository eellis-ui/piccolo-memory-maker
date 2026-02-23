import { useState, useCallback } from "react";
import { Check, RefreshCw, Loader2, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BookPreview from "./BookPreview";
import DigitalUpsellBanner from "./DigitalUpsellBanner";
import { useBasket } from "@/contexts/BasketContext";
import type { OrderPhoto } from "@/pages/Builder";

interface ApproveStepProps {
  orderId: string;
  photos: OrderPhoto[];
  onApprovalComplete: (photos: OrderPhoto[]) => void;
  onBack: () => void;
}

const ApproveStep = ({
  orderId,
  photos: initialPhotos,
  onApprovalComplete,
  onBack,
}: ApproveStepProps) => {
  const { item, uniquePhotos } = useBasket();
  const bookCount = item?.quantity ?? 1;

  const [photos, setPhotos] = useState<OrderPhoto[]>(initialPhotos);
  const [convertingIds, setConvertingIds] = useState<Set<string>>(new Set());

  const approvedCount = photos.filter((p) => p.isApproved).length;
  const allApproved = approvedCount === photos.length && photos.length > 0;

  // Total pages across all books for display
  const totalPages = uniquePhotos ? photos.length : photos.length * bookCount;
  const totalApproved = uniquePhotos ? approvedCount : approvedCount * bookCount;

  const convertPhoto = useCallback(async (photoId: string) => {
    setConvertingIds((prev) => new Set(prev).add(photoId));

    try {
      const { data, error } = await supabase.functions.invoke("convert-to-lineart", {
        body: { photoId },
      });

      if (error) throw error;

      if (data?.success) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  convertedUrl: data.convertedUrl,
                  convertedPath: data.convertedPath,
                  conversionStatus: "completed",
                }
              : p
          )
        );
        toast.success("Photo converted successfully!");
      } else {
        throw new Error(data?.error || "Conversion failed");
      }
    } catch (err: any) {
      toast.error(`Conversion failed: ${err.message}`);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, conversionStatus: "failed" } : p
        )
      );
    } finally {
      setConvertingIds((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
    }
  }, []);

  const convertAll = async () => {
    const unconverted = photos.filter(
      (p) => p.conversionStatus === "pending" || p.conversionStatus === "failed"
    );
    if (unconverted.length === 0) return;

    // Fire all conversions in parallel
    await Promise.allSettled(unconverted.map((photo) => convertPhoto(photo.id)));
  };

  const toggleApproval = async (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (!photo) return;

    const newApproved = !photo.isApproved;
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isApproved: newApproved } : p))
    );

    await supabase
      .from("order_photos")
      .update({ is_approved: newApproved })
      .eq("id", id);
  };

  const approveAll = async () => {
    setPhotos((prev) => prev.map((p) => ({ ...p, isApproved: true })));
    const ids = photos.map((p) => p.id);
    for (const id of ids) {
      await supabase
        .from("order_photos")
        .update({ is_approved: true })
        .eq("id", id);
    }
  };

  const deletePhoto = async (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("order_photos").delete().eq("id", id);
    toast.success("Photo removed");
  };

  const handleReorder = async (reorderedPhotos: OrderPhoto[]) => {
    setPhotos(reorderedPhotos);
    // Persist new positions to database
    for (let i = 0; i < reorderedPhotos.length; i++) {
      await supabase
        .from("order_photos")
        .update({ page_position: i })
        .eq("id", reorderedPhotos[i].id);
    }
  };

  const handleContinue = () => {
    onApprovalComplete(photos);
  };

  const hasUnconverted = photos.some(
    (p) => p.conversionStatus === "pending" || p.conversionStatus === "failed"
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Approve Your Pages
          </h2>
          <p className="text-muted-foreground">
            Convert and review each page before continuing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm py-1 px-3">
            {totalApproved} of {totalPages} pages approved
          </Badge>
          {hasUnconverted && (
            <Button
              variant="outline"
              onClick={convertAll}
              disabled={convertingIds.size > 0}
              className="rounded-2xl"
            >
              {convertingIds.size > 0 ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              Convert All ({photos.filter((p) => p.conversionStatus === "pending" || p.conversionStatus === "failed").length})
            </Button>
          )}
          {!allApproved && !hasUnconverted && (
            <Button variant="outline" onClick={approveAll} className="rounded-2xl">
              Approve All
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(totalApproved / Math.max(totalPages, 1)) * 100}%` }}
        />
      </div>

      {/* Interactive Book Preview (when all approved) */}
      {allApproved && (
        <BookPreview photos={photos} onReorder={handleReorder} />
      )}

      {/* Pages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo, index) => {
          const isConverting = convertingIds.has(photo.id);
          const hasConverted = photo.conversionStatus === "completed" && photo.convertedUrl;

          return (
            <div
              key={photo.id}
              className={`relative rounded-3xl border-2 overflow-hidden transition-all ${
                photo.isApproved ? "border-primary shadow-soft" : "border-border"
              }`}
            >
              {/* Page Number */}
              <div className="absolute top-3 left-3 z-10">
                <Badge variant="secondary">Page {index + 1}</Badge>
              </div>

              {/* Delete button */}
              <button
                onClick={() => deletePhoto(photo.id)}
                className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center hover:bg-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Image display */}
              <div className="relative bg-cream aspect-[3/4]">
                {hasConverted ? (
                  <div className="absolute inset-0 flex">
                    <div className="w-1/2 h-full border-r border-border/50 relative">
                      <img
                        src={photo.originalUrl}
                        alt={`Original ${index + 1}`}
                        className={`w-full h-full object-contain opacity-50 ${photo.isLandscape ? "rotate-90 scale-[1.33]" : ""}`}
                      />
                      <span className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                        Original
                      </span>
                    </div>
                    <div className="w-1/2 h-full relative">
                      <img
                        src={photo.convertedUrl!}
                        alt={`Line art ${index + 1}`}
                        className={`w-full h-full object-contain ${photo.isLandscape ? "rotate-90 scale-[1.33]" : ""}`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-4xl font-display text-foreground/25 rotate-[-30deg] font-bold tracking-widest select-none">
                          PREVIEW
                        </span>
                      </div>
                      <span className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                        Line Art
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src={photo.originalUrl}
                      alt={`Original ${index + 1}`}
                      className={`w-full h-full object-contain ${photo.isLandscape ? "rotate-90 scale-[1.33]" : ""}`}
                    />
                    {isConverting && (
                      <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-sm text-muted-foreground">Converting...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 flex items-center justify-between bg-background">
                <div className="flex gap-2">
                  {!hasConverted && !isConverting && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => convertPhoto(photo.id)}
                      className="rounded-xl"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Convert
                    </Button>
                  )}
                  {photo.conversionStatus === "failed" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => convertPhoto(photo.id)}
                      className="rounded-xl text-destructive"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Retry
                    </Button>
                  )}
                </div>

                {hasConverted && (
                  <Button
                    variant={photo.isApproved ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleApproval(photo.id)}
                    className="rounded-xl"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    {photo.isApproved ? "Approved" : "Approve"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Digital Download Upsell */}
      {allApproved && <DigitalUpsellBanner variant="compact" maxCopies={1} />}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} className="rounded-2xl">
          Back to Upload
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!allApproved}
          className="rounded-2xl px-8"
        >
          {allApproved
            ? "Continue to Cover Design"
            : `Approve ${photos.length - approvedCount} more`}
        </Button>
      </div>
    </div>
  );
};

export default ApproveStep;
