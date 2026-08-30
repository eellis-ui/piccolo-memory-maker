import { Star, CheckCircle } from "lucide-react";

// Hand-picked customer quotes. Deliberately NO aggregate count or star
// distribution: those were hardcoded numbers no review platform backs up,
// and an inflated claim a buyer can't verify costs more trust than a small
// set of real reviews earns. When a review platform (Judge.me / Okendo /
// Trustpilot) is wired in, this section should render its live feed instead.
const reviews = [
  {
    name: "Makeba",
    date: "02/08/2026",
    rating: 5,
    verified: true,
    text: "Beautiful product just as advertised. My daughter was thrilled to see her photos turned into coloring pages. Will definitely order again.",
  },
  {
    name: "Paul H",
    date: "01/29/2026",
    rating: 5,
    verified: true,
    text: "Fun project to have someone do. I gave it to my wife for her birthday and she absolutely loved flipping through the pages seeing our memories as line art.",
  },
  {
    name: "Karen Ryan",
    date: "01/28/2026",
    rating: 5,
    verified: false,
    text: "Loved the product. Great quality and fast shipping. The coloring book turned out beautifully.",
  },
  {
    name: "Karina F.",
    date: "01/28/2026",
    rating: 5,
    verified: true,
    text: "Very happy with my order! The book arrived quickly and the print quality exceeded my expectations. Such a unique and personal gift idea.",
  },
];

const Stars = ({ count }: { count: number }) => (
  <div className="flex">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < count ? "fill-foreground text-foreground" : "text-muted-foreground/30"}`}
      />
    ))}
  </div>
);

const CustomerReviewsSection = () => {
  return (
    <section className="py-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
      <h3 className="font-display text-xl font-semibold text-foreground mb-2 text-center">
        What Our Customers Say
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Real orders, real families — from the US and the UK
      </p>

      {/* Individual reviews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.map((review, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-5">
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

export default CustomerReviewsSection;
