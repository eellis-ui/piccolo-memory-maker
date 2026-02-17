import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrderPhoto } from "@/pages/Builder";

interface BookPreviewProps {
  photos: OrderPhoto[];
  onReorder: (photos: OrderPhoto[]) => void;
}

const SortablePageThumb = ({ photo, index }: { photo: OrderPhoto; index: number }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex-shrink-0 w-20 h-28 rounded-lg border-2 overflow-hidden cursor-grab active:cursor-grabbing ${
        isDragging ? "border-primary shadow-lg" : "border-border"
      }`}
      {...attributes}
      {...listeners}
    >
      <img
        src={photo.convertedUrl || photo.originalUrl}
        alt={`Page ${index + 1}`}
        className="w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute bottom-0 inset-x-0 bg-background/80 text-center">
        <span className="text-[10px] font-medium text-foreground">{index + 1}</span>
      </div>
      <div className="absolute top-0.5 right-0.5">
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </div>
    </div>
  );
};

const BookPreview = ({ photos, onReorder }: BookPreviewProps) => {
  const [currentSpread, setCurrentSpread] = useState(0);
  const maxSpread = Math.ceil(photos.length / 2) - 1;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(photos, oldIndex, newIndex).map((p, i) => ({
      ...p,
      pagePosition: i,
    }));
    onReorder(reordered);
  };

  const leftPage = photos[currentSpread * 2];
  const rightPage = photos[currentSpread * 2 + 1];

  return (
    <div className="rounded-3xl border border-border bg-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-semibold text-foreground">
            Book Preview
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">Drag thumbnails to reorder pages</p>
      </div>

      {/* Open Book Spread */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentSpread(Math.max(0, currentSpread - 1))}
          disabled={currentSpread === 0}
          className="rounded-full"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex bg-muted rounded-2xl overflow-hidden shadow-inner max-w-xl w-full">
          {/* Left Page */}
          <div className="w-1/2 aspect-[3/4] relative border-r border-border/30">
            {leftPage ? (
              <>
                <img
                  src={leftPage.convertedUrl || leftPage.originalUrl}
                  alt={`Page ${currentSpread * 2 + 1}`}
                  className="w-full h-full object-contain bg-white"
                />
                <Badge
                  variant="secondary"
                  className="absolute bottom-2 left-2 text-[10px]"
                >
                  Page {currentSpread * 2 + 1}
                </Badge>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                Empty
              </div>
            )}
          </div>

          {/* Right Page */}
          <div className="w-1/2 aspect-[3/4] relative">
            {rightPage ? (
              <>
                <img
                  src={rightPage.convertedUrl || rightPage.originalUrl}
                  alt={`Page ${currentSpread * 2 + 2}`}
                  className="w-full h-full object-contain bg-white"
                />
                <Badge
                  variant="secondary"
                  className="absolute bottom-2 right-2 text-[10px]"
                >
                  Page {currentSpread * 2 + 2}
                </Badge>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                Empty
              </div>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentSpread(Math.min(maxSpread, currentSpread + 1))}
          disabled={currentSpread >= maxSpread}
          className="rounded-full"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Spread {currentSpread + 1} of {maxSpread + 1}
      </p>

      {/* Sortable Thumbnails Strip */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={photos.map((p) => p.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-2 overflow-x-auto pb-2 px-1">
            {photos.map((photo, index) => (
              <SortablePageThumb key={photo.id} photo={photo} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default BookPreview;
