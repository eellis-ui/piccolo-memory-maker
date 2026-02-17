import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center bg-cream overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-2 bg-primary/20 text-foreground rounded-full text-sm font-medium mb-6 animate-fade-in">
            ✨ From pic to pen
          </span>
          
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-foreground leading-tight mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Turn Your Memories Into{" "}
            <span className="text-primary">Beautiful</span>{" "}
            Coloring Books
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Upload your favorite photos and watch them transform into stunning 
            line drawings. Create personalized coloring books that make 
            meaningful gifts for loved ones.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button asChild size="lg" className="rounded-2xl px-8 py-6 text-lg shadow-soft-lg hover:shadow-xl transition-all">
              <Link to="/builder">
                Start Creating
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-2xl px-8 py-6 text-lg">
              <Link to="/how-it-works">
                See How It Works
              </Link>
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-muted-foreground text-sm animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full" />
              Premium quality prints
            </span>
            



            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full" />
              Satisfaction guaranteed
            </span>
          </div>
        </div>
      </div>
    </section>);

};

export default HeroSection;