import { Heart } from "lucide-react";
import { PinkSplash, LavenderSplash } from "./ColorSplash";

const StorySection = () => {
  return (
    <section className="relative bg-white overflow-hidden">
      {/* Banner Image */}
      <div className="relative w-full h-[30vh] md:h-[45vh] overflow-hidden">
        <img
          src="/images/about-banner.png"
          alt="Mother and daughter hiking together through green mountains"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold text-white">
            Our Story
          </h2>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="prose prose-lg mx-auto text-center">
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              At Piccolo'd, we believe that the most meaningful gifts come from the heart - and nothing is more personal than your own cherished memories, turned into something you can hold, colour, and treasure forever.
            </p>
            
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Our story began during a challenging chapter. While recovering from a chronic illness and spending long days in hospital, coloring became more than just a pastime - it was a comforting escape, a way to focus the mind and find calm in the middle of uncertainty. From that experience, the idea for Piccolo'd was born: to help others find joy, relaxation, and connection through personalized coloring books.
            </p>
            
            <p className="text-muted-foreground text-lg leading-relaxed">
              Today, we transform your favorite photos - from silly selfies to treasured family moments - into beautiful line art, bound together in a bespoke coloring book. Whether it's a sentimental gift for someone special, a therapeutic activity to ease anxiety, or a creative keepsake for children, every page tells a story that's uniquely yours.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-8 text-center">
            <div>
              <p className="font-display text-3xl font-semibold text-primary">1000+</p>
              <p className="text-muted-foreground text-sm">Books Created</p>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold text-primary">50,000+</p>
              <p className="text-muted-foreground text-sm">Photos Transformed</p>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold text-primary">4.9★</p>
              <p className="text-muted-foreground text-sm">Customer Rating</p>
            </div>
          </div>
        </div>
      </div>
    </section>);

};

export default StorySection;