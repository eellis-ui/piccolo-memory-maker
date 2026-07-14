import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export interface ProductImage {
  url: string;
  altText: string | null;
}

const FALLBACK_IMAGES: ProductImage[] = [
   { url: "/images/product-hero.webp", altText: "Personalized coloring book" },
   { url: "/images/product-gallery-2.webp", altText: "Personalized coloring book" },
   { url: "/images/product-gallery-3.webp", altText: "Personalized coloring book" },
];

interface Props {
  images?: ProductImage[];
  isLoading?: boolean;
}

const ProductImageGallery = ({ images, isLoading }: Props) => {
  const [selected, setSelected] = useState(0);
  const displayImages = images && images.length > 0 ? images : FALLBACK_IMAGES;

  // Reset selection if it's out of bounds
  const safeSelected = selected >= displayImages.length ? 0 : selected;

  if (isLoading) {
    return (
      <div className="w-full">
        <Skeleton className="aspect-square w-full rounded-lg mb-3" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="w-20 h-20 rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Main image */}
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted mb-3">
        <img
          src={displayImages[safeSelected].url}
          alt={displayImages[safeSelected].altText || "Personalized coloring book"}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Thumbnails */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${displayImages.length}, 1fr)` }}>
        {displayImages.map((img, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
              safeSelected === i
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-muted-foreground/40"
            }`}
          >
            <img src={img.url} alt={img.altText || `Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductImageGallery;
