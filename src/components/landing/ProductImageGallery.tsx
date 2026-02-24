import { useState } from "react";

const images = [
  "/lovable-uploads/67e8bc18-d4da-4d1e-bb5c-8235ea57eb6d.png",
  "/lovable-uploads/bc0afa55-54e9-40fc-b263-333f5ed085bc.png",
  "/lovable-uploads/d741aeb9-21af-45e1-9863-e350da643d42.png",
];

const ProductImageGallery = () => {
  const [selected, setSelected] = useState(0);

  return (
    <div className="w-full">
      {/* Main image */}
      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-muted mb-3">
        <img
          src={images[selected]}
          alt="Personalised coloring book"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2">
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
              selected === i
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-muted-foreground/40"
            }`}
          >
            <img src={src} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductImageGallery;
