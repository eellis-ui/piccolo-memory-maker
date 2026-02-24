import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

const reviews = [
  {
    name: "Ellie",
    title: "Love it so much",
    text: "Absolutely love this gift idea, it makes colouring so much more personal and fun!! My sister had her first baby so i got her one after her daughter turned 1 and she loved how this turned out – was such a cute surprise",
    stars: 5,
  },
  {
    name: "Matilda",
    title: "Exactly what I didn't know I needed.",
    text: "My boyfriend bought this for me during a really rough patch. It was so comforting in a way I wasn't expecting. It's like having a little visual journal of joy, and spending time colouring each page was grounding. It was a treat well received 🥹",
    stars: 5,
  },
  {
    name: "Georgie",
    title: "Most thoughtful gift ever",
    text: "I ordered a Piccolo'd book for my mum's birthday with all her favourite family photos. She cried happy tears when she saw the line drawings. Honestly the most thoughtful gift I've ever given.",
    stars: 5,
  },
  {
    name: "Sophie",
    title: "Perfect for my daughter",
    text: "My 6 year old absolutely loves colouring in pictures of our family holidays. It's become our Sunday morning ritual – she colours while I have my coffee. Such a lovely keepsake.",
    stars: 5,
  },
  {
    name: "James",
    title: "Brilliant anniversary gift",
    text: "Got this for our 5th anniversary with photos from our relationship. My wife was blown away by the detail in each drawing. We've been colouring them in together on date nights!",
    stars: 5,
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
    <section className="py-16 md:py-20 bg-background">
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
              className="border border-border rounded-lg p-6 bg-card flex flex-col"
            >
              {/* Top row: name + stars */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {review.name}
                  </p>
                  <div className="flex items-center gap-0.5 mt-1">
                    {Array.from({ length: review.stars }).map((_, s) => (
                      <Star
                        key={s}
                        className="w-4 h-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Review title */}
              <h3 className="font-semibold text-foreground text-base mb-2">
                {review.title}
              </h3>

              {/* Review text */}
              <p className="text-sm text-muted-foreground leading-relaxed">
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
