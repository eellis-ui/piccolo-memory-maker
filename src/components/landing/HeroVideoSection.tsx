import { Play } from "lucide-react";
import { useState } from "react";
import { GreenSplash, PeachSplash } from "./ColorSplash";

const HeroVideoSection = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section className="relative py-20 bg-cream overflow-hidden">
      <GreenSplash size={160} className="top-8 right-[5%] opacity-30" />
      <PeachSplash size={140} className="bottom-8 left-[5%] opacity-30" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
            See Piccoload in Action
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Watch how your photos transform into beautiful coloring pages
          </p>
        </div>

        {/* Main video area */}
        <div className="max-w-4xl mx-auto">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-foreground/5 border border-border shadow-soft-lg">
            {/* Placeholder – replace src with your actual video URL */}
            <video
              className="w-full h-full object-cover"
              poster="/placeholder.svg"
              controls={isPlaying}
              playsInline
              onPlay={() => setIsPlaying(true)}
            >
              {/* Add your video source here */}
              {/* <source src="/videos/piccoload-demo.mp4" type="video/mp4" /> */}
              Your browser does not support the video tag.
            </video>

            {/* Play overlay */}
            {!isPlaying && (
              <button
                onClick={() => {
                  const video = document.querySelector<HTMLVideoElement>(
                    "#hero-video"
                  );
                  if (video) {
                    video.play();
                    setIsPlaying(true);
                  }
                }}
                className="absolute inset-0 flex items-center justify-center bg-foreground/10 backdrop-blur-[2px] transition-all hover:bg-foreground/20 group"
                aria-label="Play video"
              >
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-soft-lg group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-primary-foreground ml-1" />
                </div>
              </button>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Upload your video or replace the placeholder above to showcase your product
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroVideoSection;
