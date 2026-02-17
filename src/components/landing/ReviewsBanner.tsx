import { Star } from "lucide-react";

const reviews = [
  { name: "Sarah M.", text: "My daughter absolutely loved it! The best birthday gift ever." },
  { name: "James R.", text: "Incredible quality — the line art looks amazing." },
  { name: "Emily T.", text: "So easy to make. Ordered 3 for my kids and they can't stop coloring!" },
  { name: "David K.", text: "A truly unique gift. Everyone at the party wanted one." },
  { name: "Laura P.", text: "Beautiful paper quality and the cover turned out perfect." },
  { name: "Mike W.", text: "Bought one for my wife's birthday — she cried happy tears!" },
  { name: "Jessica H.", text: "Fast delivery and stunning results. Will order again." },
  { name: "Chris B.", text: "Turned our vacation photos into the coolest coloring book." },
];

const ReviewsBanner = () => {
  return (
    <div className="bg-foreground text-background overflow-hidden py-2.5">
      <div className="flex animate-[scroll_30s_linear_infinite] w-max">
        {[...reviews, ...reviews].map((review, i) => (
          <div key={i} className="flex items-center gap-2 px-6 whitespace-nowrap">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} className="w-3 h-3 fill-current text-yellow-400" />
              ))}
            </div>
            <span className="text-xs font-sans">
              "{review.text}"
            </span>
            <span className="text-xs text-background/50">— {review.name}</span>
            <span className="text-background/20 mx-4">•</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsBanner;
