import { useState, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface CoverStepProps {
  availableImages: { id: string; url: string }[];
  onCoverComplete: (coverData: { imageId: string; zoom: number; position: { x: number; y: number } }) => void;
  onBack: () => void;
}

const CoverStep = ({ availableImages, onCoverComplete, onBack }: CoverStepProps) => {
  const [selectedImage, setSelectedImage] = useState(availableImages[0]?.id || "");
  const [zoom, setZoom] = useState([1]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement>(null);

  const selectedImageUrl = availableImages.find((img) => img.id === selectedImage)?.url || "";

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleContinue = () => {
    onCoverComplete({
      imageId: selectedImage,
      zoom: zoom[0],
      position,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Design Your Cover
        </h2>
        <p className="text-muted-foreground">
          Select a photo and position it within the frame
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cover Preview */}
        <div className="order-2 lg:order-1">
          <div className="bg-cream rounded-3xl p-8 shadow-soft">
            {/* Book Cover */}
            <div className="aspect-[3/4] bg-background rounded-2xl shadow-soft-lg overflow-hidden flex flex-col">
              {/* Title */}
              <div className="p-6 text-center border-b border-border">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  My Piccolo'd Colouring Book
                </h3>
              </div>

              {/* Image Frame */}
              <div
                ref={frameRef}
                className="flex-1 m-6 rounded-xl overflow-hidden bg-cream relative cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {selectedImageUrl ? (
                  <img
                    src={selectedImageUrl}
                    alt="Cover"
                    className="absolute w-full h-full object-cover transition-transform"
                    style={{
                      transform: `scale(${zoom[0]}) translate(${position.x / zoom[0]}px, ${position.y / zoom[0]}px)`,
                    }}
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    Select a photo
                  </div>
                )}
                
                {/* Drag hint */}
                <div className="absolute bottom-2 right-2 bg-background/80 rounded-lg px-2 py-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Move className="w-3 h-3" />
                  Drag to reposition
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 text-center border-t border-border">
                <p className="text-sm text-muted-foreground">Made with Piccolo'd</p>
              </div>
            </div>
          </div>

          {/* Zoom Control */}
          <div className="mt-6 flex items-center gap-4 bg-cream rounded-2xl p-4">
            <ZoomOut className="w-5 h-5 text-muted-foreground" />
            <Slider
              value={zoom}
              onValueChange={setZoom}
              min={1}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Image Selection */}
        <div className="order-1 lg:order-2">
          <h3 className="font-medium text-foreground mb-4">Select Cover Photo</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto p-1">
            {availableImages.map((image) => (
              <button
                key={image.id}
                onClick={() => {
                  setSelectedImage(image.id);
                  setPosition({ x: 0, y: 0 });
                }}
                className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  selectedImage === image.id
                    ? "border-primary shadow-soft ring-2 ring-primary/20"
                    : "border-transparent hover:border-border"
                }`}
              >
                <img
                  src={image.url}
                  alt="Option"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
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
          disabled={!selectedImage}
          className="rounded-2xl px-8"
        >
          Continue to Checkout
        </Button>
      </div>
    </div>
  );
};

export default CoverStep;
