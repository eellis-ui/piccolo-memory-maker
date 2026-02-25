import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const LifestyleBanner = () => {
  return (
    <section className="w-full bg-foreground text-background py-16 md:py-20">
      <div className="container mx-auto px-4 text-center space-y-6">
        <p className="text-sm tracking-[0.3em] uppercase opacity-70">
          Limited Time Only
        </p>
        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl uppercase leading-tight">
          Spring Sale
        </h2>
        <p className="text-lg sm:text-xl md:text-2xl font-display uppercase tracking-wide">
          Up to <span className="text-amber-400">40% Off</span> All Books
        </p>
        <p className="text-sm sm:text-base opacity-70 max-w-md mx-auto">
          Turn your favourite spring memories into a personalised colouring book — at our best price of the year.
        </p>
        <Button
          asChild
          size="lg"
          className="rounded-lg px-10 py-6 text-base font-semibold bg-background text-foreground hover:bg-background/90 mt-2"
        >
          <Link to="/pricing">Shop Now</Link>
        </Button>
      </div>
    </section>
  );
};

export default LifestyleBanner;
