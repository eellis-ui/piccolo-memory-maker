const LifestyleBanner = () => {
  return (
    <section className="relative w-full">
      <div className="relative w-full h-[50vh] md:h-[70vh] overflow-hidden">
        <img
          src="/images/banner-bed.jpg"
          alt="Woman cozy in bed with white sheets"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Text overlay */}
        <div className="absolute inset-0 flex items-end justify-center pb-[8%]">
          <div className="text-center space-y-1 md:space-y-2">
            <p className="font-display text-base sm:text-lg md:text-2xl lg:text-3xl uppercase text-foreground">
              Your Calm
            </p>
            <p className="font-display text-base sm:text-lg md:text-2xl lg:text-3xl uppercase text-foreground">
              Your People
            </p>
            <p className="font-display text-base sm:text-lg md:text-2xl lg:text-3xl uppercase text-foreground">
              Your Story
            </p>
            <p className="font-display text-2xl sm:text-3xl md:text-5xl lg:text-6xl uppercase mt-2 md:mt-4">
              <span className="text-foreground">In </span>
              <span className="text-[hsl(340,80%,55%)]">C</span>
              <span className="text-[hsl(270,60%,55%)]">O</span>
              <span className="text-[hsl(25,90%,55%)]">L</span>
              <span className="text-[hsl(190,80%,50%)]">O</span>
              <span className="text-[hsl(120,60%,45%)]">R</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LifestyleBanner;
