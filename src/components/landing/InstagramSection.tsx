import { Instagram, Heart, MessageCircle } from "lucide-react";

const INSTAGRAM_URL = "https://www.instagram.com/officialpiccoload/";

/**
 * To update the feed, drop square-ish photos into public/images/instagram/
 * and update this array. Use 6, 9, or 12 images for a clean grid.
 */
const FEED_IMAGES: { src: string; alt: string; likes: number; comments: number }[] = [
  { src: "/images/hero-grid-1.jpg", alt: "Coloring book on table", likes: 124, comments: 8 },
  { src: "/images/hero-grid-2.jpg", alt: "Line art portrait", likes: 97, comments: 5 },
  { src: "/images/hero-grid-3.jpg", alt: "Family coloring book", likes: 215, comments: 12 },
  { src: "/images/hero-grid-4.jpg", alt: "Pet line art", likes: 183, comments: 14 },
  { src: "/images/hero-grid-5.jpg", alt: "Before and after", likes: 156, comments: 9 },
  { src: "/images/hero-grid-6.jpg", alt: "Coloring in progress", likes: 201, comments: 11 },
  { src: "/images/hero-grid-7.jpg", alt: "Gift wrapping a book", likes: 142, comments: 7 },
  { src: "/images/hero-grid-8.jpg", alt: "Finished coloring page", likes: 178, comments: 10 },
  { src: "/images/hero-grid-9.jpg", alt: "Happy customer", likes: 234, comments: 16 },
];

const InstagramSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="text-center mb-10 px-4">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground uppercase mb-4">
          Follow Us On Instagram
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
          We love to see you using your Piccoload book! Please tag us on Instagram{" "}
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

      {/* Instagram-style grid */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-3 gap-1 sm:gap-3">
          {FEED_IMAGES.map((img, idx) => (
            <a
              key={idx}
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-sm sm:rounded-md bg-muted"
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4 sm:gap-6">
                <span className="flex items-center gap-1.5 text-white text-sm sm:text-base font-semibold">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                  {img.likes}
                </span>
                <span className="flex items-center gap-1.5 text-white text-sm sm:text-base font-semibold">
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                  {img.comments}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Follow button */}
      <div className="text-center mt-8">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border-2 border-foreground px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-foreground hover:text-background transition-colors"
        >
          <Instagram className="w-4 h-4" />
          Follow @officialpiccoload
        </a>
      </div>
    </section>
  );
};

export default InstagramSection;
