import { useState, useCallback } from "react";
import { Check, RefreshCw, Loader2, Trash2, ChevronDown, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [conversionStartTime, setConversionStartTime] = useState<number | null>(null);
  const [completedInSession, setCompletedInSession] = useState(0);
  const [hasStartedConversion, setHasStartedConversion] = useState(
    () => initialPhotos.some((p) => p.conversionStatus === "completed")
  );
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

// Sortable photo card for drag-and-drop reordering
interface SortablePhotoCardProps {
  photo: OrderPhoto;
  index: number;
  isConverting: boolean;
  retryCounts: Record<string, number>;
  maxRetries: number;
  onDelete: (id: string) => void;
  onConvert: (id: string) => void;
  onToggleApproval: (id: string) => void;
  imgStyle: (isLandscape: boolean) => React.CSSProperties;
}

const SortablePhotoCard = ({
  photo,
  index,
  isConverting,
  retryCounts,
  maxRetries,
  onDelete,
  onConvert,
  onToggleApproval,
  imgStyle: getImgStyle,
}: SortablePhotoCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const hasConverted = photo.conversionStatus === "completed" && photo.convertedUrl;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-lg overflow-hidden transition-all border ${
        photo.isApproved ? "border-primary ring-1 ring-primary/20" : "border-border/60"
      }`}
    >
      {/* Drag handle + page number */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
        <button
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab active:cursor-grabbing w-5 h-5 flex items-center justify-center rounded bg-foreground/80 text-background"
        >
          <GripVertical className="w-3 h-3" />
        </button>
        <span className="text-[10px] font-body font-semibold uppercase tracking-wider bg-foreground/80 text-background px-2 py-0.5 rounded">
          {index + 1}
        </span>
      </div>

      <button
        onClick={() => onDelete(photo.id)}
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-foreground/70 text-background flex items-center justify-center hover:bg-destructive transition-colors"
      >
        <Trash2 className="w-3 h-3" />
      </button>

      {/* Image preview area */}
      <div className="relative bg-muted/20 aspect-[210/297] overflow-hidden">
        {hasConverted ? (
          <div className="absolute inset-0 flex">
            <div className="w-1/2 h-full border-r border-border/30 flex items-center justify-center overflow-hidden bg-muted/10 relative">
              <img
                src={photo.originalUrl}
                alt={`Original ${index + 1}`}
                className="opacity-50"
                style={getImgStyle(photo.isLandscape)}
              />
              <span className="absolute bottom-1 left-1 text-[9px] uppercase tracking-wider text-muted-foreground bg-background/70 px-1.5 py-0.5 rounded z-10">
                Before
              </span>
            </div>
            <div className="w-1/2 h-full flex items-center justify-center overflow-hidden bg-white relative">
              <img
                src={photo.convertedUrl!}
                alt={`Line art ${index + 1}`}
                style={getImgStyle(photo.isLandscape)}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <span className="text-2xl font-display text-foreground/15 rotate-[-30deg] font-bold tracking-widest select-none">
                  PREVIEW
                </span>
              </div>
              <span className="absolute bottom-1 right-1 text-[9px] uppercase tracking-wider text-muted-foreground bg-background/70 px-1.5 py-0.5 rounded z-20">
                After
              </span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-muted/10">
            <img
              src={photo.originalUrl}
              alt={`Original ${index + 1}`}
              style={getImgStyle(photo.isLandscape)}
            />
            {isConverting && (
              <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-1.5 z-10">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="text-[11px] text-muted-foreground">Converting…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions — compact bottom bar */}
      <div className="px-2.5 py-2 flex items-center justify-between bg-background">
        <div className="flex gap-1">
          {!hasConverted && !isConverting && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void onConvert(photo.id)}
              className="rounded-lg h-7 px-2.5 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Convert
            </Button>
          )}
          {hasConverted && !photo.isApproved && (() => {
            const retries = retryCounts[photo.id] ?? 0;
            const attemptsLeft = maxRetries - retries;
            if (attemptsLeft <= 0) return (
              <span className="text-[10px] text-muted-foreground py-1">Max retries</span>
            );
            return (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void onConvert(photo.id)}
                disabled={isConverting}
                className="rounded-lg h-7 px-2.5 text-xs text-muted-foreground"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry ({attemptsLeft})
              </Button>
            );
          })()}
          {photo.conversionStatus === "failed" && (() => {
            const retries = retryCounts[photo.id] ?? 0;
            const attemptsLeft = maxRetries - retries;
            if (attemptsLeft <= 0) return null;
            return (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void onConvert(photo.id)}
                className="rounded-lg h-7 px-2.5 text-xs text-destructive"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry ({attemptsLeft})
              </Button>
            );
          })()}
        </div>

        {hasConverted && (
          <Button
            type="button"
            variant={photo.isApproved ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleApproval(photo.id)}
            className="rounded-lg h-7 px-2.5 text-xs"
          >
            <Check className="w-3 h-3 mr-1" />
            {photo.isApproved ? "Approved" : "Approve"}
          </Button>
        )}
      </div>
    </div>
  );
};


  const convertPhoto = useCallback(async (photoId: string) => {
    setRetryCounts((prev) => ({ ...prev, [photoId]: (prev[photoId] ?? 0) + 1 }));
    // Don't add to convertingIds here — convertAll handles that for batch UX

    try {
      console.log(`[convert] Starting conversion for photo ${photoId}, session ${sessionId}`);

      // Add a 90-second timeout so we don't hang forever
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);

      const { data, error } = await supabase.functions.invoke("convert-to-lineart", {
        body: { photoId, sessionId },
      });

      clearTimeout(timeout);
      console.log(`[convert] Response for ${photoId}:`, { data, error });

      if (error) {
        let msg = "Conversion failed";
        try {
          if (error instanceof Response || (error as any)?.context) {
            const body = (error as any)?.context;
            if (body && typeof body === "object" && body.error) {
              msg = body.error;
            } else if (typeof body === "string") {
              const parsed = JSON.parse(body);
              msg = parsed.error || msg;
            }
          } else {
            msg = error.message || msg;
          }
        } catch {
          msg = error.message || msg;
        }
        throw new Error(msg);
      }

      if (data?.success) {
        updatePhotos((prev) =>
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
        return true;
      } else {
        throw new Error(data?.error || "Conversion failed");
      }
    } catch (err: any) {
      console.error(`[convert] Error for ${photoId}:`, err);
      const msg = err.name === "AbortError" ? "Conversion timed out — please retry" : err.message;
      toast.error(`Conversion failed: ${msg}`);
      updatePhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, conversionStatus: "failed" } : p
        )
      );
      return false;
    }
  }, [sessionId, updatePhotos]);

  const convertAll = async () => {
    const unconverted = photos.filter(
      (p) => p.conversionStatus === "pending" || p.conversionStatus === "failed"
    );
    if (unconverted.length === 0) return;

    // Mark ALL photos as converting upfront so UI shows all spinners immediately
    const allIds = new Set(unconverted.map((p) => p.id));
    setConvertingIds(allIds);
    setConversionStartTime(Date.now());
    setCompletedInSession(0);
    setHasStartedConversion(true);
    console.log(`[convertAll] Starting conversion of ${unconverted.length} photos (batches of 10)`);

    let done = 0;
    // Process in batches of 10 for maximum parallelism
    const BATCH_SIZE = 10;
    for (let i = 0; i < unconverted.length; i += BATCH_SIZE) {
      const batch = unconverted.slice(i, i + BATCH_SIZE);
      console.log(`[convertAll] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.map(p => p.id.slice(0, 8)).join(', ')}`);
      await Promise.allSettled(batch.map((photo) => convertPhoto(photo.id)));
      done += batch.length;
      setCompletedInSession(done);

      // Remove completed/failed photos from converting set
      setConvertingIds((prev) => {
        const next = new Set(prev);
        batch.forEach((p) => {
          const current = photos.find((ph) => ph.id === p.id);
          if (!current || current.conversionStatus !== "pending") {
            next.delete(p.id);
          }
        });
        return next;
      });
    }

    // Clear all converting IDs when done
    setConvertingIds(new Set());
    setConversionStartTime(null);
    console.log(`[convertAll] All conversions complete`);
  };

  // Single photo convert (for individual Convert/Retry buttons)
  const convertSinglePhoto = useCallback(async (photoId: string) => {
    setConvertingIds((prev) => new Set(prev).add(photoId));
    setHasStartedConversion(true);
    await convertPhoto(photoId);
    setConvertingIds((prev) => {
      const next = new Set(prev);
      next.delete(photoId);
      return next;
    });
  }, [convertPhoto]);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(photos, oldIndex, newIndex);
    updatePhotos(() => reordered);

    // Persist new page positions
    reordered.forEach((photo, i) => {
      updateGuestPhoto(sessionId, orderId, photo.id, { page_position: i });
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );


  const handleContinue = () => {
    onApprovalComplete(photos);
  };

  const hasUnconverted = photos.some(
    (p) => p.conversionStatus === "pending" || p.conversionStatus === "failed"
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground whitespace-nowrap">
            Convert and Approve Your Images
          </h2>
          <p className="text-muted-foreground">
            Cover page is created on next page.
          </p>
          {!uniquePhotos && bookCount > 1 && (
            <p className="text-sm text-primary font-medium mt-1">
              These 20 photos will be shared across all {bookCount} books.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {hasUnconverted && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void convertAll()}
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
            <Button type="button" variant="outline" onClick={approveAll} className="rounded-2xl">
              Approve All
            </Button>
          )}
          {hasStartedConversion && (
            <Button
              type="button"
              onClick={allApproved ? handleContinue : approveAll}
              className="rounded-2xl px-8"
            >
              {allApproved
                ? "Continue to Cover Design"
                : "Approve All"}
            </Button>
          )}
        </div>
      </div>

      {/* Digital Download Upsell */}
      <DigitalUpsellBanner variant="compact" maxCopies={1} />

      {/* Conversion Progress */}
      {(() => {
        const isSharedMode = !uniquePhotos && bookCount > 1;
        const displayTotal = isSharedMode ? Math.min(photos.length, 20) : photos.length;
        const convertedCount = photos.filter((p) => p.conversionStatus === "completed").length;
        const displayConverted = Math.min(convertedCount, displayTotal);
        const totalPhotos = displayTotal;
        const isConverting = convertingIds.size > 0;
        const percent = totalPhotos > 0 ? Math.round((displayConverted / totalPhotos) * 100) : 0;
        const allConverted = convertedCount >= displayTotal && totalPhotos > 0;

        return (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {isConverting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Converting photos… {displayConverted} of {totalPhotos}
                    {conversionStartTime && completedInSession > 0 && (() => {
                      const elapsed = (Date.now() - conversionStartTime) / 1000;
                      const avgPerPhoto = elapsed / completedInSession;
                      const remaining = Math.max(0, (totalPhotos - displayConverted) * avgPerPhoto);
                      const mins = Math.floor(remaining / 60);
                      const secs = Math.round(remaining % 60);
                      return (
                        <span className="text-xs ml-1">
                          (~{mins > 0 ? `${mins}m ` : ""}{secs}s left)
                        </span>
                      );
                    })()}
                  </span>
                ) : allConverted ? (
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <Check className="w-3.5 h-3.5" />
                    All photos converted
                  </span>
                ) : (
              `${displayConverted} of ${totalPhotos} photos converted`
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
            {/* Approval progress */}
            {allConverted && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {approvedCount >= totalPhotos ? (
                      <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <Check className="w-3.5 h-3.5" />
                        All pages approved
                      </span>
                    ) : (
                      `${Math.min(approvedCount, totalPhotos)} of ${totalPhotos} pages approved`
                    )}
                  </span>
                  <span className="font-medium text-foreground">{totalPhotos > 0 ? Math.round((Math.min(approvedCount, totalPhotos) / totalPhotos) * 100) : 0}%</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      approvedCount >= totalPhotos
                        ? "bg-green-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${totalPhotos > 0 ? Math.round((Math.min(approvedCount, totalPhotos) / totalPhotos) * 100) : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })()}


      {/* Pages Grid — Drag to reorder */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
            <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
            View individual photos ({photos.length})
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
            <GripVertical className="w-3.5 h-3.5" />
            Drag and drop to rearrange the page order of your book
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {photos.map((photo, index) => (
                  <SortablePhotoCard
                    key={photo.id}
                    photo={photo}
                    index={index}
                    isConverting={convertingIds.has(photo.id)}
                    retryCounts={retryCounts}
                    maxRetries={MAX_RETRIES_PER_PHOTO}
                    onDelete={deletePhoto}
                    onConvert={convertSinglePhoto}
                    onToggleApproval={toggleApproval}
                    imgStyle={imgStyle}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CollapsibleContent>
      </Collapsible>

      {/* Navigation */}
      <div className="flex justify-start pt-4">
        <Button type="button" variant="outline" onClick={onBack} className="rounded-2xl">
          Back to Upload
        </Button>
      </div>
    </div>
  );
};

export default ApproveStep;
