import { useState, useCallback } from "react";
import { Check, RefreshCw, Loader2, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BookPreview from "./BookPreview";
import DigitalUpsellBanner from "./DigitalUpsellBanner";
import { useBasket } from "@/contexts/BasketContext";
import type { OrderPhoto } from "@/pages/Builder";
import {
  updateGuestPhoto,
  deleteGuestPhoto,
} from "@/lib/guest-api";

// Helper: consistent image style for A4 portrait display
const imgStyle = (isLandscape: boolean): React.CSSProperties =>
  isLandscape
    ? { transform: "rotate(90deg)", width: "100%", height: "auto", display: "block" }
    : { width: "100%", height: "100%", objectFit: "contain", display: "block" };

interface ApproveStepProps {
  orderId: string;
  sessionId: string;
  photos: OrderPhoto[];
  onApprovalComplete: (photos: OrderPhoto[]) => void;
  onPhotosChange: (photos: OrderPhoto[]) => void;
  onBack: () => void;
}

const ApproveStep = ({
  orderId,
  sessionId,
  photos: initialPhotos,
  onApprovalComplete,
  onPhotosChange,
  onBack,
}: ApproveStepProps) => {
  const { item, uniquePhotos } = useBasket();
  const bookCount = item?.quantity ?? 1;

  const [photos, setPhotos] = useState<OrderPhoto[]>(initialPhotos);
  const [convertingIds, setConvertingIds] = useState<Set<string>>(new Set());
  const [retryCounts, setRetryCounts] = useState<Record<string, number>>({});
  const MAX_RETRIES_PER_PHOTO = 3;

  const updatePhotos = useCallback((updater: (prev: OrderPhoto[]) => OrderPhoto[]) => {
    setPhotos((prev) => {
      const next = updater(prev);
      onPhotosChange(next);
      return next;
    });
  }, [onPhotosChange]);

  const approvedCount = photos.filter((p) => p.isApproved).length;
  const allApproved = approvedCount === photos.length && photos.length > 0;

  const totalPages = uniquePhotos ? photos.length : photos.length * bookCount;
  const totalApproved = uniquePhotos ? approvedCount : approvedCount * bookCount;

  const pollForConversion = useCallback(async (photoId: string) => {
    const MAX_POLLS = 60; // 2 minutes max
    const POLL_INTERVAL = 2000;

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      const { data: row } = await supabase
        .from("order_photos")
        .select("conversion_status, converted_path")
        .eq("id", photoId)
        .single();

      if (!row) continue;

      if (row.conversion_status === "completed" && row.converted_path) {
        // Fetch a signed URL for the converted image
        const { data: signedData } = await supabase.storage
          .from("order-files")
          .createSignedUrl(row.converted_path, 3600);

        updatePhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  convertedUrl: signedData?.signedUrl ?? "",
                  convertedPath: row.converted_path,
                  conversionStatus: "completed",
                }
              : p
          )
        );
        toast.success("Photo converted successfully!");
        setConvertingIds((prev) => { const next = new Set(prev); next.delete(photoId); return next; });
        return;
      }

      if (row.conversion_status === "failed") {
        updatePhotos((prev) =>
          prev.map((p) => p.id === photoId ? { ...p, conversionStatus: "failed" } : p)
        );
        toast.error("Conversion failed. You can retry.");
        setConvertingIds((prev) => { const next = new Set(prev); next.delete(photoId); return next; });
        return;
      }
    }

    // Timed out polling
    updatePhotos((prev) =>
      prev.map((p) => p.id === photoId ? { ...p, conversionStatus: "failed" } : p)
    );
    toast.error("Conversion timed out. Please retry.");
    setConvertingIds((prev) => { const next = new Set(prev); next.delete(photoId); return next; });
  }, [updatePhotos]);

  const convertPhoto = useCallback(async (photoId: string) => {
    setRetryCounts((prev) => ({ ...prev, [photoId]: (prev[photoId] ?? 0) + 1 }));
    setConvertingIds((prev) => new Set(prev).add(photoId));

    // Optimistically mark as converting in UI
    updatePhotos((prev) =>
      prev.map((p) => p.id === photoId ? { ...p, conversionStatus: "converting" } : p)
    );

    try {
      const { data, error } = await supabase.functions.invoke("convert-to-lineart", {
        body: { photoId, sessionId },
      });

      if (error) {
        const msg = (error as any)?.context?.error || error.message || "Conversion failed";
        throw new Error(msg);
      }

      // Function returns immediately with status "converting" — poll DB for result
      if (data?.status === "converting" || data?.success) {
        pollForConversion(photoId);
      } else {
        throw new Error(data?.error || "Conversion failed to start");
      }
    } catch (err: any) {
      toast.error(`Could not start conversion: ${err.message}`);
      updatePhotos((prev) =>
        prev.map((p) => p.id === photoId ? { ...p, conversionStatus: "failed" } : p)
      );
      setConvertingIds((prev) => { const next = new Set(prev); next.delete(photoId); return next; });
    }
  }, [updatePhotos, pollForConversion]);

  const convertAll = async () => {
    const unconverted = photos.filter(
      (p) => p.conversionStatus === "pending" || p.conversionStatus === "failed"
    );
    if (unconverted.length === 0) return;
    await Promise.allSettled(unconverted.map((photo) => convertPhoto(photo.id)));
  };

  const toggleApproval = async (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (!photo) return;

    const newApproved = !photo.isApproved;
    updatePhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isApproved: newApproved } : p))
    );

    await updateGuestPhoto(sessionId, orderId, id, { is_approved: newApproved });
  };

  const approveAll = async () => {
    updatePhotos((prev) => prev.map((p) => ({ ...p, isApproved: true })));
    await Promise.all(
      photos.map((p) => updateGuestPhoto(sessionId, orderId, p.id, { is_approved: true }))
    );
  };

  const deletePhoto = async (id: string) => {
    const photo = photos.find((p) => p.id === id);
    updatePhotos((prev) => prev.filter((p) => p.id !== id));
    await deleteGuestPhoto(sessionId, orderId, id, photo?.originalPath);
    toast.success("Photo removed");
  };

  const handleReorder = async (reorderedPhotos: OrderPhoto[]) => {
    updatePhotos(() => reorderedPhotos);
    await Promise.all(
      reorderedPhotos.map((p, i) =>
        updateGuestPhoto(sessionId, orderId, p.id, { page_position: i })
      )
    );
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
            Reorder your pages. Cover page is created on next page.
          </p>
          {!uniquePhotos && bookCount > 1 && (
            <p className="text-sm text-primary font-medium mt-1">
              These 20 photos will be shared across all {bookCount} books.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
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

      {/* Digital Download Upsell */}
      <DigitalUpsellBanner variant="compact" maxCopies={1} />

      {/* Conversion Progress */}
      {(() => {
        const convertedCount = photos.filter((p) => p.conversionStatus === "completed").length;
        const totalPhotos = photos.length;
        const isConverting = convertingIds.size > 0;
        const percent = totalPhotos > 0 ? Math.round((convertedCount / totalPhotos) * 100) : 0;
        const allConverted = convertedCount === totalPhotos && totalPhotos > 0;

        return (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {isConverting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Converting photos… {convertedCount} of {totalPhotos}
                  </span>
                ) : allConverted ? (
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <Check className="w-3.5 h-3.5" />
                    All photos converted
                  </span>
                ) : (
                  `${convertedCount} of ${totalPhotos} photos converted`
                )}
              </span>
              <span className="font-medium text-foreground">{percent}%</span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allConverted
                    ? "bg-green-500"
                    : isConverting
                    ? "bg-primary animate-pulse"
                    : "bg-primary"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })()}

      {/* Interactive Book Preview (when all approved) */}
      {allApproved && (
        <BookPreview photos={photos} onReorder={handleReorder} />
      )}

      {/* Pages Grid */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
            <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
            View individual photos ({photos.length})
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
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
                  <div className="absolute top-3 left-3 z-10">
                    <Badge variant="secondary">Page {index + 1}</Badge>
                  </div>

                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center hover:bg-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Image preview area */}
                  <div className="relative bg-muted/30 aspect-[210/297] overflow-hidden">
                    {hasConverted ? (
                      <div className="absolute inset-0 flex">
                        <div className="w-1/2 h-full border-r border-border/50 flex items-center justify-center overflow-hidden bg-muted/20 relative">
                          <img
                            src={photo.originalUrl}
                            alt={`Original ${index + 1}`}
                            className="opacity-60"
                            style={imgStyle(photo.isLandscape)}
                          />
                          <span className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded z-10">
                            Original
                          </span>
                        </div>
                        <div className="w-1/2 h-full flex items-center justify-center overflow-hidden bg-white relative">
                          <img
                            src={photo.convertedUrl!}
                            alt={`Line art ${index + 1}`}
                            style={imgStyle(photo.isLandscape)}
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <span className="text-3xl font-display text-foreground/20 rotate-[-30deg] font-bold tracking-widest select-none">
                              PREVIEW
                            </span>
                          </div>
                          <span className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded z-20">
                            Line Art
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-muted/20">
                        <img
                          src={photo.originalUrl}
                          alt={`Original ${index + 1}`}
                          style={imgStyle(photo.isLandscape)}
                        />
                        {isConverting && (
                          <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-2 z-10">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <span className="text-sm text-muted-foreground">Converting...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

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
                      {hasConverted && !photo.isApproved && (() => {
                        const retries = retryCounts[photo.id] ?? 0;
                        const attemptsLeft = MAX_RETRIES_PER_PHOTO - retries;
                        if (attemptsLeft <= 0) return (
                          <span className="text-xs text-muted-foreground py-1">Max retries reached</span>
                        );
                        return (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => convertPhoto(photo.id)}
                            disabled={isConverting}
                            className="rounded-xl text-muted-foreground"
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Retry ({attemptsLeft} left)
                          </Button>
                        );
                      })()}
                      {photo.conversionStatus === "failed" && (() => {
                        const retries = retryCounts[photo.id] ?? 0;
                        const attemptsLeft = MAX_RETRIES_PER_PHOTO - retries;
                        if (attemptsLeft <= 0) return null;
                        return (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => convertPhoto(photo.id)}
                            className="rounded-xl text-destructive"
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Retry ({attemptsLeft} left)
                          </Button>
                        );
                      })()}
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
        </CollapsibleContent>
      </Collapsible>

      {/* Navigation */}
      <div className="flex justify-start pt-4">
        <Button variant="outline" onClick={onBack} className="rounded-2xl">
          Back to Upload
        </Button>
      </div>
    </div>
  );
};

export default ApproveStep;
