import { ArrowRight } from "lucide-react";
import { comparisonSrcSet, COMPARISON_SIZES } from "@/lib/images";

const comparisons = [
  { label: "Family Portrait", before: "/images/before-family.webp", after: "/images/after-family.webp" },
  { label: "Pet Photo", before: "/images/before-pet.webp", after: "/images/after-pet.webp" },
  { label: "Vacation Memory", before: "/images/before-vacation.webp", after: "/images/after-vacation.webp" },
];

const BeforeAfterStrip = () => {
  return (
    <section className="pt-4 pb-12 md:pt-6 md:pb-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
            See the Magic
          </h2>
          <p className="text-sm text-muted-foreground">
            Your photos transformed into stunning coloring pages
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {comparisons.map((item) => (
            <div key={item.label} className="text-center">
              <p className="font-display text-sm font-semibold text-foreground mb-3">{item.label}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden border border-border">
                    <img src={item.before} srcSet={comparisonSrcSet(item.before)} sizes={COMPARISON_SIZES} alt={`${item.label} original`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Original</p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden border border-border">
                    <img src={item.after} srcSet={comparisonSrcSet(item.after)} sizes={COMPARISON_SIZES} alt={`${item.label} line art`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Line Art</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BeforeAfterStrip;
