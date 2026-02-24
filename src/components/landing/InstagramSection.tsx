import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const instagramImages = [
  "/images/hero-grid-1.jpg",
  "/images/hero-grid-2.jpg",
  "/images/hero-grid-3.jpg",
  "/images/hero-grid-4.jpg",
  "/images/hero-grid-5.jpg",
  "/images/hero-grid-6.jpg",
  "/images/hero-grid-7.jpg",
];

const INSTAGRAM_URL = "https://www.instagram.com/officialpiccoload/";

const InstagramSection = () => {
  const [startIndex, setStartIndex] = useState(0);
  const visibleCount = 5;

  const canPrev = startIndex > 0;
  const canNext = startIndex + visibleCount < instagramImages.length;

  const prev = () => {
    if (canPrev) setStartIndex((i) => i - 1);
  };
  const next = () => {
    if (canNext) setStartIndex((i) => i + 1);
  };

  const visibleImages = instagramImages.slice(startIndex, startIndex + visibleCount);

  return (
    <section className="py-16 bg-background">
      <div className="text-center mb-10 px-4">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground uppercase mb-4">
          Follow Us Instagram
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
          We love to see you using your Piccoload book! Please tag us on instagram{" "}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-foreground font-medium hover:text-primary transition-colors"
          >
            @officialpiccoload
          </a>{" "}
          for a chance to be featured!
        </p>
      </div>

      {/* Carousel */}
      <div className="relative w-full">
        {/* Prev button */}
        {canPrev && (
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-background transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
        )}

        {/* Next button */}
        {canNext && (
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-background transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6 text-foreground" />
          </button>
        )}

        {/* Images row */}
        <div className="flex gap-1 overflow-hidden">
          {visibleImages.map((src, i) => (
            <a
              key={startIndex + i}
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0"
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={src}
                  alt="Instagram post from Piccoload"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InstagramSection;
