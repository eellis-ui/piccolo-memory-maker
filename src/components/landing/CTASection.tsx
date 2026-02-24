import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CoralSplash, BlueSplash } from "./ColorSplash";

const CTASection = () => {
  return (
    <section className="relative py-20 bg-primary/10 overflow-hidden">
      <CoralSplash size={130} className="top-6 left-[6%] opacity-40" />
      <BlueSplash size={110} className="bottom-8 right-[8%] opacity-40" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
            Ready to Create Something Special?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Transform your favorite photos into a personalized coloring book 
            in just a few minutes. It's the perfect gift for any occasion.
          </p>
          
          <Button asChild size="lg" className="rounded-lg px-8 py-6 text-lg shadow-soft-lg">
            <Link to="/pricing">
              Start Creating Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          
          <p className="mt-6 text-sm text-muted-foreground">
            No account required • Preview before you pay
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
