const HeroVideoSection = () => {
  return (
    <section className="py-16 md:py-24 bg-cream">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left – Lifestyle image */}
          <div className="rounded-lg overflow-hidden aspect-[4/5]">
            <img
              src="/images/lifestyle-book-table.webp"
              alt="Piccoload coloring book on a coffee table in a cozy living room"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Right – Text content */}
          <div className="flex flex-col gap-6 text-center lg:text-left items-center lg:items-start">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground uppercase leading-tight">
              Created From the Moments You Loved the Most
            </h2>

            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Turn your family memories, vacations, and special moments into a one-of-a-kind coloring book. A perfect gift for kids, parents, or anyone who loves to color and create.
            </p>

            <div>
              <h3 className="font-sans font-bold text-foreground text-lg mb-3">
                Why Families Love It
              </h3>
              <ul className="space-y-2 text-muted-foreground text-base">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground flex-shrink-0" />
                  Easy to create, fun to use
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground flex-shrink-0" />
                  Printed on high-quality paper for endless creativity
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground flex-shrink-0" />
                  A meaningful keepsake you'll treasure forever
                </li>
              </ul>
            </div>

            {/* Stats bar */}
            <div className="border-t border-border pt-6 mt-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="font-display text-2xl sm:text-3xl text-foreground uppercase">
                    1 of a Kind
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Each book made to order
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-display text-2xl sm:text-3xl text-foreground uppercase">
                    94%
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    5 Star Reviews
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-display text-2xl sm:text-3xl text-foreground uppercase">
                    Up to<br className="sm:hidden" /> 20
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Memories per book
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroVideoSection;
