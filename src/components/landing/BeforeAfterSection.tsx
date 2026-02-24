import { ArrowRight } from "lucide-react";
import { BlueSplash, PinkSplash } from "./ColorSplash";

interface ComparisonItem {
  id: string;
  label: string;
  beforeSrc: string;
  afterSrc: string;
}

// Replace these placeholders with your real before/after images
const comparisons: ComparisonItem[] = [
  {
    id: "1",
    label: "Family Portrait",
    beforeSrc: "/placeholder.svg",
    afterSrc: "/placeholder.svg",
  },
  {
    id: "2",
    label: "Pet Photo",
    beforeSrc: "/placeholder.svg",
    afterSrc: "/placeholder.svg",
  },
  {
    id: "3",
    label: "Vacation Memory",
    beforeSrc: "/placeholder.svg",
    afterSrc: "/placeholder.svg",
  },
];

const BeforeAfterSection = () => {
  return (
    <section className="relative py-20 bg-background overflow-hidden">
      <BlueSplash size={130} className="top-12 left-[6%] opacity-30" />
      <PinkSplash size={120} className="bottom-12 right-[6%] opacity-30" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
            Before &amp; After
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See how everyday photos become stunning coloring pages
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {comparisons.map((item) => (
            <div
              key={item.id}
              className="bg-cream rounded-lg p-6 shadow-soft hover:shadow-soft-lg transition-all"
            >
              <p className="font-display text-lg font-semibold text-foreground mb-4 text-center">
                {item.label}
              </p>

              <div className="flex items-center gap-3">
                {/* Before */}
                <div className="flex-1">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-foreground/5 border border-border">
                    <img
                      src={item.beforeSrc}
                      alt={`${item.label} — original photo`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Original
                  </p>
                </div>

                <ArrowRight className="w-5 h-5 text-primary shrink-0" />

                {/* After */}
                <div className="flex-1">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-foreground/5 border border-border">
                    <img
                      src={item.afterSrc}
                      alt={`${item.label} — line-art conversion`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Line Art
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BeforeAfterSection;
