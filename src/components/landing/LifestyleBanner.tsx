import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const LifestyleBanner = () => {
  return (
    <section className="relative w-full">
      <div className="relative w-full min-h-[50vh] md:min-h-[60vh] overflow-hidden">
        <img
          src="/images/spring-sale-bg.jpg"
          alt="Person cozy with a coloring book and tea"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-foreground/60" />
        {/* Content */}
        <div className="relative z-10 flex items-center justify-center h-full min-h-[50vh] md:min-h-[60vh] px-4">
          <div className="text-center space-y-5">
            <p className="text-xs sm:text-sm tracking-[0.3em] uppercase text-background/70">
              Limited Time Only
            </p>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl uppercase leading-tight text-background">
              Spring Sale
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl font-display uppercase tracking-wide text-background">
              Up to <span className="text-[#A8C686] drop-shadow-[0_0_12px_rgba(168,198,134,0.6)]">40% Off</span> All Books
            </p>
            <p className="text-sm sm:text-base text-background/70 max-w-md mx-auto">
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
        </div>
      </div>
    </section>
  );
};

export default LifestyleBanner;
