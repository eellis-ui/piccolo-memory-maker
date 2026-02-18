import { Heart } from "lucide-react";
import { PinkSplash, LavenderSplash } from "./ColorSplash";

const StorySection = () => {
  return (
    <section className="relative py-20 bg-background overflow-hidden">
      <PinkSplash size={150} className="top-10 right-[8%] opacity-40" />
      <LavenderSplash size={120} className="bottom-10 left-[5%] opacity-40" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-6">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Our Story
            </h2>
          </div>

          <div className="prose prose-lg mx-auto text-center">
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Piccoload was born during a hospital stay, where coloring became a 
              source of calm and comfort during recovery. What started as a personal 
              coping mechanism transformed into something bigger—a way to turn 
              cherished memories into meaningful, therapeutic art.
            </p>
            
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              We believe that coloring isn't just for children. It's a mindful 
              practice that helps us slow down, be present, and reconnect with 
              moments that matter. By transforming your photos into beautiful 
              line drawings, we help you relive your happiest memories in a 
              completely new way.
            </p>
            
            <p className="text-muted-foreground text-lg leading-relaxed">
              Every Piccoload book is made with love in the USA, using premium 
              materials that honor the memories within. Whether it's a gift for 
              a loved one or a keepsake for yourself, each book is a unique 
              celebration of life's precious moments.
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
    </section>
  );
};

export default StorySection;
