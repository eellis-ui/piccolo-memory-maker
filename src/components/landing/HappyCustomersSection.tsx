import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

const reviews = [
  {
    name: "Ellie",
    title: "Love it so much",
    text: "Absolutely love this gift idea, it makes coloring so much more personal and fun!! My sister had her first baby so i got her one after her daughter turned 1 and she loved how this turned out - was such a cute surprise",
    stars: 5,
    avatar: "/images/review-ellie.png",
  },
  {
    name: "Matilda",
    title: "Exactly what I didn't know I needed.",
    text: "My boyfriend bought this for me during a really rough patch. It was so comforting in a way I wasn't expecting. It's like having a little visual journal of joy, and spending time coloring each page was grounding. It was a treat well received 🥹",
    stars: 5,
    avatar: "/images/review-matilda.png",
  },
  {
    name: "Georgie",
    title: "Most thoughtful gift ever",
    text: "I ordered a Piccolo'd book for my mom's birthday with all her favorite family photos. She cried happy tears when she saw the line drawings. Honestly the most thoughtful gift I've ever given.",
    stars: 5,
    avatar: "/images/review-georgie.png",
  },
  {
    name: "Ewan",
    title: "The best gift ever",
    text: "I bought this as an anniversary present and it was perfect. We spent the evening coloring our memories together. So unique compared to flowers or chocolates.",
    stars: 5,
    avatar: "/images/review-ewan.png",
  },
  {
    name: "Tom",
    title: "Quality!",
    text: "I wasn't sure what to expect, but the quality blew me away. Thick paper, clear drawings, and the photos are transformed beautifully. Definitely ordering again for Christmas gifts.",
    stars: 5,
    avatar: "/images/review-tom.png",
  },
];

const HappyCustomersSection = () => {
  const [startIndex, setStartIndex] = useState(0);

  const canGoBack = startIndex > 0;
  const canGoForward = startIndex < reviews.length - 3;

  const prev = () => setStartIndex((i) => Math.max(0, i - 1));
  const next = () => setStartIndex((i) => Math.min(reviews.length - 3, i + 1));

  // Show 1 on mobile, 2 on md, 3 on lg
  const visibleReviews = reviews.slice(startIndex, startIndex + 3);

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground uppercase">
            Happy Customers
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              disabled={!canGoBack}
              className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous reviews"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              disabled={!canGoForward}
              className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next reviews"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleReviews.map((review, i) => (
            <div
              key={startIndex + i}
              className="border border-border rounded-lg p-6 bg-cream flex flex-col h-full transition-transform duration-200 hover:scale-105"
            >
              {/* Top row: name + stars + avatar */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-foreground text-xs">
                    {review.name}
                  </p>
                  <div className="flex items-center gap-0.5 mt-1">
                    {Array.from({ length: review.stars }).map((_, s) => (
                      <Star
                        key={s}
                        className="w-3.5 h-3.5 fill-foreground text-foreground"
                      />
                    ))}
                  </div>
                </div>
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm flex-shrink-0 overflow-hidden">
                  {review.avatar ? (
                    <img src={review.avatar} alt={review.name} className="w-full h-full object-cover" />
                  ) : (
                    review.name.charAt(0)
                  )}
                </div>
              </div>

              {/* Review title */}
              <h3 className="font-sans font-bold text-foreground text-base mb-2">
                {review.title}
              </h3>

              {/* Review text */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {review.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HappyCustomersSection;
