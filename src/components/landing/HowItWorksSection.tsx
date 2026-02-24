import { Upload, Sparkles, BookOpen, Gift } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload Photos",
    description: "Choose up to 20 of your favourite photos per book!",
  },
  {
    icon: Sparkles,
    title: "Magic Conversion",
    description: "We transform each photo into a beautiful, high-quality line drawing, ready for coloring!",
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
                <div className="hidden lg:block absolute top-12 left-[60%] w-[70%] border-t-2 border-dashed border-border" />
              )}
              
              <div className="text-center">
                {/* Step number */}
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold mb-4">
                  {index + 1}
                </span>
                
                {/* Icon */}
                <div className="inline-flex items-center justify-center w-16 h-16 mb-6">
                  <step.icon className="w-8 h-8 text-primary" />
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
