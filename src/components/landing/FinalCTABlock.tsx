import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

interface FinalCTABlockProps {
  onCtaClick: () => void;
}

const FinalCTABlock = ({ onCtaClick }: FinalCTABlockProps) => {
  return (
    <section className="pt-8 pb-16 md:pt-12 md:pb-24 bg-background">
      <div className="container mx-auto px-4 text-center max-w-2xl">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">
          Ready to Create Something Special?
        </h2>
        <p className="text-muted-foreground mb-8 text-sm sm:text-base leading-relaxed">
          Turn your favorite photos into a one-of-a-kind coloring book. It only takes a few minutes.
        </p>
        <Button onClick={onCtaClick} size="lg" className="rounded-lg py-6 px-10 text-base font-semibold">
          <ShoppingCart className="w-5 h-5 mr-2" />
          Start Creating Your Book
        </Button>
      </div>
    </section>
  );
};

export default FinalCTABlock;
