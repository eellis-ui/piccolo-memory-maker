import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Medal } from "lucide-react";

const gridImages = [
  { src: "/images/hero-grid-1.png", alt: "Coloring book open on cozy bed with tea" },
  { src: "/images/hero-grid-2.png", alt: "Pencils in a mesh holder on desk" },
  { src: "/images/hero-grid-3.png", alt: "Piccoload coloring book with pens on glass table" },
  { src: "/images/hero-grid-4.png", alt: "Coloured pencil drawing of a ginger cat" },
  { src: "/images/hero-grid-5.png", alt: "Piccoload book cover held in hand" },
  { src: "/images/hero-grid-6.png", alt: "Before and after photo to line art comparison" },
  { src: "/images/hero-grid-7.png", alt: "Open coloring book on wooden table with pens and phone" },
  { src: "/images/hero-grid-8.png", alt: "Woman unwrapping coloring book gift at Christmas" },
  { src: "/images/hero-grid-9.png", alt: "Coloring book page with felt tip pens" },
];

const HeroSection = () => {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column */}
          <div className="space-y-8">
            {/* Review badge */}
            <div className="inline-flex items-center gap-2.5 bg-foreground text-background rounded-lg px-4 py-2.5">
              <Medal className="w-5 h-5 text-amber-400" />
              <div className="text-left">
                <p className="text-[10px] font-semibold leading-none text-amber-400">Rated 5 star</p>
                <p className="text-sm font-medium leading-tight">Based on 100+ Reviews</p>
              </div>
            </div>

            {/* Heading */}
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-semibold text-foreground leading-[1.05] tracking-tight uppercase">
              Big Memories.<br />
              Little Lines.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-foreground/70 max-w-lg leading-relaxed">
              Your favourite photos, transformed into hand-drawn line art, and
              bound into a Personalized colouring book you'll treasure forever.
            </p>

            {/* CTA */}
            <Button asChild size="lg" className="rounded-lg px-8 py-6 text-base font-semibold">
              <Link to="/pricing">
                Create My Book
              </Link>
            </Button>
          </div>

          {/* Right column - 3x3 image grid */}
          <div className="grid grid-cols-3 gap-[6px]">
            {gridImages.map((img, i) => (
              <div key={i} className="aspect-[10/8] overflow-hidden rounded-lg">
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  loading={i < 3 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
