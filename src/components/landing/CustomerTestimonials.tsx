const testimonials = [
  {
    name: "Georgie",
    title: "Birthday Gift",
    text: "I gave this to my mum for her birthday and she absolutely loved it. The line art was so detailed and beautiful — she's already started coloring!",
  },
  {
    name: "Ewan",
    title: "Anniversary Surprise",
    text: "Made one for our 10th anniversary with photos from over the years. My wife cried when she opened it. Truly one of a kind.",
  },
  {
    name: "Tom",
    title: "For the Kids",
    text: "My kids went crazy for this! They loved seeing their own photos turned into coloring pages. We've ordered three more for friends.",
  },
  {
    name: "Ellie",
    title: "Pet Portraits",
    text: "I uploaded photos of our dog and the line art was incredible. It captured every little detail. Such a unique keepsake!",
  },
  {
    name: "Matilda",
    title: "Travel Memories",
    text: "Used our travel photos from Italy — the results were stunning. It's like a coloring book version of our holiday scrapbook.",
  },
];

const CustomerTestimonials = () => {
  return (
    <section className="py-12">
      <h3 className="font-display text-xl font-semibold text-foreground mb-6 text-center">
        What Our Customers Say
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="min-w-[280px] max-w-[320px] flex-shrink-0 snap-start bg-card border border-border rounded-lg p-5"
          >
            <div className="flex items-center gap-1 mb-2 text-amber-400 text-sm">
              {"★★★★★"}
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">"{t.text}"</p>
            <div>
              <p className="font-semibold text-foreground text-sm">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.title}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CustomerTestimonials;
