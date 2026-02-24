import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Award } from "lucide-react";

const gridImages = [
  { src: "/images/hero-grid-1.jpg", alt: "Personalized coloring book with family portrait" },
  { src: "/images/hero-grid-2.jpg", alt: "Colored pencils and coloring book workspace" },
  { src: "/images/hero-grid-3.jpg", alt: "Cat with personalized coloring book" },
  { src: "/images/hero-grid-4.jpg", alt: "Hands coloring a personalized page" },
  { src: "/images/hero-grid-5.jpg", alt: "Line art landscape in coloring book" },
  { src: "/images/hero-grid-6.jpg", alt: "Detailed coloring book on desk" },
  { src: "/images/hero-grid-7.jpg", alt: "Coloring book on green sofa" },
  { src: "/images/hero-grid-8.jpg", alt: "Kids enjoying personalized coloring book" },
  { src: "/images/hero-grid-9.jpg", alt: "Piccoload coloring book product" },
];

const HeroSection = () => {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column */}
          <div className="space-y-8">
            {/* Review badge */}
            <div className="inline-flex items-center gap-2.5 bg-foreground text-background rounded-full px-4 py-2.5">
              <Award className="w-5 h-5 text-amber-400" />
              <div className="text-left">
                <p className="text-[10px] font-semibold leading-none text-amber-400">Rated 5 star</p>
                <p className="text-sm font-medium leading-tight">Based on 100+ Reviews</p>
              </div>
            </div>

            {/* Heading */}
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-semibold text-foreground leading-[1.05] tracking-tight">
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
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {gridImages.map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-xl">
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
