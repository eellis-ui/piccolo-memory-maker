import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useBasket, UNIQUE_PHOTOS_PRICE } from "@/contexts/BasketContext";
import { toast } from "sonner";
import ProductImageGallery from "./ProductImageGallery";
import CountdownTimer from "./CountdownTimer";
import CustomerTestimonials from "./CustomerTestimonials";
import TrustBadges from "./TrustBadges";

const physicalPricing = [
  {
    quantity: 1,
    price: 35,
    originalPrice: 45,
    savingsPercent: "22%",
    label: null as string | null,
    savingsBadge: null as string | null,
  },
  {
    quantity: 2,
    price: 59.5,
    originalPrice: 90,
    savingsPercent: "34%",
    savingsBadge: "SAVE $30.50",
    label: "MOST POPULAR",
  },
  {
    quantity: 3,
    price: 69.3,
    originalPrice: 135,
    savingsPercent: "49%",
    savingsBadge: "SAVE $65.70",
    label: "BEST VALUE",
  },
];

const featureBullets = [
  { emoji: "📸", text: "Each book contains 20 Custom Photo Pages" },
  { emoji: "❤️", text: "Personalized Line Art from Your Own Photos" },
  { emoji: "🎁", text: "A Thoughtful Gift for Any Occasion" },
  { emoji: "🧘", text: "Designed for Calm, Creativity & Connection" },
];

const faqs = [
  { question: "What quality and materials can I expect?", answer: "We use premium 170gsm uncoated paper, perfect for coloring with pencils, pens, or markers. The cover is printed on thick 350gsm card stock. Every book is professionally printed and bound to last." },
  { question: "How long will it take from ordering to delivery?", answer: "Books are printed and dispatched within 3–5 business days. US delivery typically takes an additional 3–5 business days, so you can expect your book within 1–2 weeks of ordering." },
  { question: "What kind of photos work best?", answer: "Photos with clear subjects and good contrast work best — think portraits, pets, landmarks, and nature shots. Avoid very dark, blurry, or overly busy images for the best line-art results." },
  { question: "What size is the book?", answer: "Each book is a generous 8.3\" × 11.7\" (A4) format — close to standard US letter size. The large pages give you plenty of room to color." },
  { question: "What if I order multiple books?", answer: "By default, each additional book contains the same 20 images. If you'd like each book to have different photos, you can add the 'Unique Photos' add-on for $4.99." },
];

const PricingSection = () => {
  const [selectedQuantity, setSelectedQuantity] = useState(2);
  const { setQuantity, uniquePhotos, setUniquePhotos } = useBasket();
  const navigate = useNavigate();

  const selectedTier = physicalPricing.find((t) => t.quantity === selectedQuantity)!;
  const totalPrice = selectedTier.price + (uniquePhotos && selectedQuantity > 1 ? UNIQUE_PHOTOS_PRICE : 0);

  const handleAddToBasket = () => {
    setQuantity(selectedQuantity);
    toast.success(`${selectedQuantity} coloring ${selectedQuantity === 1 ? "book" : "books"} added!`);
    navigate("/builder");
  };

  const currentMonth = new Date().toLocaleString("default", { month: "long" }).toUpperCase();

  return (
    <section className="py-12 md:py-20 bg-cream">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Left — Image Gallery */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductImageGallery />
          </div>

          {/* Right — Product Details */}
          <div>
            {/* Star rating */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">4.95 out of 5 — 3,952 reviews</span>
            </div>

            {/* Title */}
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-5 uppercase tracking-wide">
              Personalised Coloring Book
            </h1>

            {/* Feature bullets */}
            <ul className="space-y-2.5 mb-6">
              {featureBullets.map((f) => (
                <li key={f.text} className="flex items-start gap-2.5 text-sm text-foreground">
                  <span className="text-base leading-none mt-0.5">{f.emoji}</span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              A one-of-a-kind coloring book made from your personal photos,
              transformed into beautiful black-and-white line art, ready to color,
              gift, or keep. Perfect for birthdays, anniversaries, memory books, or
              moments that matter.
            </p>

            {/* Sale divider */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-cream px-4 text-xs font-bold uppercase tracking-widest text-foreground">
                  {currentMonth} Sale — Final Day!
                </span>
              </div>
            </div>

            {/* Countdown timer */}
            <div className="mb-6">
              <CountdownTimer />
            </div>

            {/* Pricing tiers */}
            <div className="space-y-3 mb-5">
              {physicalPricing.map((tier) => {
                const isSelected = selectedQuantity === tier.quantity;
                return (
                  <button
                    key={tier.quantity}
                    onClick={() => setSelectedQuantity(tier.quantity)}
                    className={`w-full relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:border-muted-foreground/30"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        isSelected ? "border-primary" : "border-muted-foreground/40"
                      }`}
                    >
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">
                          {tier.quantity} Coloring {tier.quantity === 1 ? "Book" : "Books"}
                        </span>
                        {tier.savingsBadge && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-md">
                            {tier.savingsBadge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-primary font-medium mt-0.5">
                        You save {tier.savingsPercent}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-lg text-foreground">${tier.price.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground line-through">${tier.originalPrice.toFixed(2)}</p>
                    </div>

                    {tier.label && (
                      <Badge className="absolute -top-2.5 right-4 bg-foreground text-background text-[10px] px-2 py-0.5 rounded-md">
                        {tier.label}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Unique photos upsell */}
            {selectedQuantity > 1 && (
              <label className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-background mb-5 cursor-pointer">
                <Checkbox
                  checked={uniquePhotos}
                  onCheckedChange={(checked) => setUniquePhotos(!!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    Have 20 different photos in each book!{" "}
                    <span className="text-primary font-bold">+${UNIQUE_PHOTOS_PRICE.toFixed(2)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    If unticked, all books in the bundle will contain the same photos
                  </p>
                </div>
              </label>
            )}

            {/* Add to basket */}
            <Button onClick={handleAddToBasket} className="w-full rounded-2xl py-6 text-base font-semibold mb-5" size="lg">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Start Creating — ${totalPrice.toFixed(2)}
            </Button>

            {/* Trust badges */}
            <div className="mb-8">
              <TrustBadges />
            </div>

            {/* Process note */}
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-10">
              <p className="text-sm text-foreground leading-relaxed">
                <strong>Next step:</strong> Upload your photos, preview each line-art conversion, customize your cover, and checkout — all in our easy builder.
              </p>
            </div>

            {/* FAQ accordion */}
            <div className="mb-4">
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                Frequently Asked Questions
              </h3>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-sm font-medium">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Testimonials */}
            <CustomerTestimonials />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
