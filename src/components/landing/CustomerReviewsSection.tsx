import { Star, CheckCircle } from "lucide-react";

const overallRating = 4.95;
const totalReviews = 3952;

const starDistribution = [
  { stars: 5, count: 3814 },
  { stars: 4, count: 85 },
  { stars: 3, count: 52 },
  { stars: 2, count: 1 },
  { stars: 1, count: 0 },
];

const reviews = [
  {
    name: "Anonymous",
    date: "02/23/2026",
    rating: 5,
    verified: true,
    text: "These are absolutely amazing! We love them so much. The quality is fantastic and the line art is so detailed. Already ordered a second one!",
  },
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
        className={`w-4 h-4 ${i < count ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
      />
    ))}
  </div>
);

const CustomerReviewsSection = () => {
  const maxCount = Math.max(...starDistribution.map((d) => d.count));

  return (
    <section className="py-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
      <h3 className="font-display text-xl font-semibold text-foreground mb-6 text-center">
        Customer Reviews
      </h3>

      {/* Summary */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
          <div className="text-center sm:text-left">
            <div className="text-3xl font-bold text-foreground">{overallRating}</div>
            <Stars count={5} />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-primary" />
            Based on {totalReviews.toLocaleString()} reviews
          </div>
        </div>

        {/* Star distribution bars */}
        <div className="space-y-2">
          {starDistribution.map((d) => (
            <div key={d.stars} className="flex items-center gap-3 text-sm">
              <span className="w-12 text-right text-muted-foreground">{d.stars} star</span>
              <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${maxCount ? (d.count / maxCount) * 100 : 0}%` }}
                />
              </div>
              <span className="w-12 text-muted-foreground text-right">{d.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Individual reviews */}
      <div className="space-y-4">
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
