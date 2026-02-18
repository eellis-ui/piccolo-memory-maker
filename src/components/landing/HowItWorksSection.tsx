import { Upload, Sparkles, BookOpen, Gift } from "lucide-react";
import { GreenSplash, PinkSplash, BlueSplash, PeachSplash } from "./ColorSplash";

const steps = [
  {
    icon: Upload,
    title: "Upload Photos",
    description: "Select your favourite memories. Drag and drop up to 20 photos to include in your book.",
  },
  {
    icon: Sparkles,
    title: "Magic Conversion",
    description: "Our AI transforms each photo into a beautiful, high-quality line drawing ready for coloring.",
  },
  {
    icon: BookOpen,
    title: "Approve & Design",
    description: "Review each page, make adjustments, and design your custom front cover.",
  },
  {
    icon: Gift,
    title: "Receive Your Book",
    description: "We print and deliver your personalized coloring book, beautifully packaged.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Create your personalized coloring book in four simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative group"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-border" />
              )}
              
              <div className="bg-cream rounded-3xl p-8 text-center hover:shadow-soft-lg transition-all duration-300">
                {/* Step number */}
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold mb-4">
                  {index + 1}
                </span>
                
                {/* Icon with color splash */}
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-background shadow-soft mb-6">
                  {index === 0 && <GreenSplash size={80} className="-top-3 -left-3" />}
                  {index === 1 && <PinkSplash size={80} className="-top-3 -right-3" />}
                  {index === 2 && <BlueSplash size={80} className="-top-3 -left-3" />}
                  {index === 3 && <PeachSplash size={80} className="-top-3 -right-3" />}
                  <step.icon className="w-8 h-8 text-primary relative z-10" />
                </div>
                
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
