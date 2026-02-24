import { useState } from "react";
import { Play, X } from "lucide-react";
import { LavenderSplash, CoralSplash } from "./ColorSplash";

interface GalleryItem {
  id: string;
  type: "image" | "video";
  src: string;
  poster?: string;
  alt: string;
}

// Replace placeholders with your real media
const galleryItems: GalleryItem[] = [
  { id: "g1", type: "image", src: "/placeholder.svg", alt: "Finished coloring book spread" },
  { id: "g2", type: "image", src: "/placeholder.svg", alt: "Coloring book cover close-up" },
  { id: "g3", type: "video", src: "", poster: "/placeholder.svg", alt: "Product demo video" },
  { id: "g4", type: "image", src: "/placeholder.svg", alt: "Gift-wrapped coloring book" },
  { id: "g5", type: "image", src: "/placeholder.svg", alt: "Customer coloring a page" },
  { id: "g6", type: "video", src: "", poster: "/placeholder.svg", alt: "Unboxing video" },
];

const GallerySection = () => {
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  return (
    <section className="relative py-20 bg-cream overflow-hidden">
      <LavenderSplash size={130} className="top-10 left-[4%] opacity-30" />
      <CoralSplash size={110} className="bottom-10 right-[4%] opacity-30" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
            Gallery
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Explore our finished books, behind-the-scenes clips, and happy customers
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {galleryItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setLightbox(item)}
              className="relative aspect-square rounded-lg overflow-hidden bg-foreground/5 border border-border group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img
                src={item.type === "video" ? item.poster ?? "/placeholder.svg" : item.src}
                alt={item.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {item.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/10">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-soft">
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 backdrop-blur-sm p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-background hover:text-primary transition-colors"
            aria-label="Close"
          >
            <X className="w-8 h-8" />
          </button>

          <div
            className="max-w-4xl w-full max-h-[85vh] rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {lightbox.type === "image" ? (
              <img
                src={lightbox.src}
                alt={lightbox.alt}
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                src={lightbox.src}
                poster={lightbox.poster}
                controls
                autoPlay
                className="w-full h-full"
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default GallerySection;
