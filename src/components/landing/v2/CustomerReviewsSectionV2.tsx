import { Star, CheckCircle, Camera } from "lucide-react";

// DEMO NOTE: photos and quotes below are existing site assets, hand-placed.
// Production replaces this array with a live feed from a review platform
// (Judge.me / Okendo / Trustpilot) so the count is always real, and adds
// Product + AggregateRating schema for review stars in search results.
const photoReviews = [
  {
    name: "Georgie",
    location: "USA",
    rating: 5,
    verified: true,
    photo: "/images/review-georgie.webp",
    text: "Mums Birthday is complete! The line art is so detailed — she cried happy tears.",
  },
  {
    name: "Ewan",
    location: "UK",
    rating: 5,
    verified: true,
    photo: "/images/review-ewan.webp",
    text: "Really enjoyed coloring my London Marathon run! Such a cool way to relive it.",
  },
  {
    name: "Ellie",
    location: "UK",
    rating: 5,
    verified: true,
    photo: "/images/review-ellie.webp",
    text: "Love it SOO much. The paper quality is perfect for markers.",
  },
  {
    name: "Matilda",
    location: "UK",
    rating: 5,
    verified: true,
    photo: "/images/review-matilda.webp",
    text: "Exactly what I didn't know I needed. Ordering two more for Christmas.",
  },
  {
    name: "Tom",
    location: "USA",
    rating: 5,
    verified: true,
    photo: "/images/review-tom.webp",
    text: "Gave it to my wife for her birthday — she loved flipping through our memories.",
  },
];

const textReviews = [
  {
    name: "Makeba",
    date: "02/08/2026",
    rating: 5,
    verified: true,
    text: "Beautiful product just as advertised. My daughter was thrilled to see her photos turned into coloring pages. Will definitely order again.",
  },
  {
    name: "Karina F.",
    date: "01/28/2026",
    rating: 5,
    verified: true,
    text: "Very happy with my order! The book arrived quickly and the print quality exceeded my expectations. Such a unique and personal gift idea.",
  },
  {
    name: "Paul H",
    date: "01/29/2026",
    rating: 5,
    verified: true,
    text: "Fun project to have someone do. I gave it to my wife for her birthday and she absolutely loved flipping through the pages seeing our memories as line art.",
  },
];

const Stars = ({ count, className = "w-4 h-4" }: { count: number; className?: string }) => (
  <div className="flex">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`${className} ${i < count ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
      />
    ))}
  </div>
);

/**
 * Photo-first review wall: customer photos lead, verified badges throughout.
 */
const CustomerReviewsSectionV2 = () => {
  return (
    <section className="py-12 container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
      <div className="text-center mb-8">
        <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Real Books, Real Customers
        </h3>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Stars count={5} />
          <span className="inline-flex items-center gap-1 text-primary font-medium">
            <Camera className="w-3.5 h-3.5" /> Real customer photos &amp; words
          </span>
        </div>
      </div>

      {/* Photo review grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {photoReviews.map((r) => (
          <figure key={r.name} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
            <div className="aspect-square bg-secondary">
              <img
                src={r.photo}
                alt={`${r.name}'s Piccoload book`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <figcaption className="p-3 flex flex-col gap-1.5 flex-1">
              <div className="flex items-center justify-between">
                <Stars count={r.rating} className="w-3 h-3" />
                {r.verified && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-medium">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground leading-snug flex-1">{r.text}</p>
              <p className="text-[11px] text-muted-foreground font-medium">
                {r.name}, {r.location}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Text reviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {textReviews.map((review) => (
          <div key={review.name} className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{review.name}</span>
                {review.verified && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{review.date}</span>
            </div>
            <Stars count={review.rating} />
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{review.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CustomerReviewsSectionV2;
