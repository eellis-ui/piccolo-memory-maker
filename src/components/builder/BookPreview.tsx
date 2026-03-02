import { useState, useRef, useEffect } from "react";
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
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBasket } from "@/contexts/BasketContext";
import logoImg from "@/assets/piccoload-logo.png";
import BackCoverPage from "@/components/builder/BackCoverPage";
import type { OrderPhoto } from "@/pages/Builder";

interface BookPreviewProps {
  photos: OrderPhoto[];
  onReorder: (photos: OrderPhoto[]) => void;
  coverImageIds?: [string, string] | null;
}

/* ── Sortable thumbnail (draggable) ── */
const SortableThumb = ({
  photo,
  index,
  isActive,
  onClick,
}: {
  photo: OrderPhoto;
  index: number;
  isActive: boolean;
  onClick: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`relative flex-shrink-0 w-16 h-22 sm:w-20 sm:h-28 rounded-xl border-2 overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
        isActive
          ? "border-primary ring-2 ring-primary/30 shadow-md"
          : isDragging
          ? "border-primary/50 shadow-lg"
          : "border-border hover:border-primary/40"
      }`}
      {...attributes}
      {...listeners}
    >
      <img
        src={photo.convertedUrl || photo.originalUrl}
        alt={`Page ${index + 1}`}
        className={`w-full h-full object-contain ${photo.isLandscape ? "rotate-90 scale-[1.33]" : ""}`}
        draggable={false}
      />
      <div className="absolute bottom-0 inset-x-0 bg-background/80 text-center py-0.5">
        <span className="text-[10px] font-medium text-foreground">{index + 1}</span>
      </div>
    </button>
  );
};

/* ── Cover page renderer ── */
const CoverPage = ({ photos, coverImageIds }: { photos: OrderPhoto[]; coverImageIds?: [string, string] | null }) => {
  const { addOns } = useBasket();

  const subtitle =
    addOns.dedicationPageEnabled && addOns.dedicationPageText.trim()
      ? addOns.dedicationPageText.trim().toUpperCase()
      : "FOR KIDS AND ADULTS ALIKE";

  const bottomTitle = addOns.dedicationPageEnabled && addOns.dedicationPageText.trim()
    ? addOns.dedicationPageText.trim()
    : (addOns.titlePageEnabled && addOns.titlePageText.trim()) || "color your memories";

  const photo1 = coverImageIds ? photos.find((p) => p.id === coverImageIds[0]) ?? null : null;
  const photo2 = coverImageIds ? photos.find((p) => p.id === coverImageIds[1]) ?? null : null;

  const gridCells = [
    photo1 ? photo1.originalUrl : null,
    photo1 ? photo1.convertedUrl : null,
    photo2 ? photo2.convertedUrl : null,
    photo2 ? photo2.originalUrl : null,
  ];

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: "#fffaf3" }}
    >
      {/* Logo */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <img src={logoImg} alt="Piccoload" style={{ width: "50%" }} />
      </div>

      {/* 2×2 photo grid */}
      <div
        className="shrink-0 grid grid-cols-2"
        style={{ margin: "0 8.75%", gap: 0 }}
      >
        {gridCells.map((url, idx) => (
          <div key={idx} className="aspect-square overflow-hidden" style={{ backgroundColor: "#ede8e0" }}>
            {url ? (
              <img
                src={url}
                alt={`Cover cell ${idx + 1}`}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground" style={{ fontSize: "1.2vw" }}>
                {idx + 1}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom text — right-aligned flush to grid edge */}
      <div
        className="flex-1 flex flex-col justify-start min-h-0"
        style={{ paddingRight: "8.75%" }}
      >
        <div className="flex flex-col items-end" style={{ paddingTop: "2.5%" }}>
          <p
            className="uppercase text-foreground leading-none"
            style={{
              fontFamily: "'Yuji Syuku', serif",
              fontSize: "clamp(6px, 1.59vw, 12px)",
              letterSpacing: 0,
            }}
          >
            {subtitle}
          </p>
          <p
            className="leading-none"
            style={{
              fontFamily: "Bristol, serif",
              fontSize: "clamp(8px, 1.875vw, 14px)",
              marginTop: "2.5%",
              color: "hsl(var(--foreground))",
            }}
          >
            {bottomTitle}
          </p>
        </div>
      </div>
    </div>
  );
};

/* ── Main BookPreview ── */
const BookPreview = ({ photos, onReorder, coverImageIds }: BookPreviewProps) => {
  // page 0 = cover, pages 1..N = line-art pages, last page = back cover
  const totalPages = photos.length + 2;
  const [currentPage, setCurrentPage] = useState(0);
  const filmstripRef = useRef<HTMLDivElement>(null);

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

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!filmstripRef.current) return;
    const active = filmstripRef.current.children[currentPage] as HTMLElement | undefined;
    active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [currentPage]);

  const goTo = (page: number) => setCurrentPage(Math.max(0, Math.min(totalPages - 1, page)));

  return (
    <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-semibold text-foreground">
            Book Preview
          </h3>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Drag thumbnails below to reorder pages
        </p>
      </div>

      {/* Navigation + Page Counter */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 0}
          className="rounded-full h-9 w-9"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-sm font-medium text-foreground min-w-[120px] text-center">
          {currentPage === 0 ? "Cover" : currentPage === totalPages - 1 ? "Back Cover" : `Page ${currentPage}`} of {totalPages - 2}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="rounded-full h-9 w-9"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Large Page View */}
      <div className="flex justify-center">
        <div className="aspect-[210/297] w-full max-w-sm bg-muted rounded-2xl overflow-hidden shadow-inner transition-all duration-300">
          {currentPage === 0 ? (
            <CoverPage photos={photos} coverImageIds={coverImageIds} />
          ) : currentPage === totalPages - 1 ? (
            <BackCoverPage />
          ) : (
            <div className="relative w-full h-full">
              <img
                src={photos[currentPage - 1]?.convertedUrl || photos[currentPage - 1]?.originalUrl}
                alt={`Page ${currentPage}`}
                className={`w-full h-full object-cover bg-white ${photos[currentPage - 1]?.isLandscape ? "rotate-90 scale-[1.33]" : ""}`}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-5xl font-display text-foreground/20 rotate-[-30deg] font-bold tracking-widest select-none">
                  PREVIEW
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filmstrip */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={photos.map((p) => p.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div
            ref={filmstripRef}
            className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-thin"
          >
            {/* Cover thumbnail (fixed, not draggable) */}
            <button
              onClick={() => goTo(0)}
              className={`relative flex-shrink-0 w-16 h-22 sm:w-20 sm:h-28 rounded-xl border-2 overflow-hidden transition-all ${
                currentPage === 0
                  ? "border-primary ring-2 ring-primary/30 shadow-md"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="w-full h-full bg-cream flex flex-col items-center justify-center gap-1 p-1">
                <img src={logoImg} alt="Cover" className="w-10 opacity-70" draggable={false} />
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-background/80 text-center py-0.5">
                <span className="text-[9px] font-medium text-foreground">Cover</span>
              </div>
            </button>

            {/* Page thumbnails (draggable) */}
            {photos.map((photo, index) => (
              <SortableThumb
                key={photo.id}
                photo={photo}
                index={index}
                isActive={currentPage === index + 1}
                onClick={() => goTo(index + 1)}
              />
            ))}

            {/* Back cover thumbnail (fixed, not draggable) */}
            <button
              onClick={() => goTo(totalPages - 1)}
              className={`relative flex-shrink-0 w-16 h-22 sm:w-20 sm:h-28 rounded-xl border-2 overflow-hidden transition-all ${
                currentPage === totalPages - 1
                  ? "border-primary ring-2 ring-primary/30 shadow-md"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1" style={{ backgroundColor: "#fffaf3" }}>
                <img src={logoImg} alt="Back Cover" className="w-10 opacity-70" draggable={false} />
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-background/80 text-center py-0.5">
                <span className="text-[9px] font-medium text-foreground">Back</span>
              </div>
            </button>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default BookPreview;
