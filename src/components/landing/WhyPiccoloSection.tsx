import { useState } from "react";
import { ChevronDown } from "lucide-react";

const items = [
  {
    number: "01",
    title: "Premium Quality Printing",
    description:
      "Crisp, high-resolution line work printed on smooth, durable paper — made to be colored, cherished, and kept.",
  },
  {
    number: "02",
    title: "Custom-Made for Every Order",
    description:
      "No templates. No repeats. Each book is made from your own photos, creating a completely unique keepsake.",
  },
  {
    number: "03",
    title: "Perfect Gift for Any Occasion",
    description:
      'From birthdays to baby showers, anniversaries to "just because" — it\'s thoughtful, personal, and truly one of a kind. Who wouldn\'t want to find one of these under their Christmas tree?',
  },
];

const WhyPiccoloSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(2);

  return (
    <section className="py-20 bg-cream">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column */}
          <div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground mb-12 uppercase">
              Beautifully Created for Long Term Treasuring
            </h2>

            <div className="space-y-0">
              {items.map((item, index) => (
                <div key={item.number}>
                  <button
                    onClick={() =>
                      setOpenIndex(openIndex === index ? null : index)
                    }
                    className="w-full text-left py-6 flex items-start gap-4 group"
                  >
                    <span className="text-sm text-muted-foreground font-medium mt-1">
                      {item.number}.
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl sm:text-2xl font-semibold text-foreground">
                          {item.title}
                        </h3>
                        <ChevronDown
                          className={`w-5 h-5 text-muted-foreground transition-transform duration-300 shrink-0 ml-4 ${
                            openIndex === index ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          openIndex === index
                            ? "max-h-40 opacity-100 mt-3"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </button>
                  <div className="h-px bg-border" />
                </div>
              ))}
            </div>
          </div>

          {/* Right column - image */}
          <div className="relative">
            <img
              src="/images/why-piccolo-family.webp"
              alt="A happy family laughing together"
              className="w-full rounded-lg object-cover aspect-[4/5]"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyPiccoloSection;
