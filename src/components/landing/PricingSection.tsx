import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useBasket, UNIQUE_PHOTOS_PRICE, PERSONALIZE_COVER_PRICE } from "@/contexts/BasketContext";
import { toast } from "sonner";
import ProductImageGallery, { type ProductImage } from "./ProductImageGallery";
import CountdownTimer from "./CountdownTimer";
import { storefrontApiRequest } from "@/lib/shopify";
import TrustBadges from "./TrustBadges";
import CustomerReviewsSection from "./CustomerReviewsSection";
import HowItWorksSection from "./HowItWorksSection";
import CatBanner from "./CatBanner";
import InstagramSection from "./InstagramSection";
import GuaranteeBadges from "./GuaranteeBadges";
import BeforeAfterStrip from "./BeforeAfterStrip";
import StickyMobileCTA from "./StickyMobileCTA";
import FinalCTABlock from "./FinalCTABlock";
import { getSaleName } from "@/lib/sale";

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
  { question: "What if something goes wrong – do you offer returns or replacements?", answer: "Because each book is custom-made from your uploaded photos, returns for standard \"change of mind\" are disallowed.\n\nCan I request changes?\n\nYou can make lots of changes throughout the 'creating stage'. You have the chance to choose custom front cover images, personalise the text, choose up to 20 images per book, and review your line art. Once the design is considered approved, no further changes or revisions can be made.\n\nIf you receive a damaged, misprinted or incorrect item, please contact our support team within 14 days of delivery with your order number and a photo of the issue. We will arrange a replacement or refund. If your book is simply no longer wanted, we may not accept a return given the bespoke nature — check our \"Refund Policy\" link for full details." },
  { question: "Can anyone make a Piccoload book, even if they're not tech-savvy?", answer: "Absolutely! Our builder walks you through every step — just upload your photos, approve the line-art conversions, customize your cover, and checkout. No design skills needed." },
  { question: "What kind of photos work best?", answer: "Photos with clear subjects and good contrast work best — think portraits, pets, landmarks, and nature shots. Avoid very dark, blurry, or overly busy images for the best line-art results." },
  { question: "What size is the Piccoload book?", answer: "✨ Our Piccoload book is A4 size 8.3\" x 11.7\" (21 x 29.7 cm) in Portrait orientation.\n\nTo help you visualize it:\n\n👉 It's roughly the size of a standard magazine, similar to well-known U.S. titles like TIME, The New Yorker, or National Geographic.\n\nIt's easy to hold, fits in most backpacks, and gives plenty of room for photos, artwork, and stories.\n\nThe large pages give you plenty of room to color and add detail, and they look great on display." },
];

const PRODUCT_IMAGES_QUERY = `
  query GetProductImages($handle: String!) {
    product(handle: $handle) {
      images(first: 20) {
        edges {
          node {
            url
            altText
          }
        }
      }
    }
  }
`;

const PricingSection = () => {
  const [selectedQuantity, setSelectedQuantity] = useState(2);
  const [pendingUniquePhotos, setPendingUniquePhotos] = useState(false);
  const [pendingPersonalizeCover, setPendingPersonalizeCover] = useState(false);
  const { addToCart, setIsCartOpen, clear } = useBasket();
  const navigate = useNavigate();
  const [productImages, setProductImages] = useState<ProductImage[]>([
    { url: "/images/product-hero.webp", altText: "Personalized Coloring Book" },
    { url: "/images/product-gallery-2.webp", altText: "Coloring book pages with pens" },
    { url: "/images/product-gallery-3.webp", altText: "Coloring book front cover" },
    { url: "/images/product-gallery-4.webp", altText: "Photo to coloring page conversion" },
    { url: "/images/product-gallery-5.webp", altText: "Coloring book page on sofa" },
    { url: "/images/product-gallery-6.webp", altText: "Coloring book on table with pencils" },
  ]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const ctaButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const data = await storefrontApiRequest(PRODUCT_IMAGES_QUERY, {
          handle: "personalized-coloring-book",
        });
        const edges = data?.data?.product?.images?.edges;
        if (edges && edges.length > 0) {
          const shopifyImages = edges.map((e: { node: { url: string; altText: string | null } }) => ({
            url: e.node.url,
            altText: e.node.altText,
          }));
          setProductImages(shopifyImages);
        }
      } catch (err) {
        console.error("Failed to fetch product images:", err);
      } finally {
        setImagesLoading(false);
      }
    };
    fetchImages();
  }, []);

  const selectedTier = physicalPricing.find((t) => t.quantity === selectedQuantity)!;
  const personalizeCoverCount = pendingPersonalizeCover ? (pendingUniquePhotos ? selectedQuantity : 1) : 0;
  const totalPrice = selectedTier.price + (pendingUniquePhotos ? UNIQUE_PHOTOS_PRICE : 0) + personalizeCoverCount * PERSONALIZE_COVER_PRICE;

  const handleAddToBasket = () => {
    clear();
    addToCart(selectedQuantity, { uniquePhotos: pendingUniquePhotos, personalizeCover: pendingPersonalizeCover });
    setIsCartOpen(true);
  };


  return (
    <>
      {/* 1. Product Hero */}
      <section className="py-12 md:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            {/* Left — Image Gallery */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <ProductImageGallery images={productImages} isLoading={imagesLoading} />
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
                Personalized Coloring Book
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
                  <span className="bg-background px-4 text-xs font-bold uppercase tracking-widest text-foreground">
                    {getSaleName()} — Final Day!
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
                      onClick={() => {
                        setSelectedQuantity(tier.quantity);
                        if (tier.quantity === 1) setPendingUniquePhotos(false);
                      }}
                      className={`w-full relative flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
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
                          <span className="font-extrabold text-foreground">
                            {tier.quantity} Coloring {tier.quantity === 1 ? "Book" : "Books"}
                          </span>
                          {tier.savingsBadge && (
                            <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-md">
                              {tier.savingsBadge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-primary font-bold mt-0.5">
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

              {/* Unique photos upsell — only for multi-book orders */}
              {selectedQuantity > 1 && (
                <label className="flex items-start gap-3 p-4 rounded-lg border border-border bg-background mb-3 cursor-pointer">
                  <Checkbox
                    checked={pendingUniquePhotos}
                    onCheckedChange={(checked) => setPendingUniquePhotos(!!checked)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">
                      Have 20 different photos in each book!{" "}
                      <span className="font-bold" style={{ color: 'hsl(150, 30%, 45%)' }}>+${UNIQUE_PHOTOS_PRICE.toFixed(2)}</span>
                    </p>
                  </div>
                </label>
              )}

              {/* Personalize cover upsell */}
              <label className="flex items-start gap-3 p-4 rounded-lg border border-border bg-background mb-3 cursor-pointer">
                <Checkbox
                  checked={pendingPersonalizeCover}
                  onCheckedChange={(checked) => setPendingPersonalizeCover(!!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    Personalize your cover!{" "}
                    <span className="text-primary font-bold">+${PERSONALIZE_COVER_PRICE.toFixed(2)}/book</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add a custom title to the front cover of each book
                  </p>
                </div>
              </label>

              {/* 2. Guarantee Badges */}
              <GuaranteeBadges />

              {/* Add to basket */}
              <Button ref={ctaButtonRef} onClick={handleAddToBasket} className="w-full rounded-lg py-6 text-base font-semibold mt-5" size="lg">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart — ${totalPrice.toFixed(2)}
              </Button>

              {/* Trust badges */}
              <div className="mt-4 mb-4">
                <TrustBadges />
              </div>

              {/* Process note */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-5">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>Next step:</strong> Upload your photos, preview each line-art conversion, customize your cover, and checkout — all in our easy builder.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Before/After Strip */}
      <BeforeAfterStrip />

      {/* Cat Banner */}
      <CatBanner />

      {/* 4. How It Works */}
      <HowItWorksSection />

      {/* 5. FAQ */}
      <section className="py-12 md:py-16 bg-cream">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Frequently Asked Questions
            </h3>
            <p className="text-sm text-muted-foreground mb-8">
              Find answers to common questions about our Piccoload Books!
            </p>
            <Accordion type="single" collapsible className="w-full text-left">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-5 mb-3 border-border">
                  <AccordionTrigger className="text-left text-sm font-semibold font-sans">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* 7. Customer Reviews */}
      <CustomerReviewsSection />

      {/* 8. Instagram Feed */}
      <InstagramSection />

      {/* 9. Final CTA Block */}
      <FinalCTABlock onCtaClick={() => {
        clear();
        addToCart(selectedQuantity, { uniquePhotos: pendingUniquePhotos, personalizeCover: pendingPersonalizeCover });
        setIsCartOpen(true);
      }} />

    </>
  );
};

export default PricingSection;
