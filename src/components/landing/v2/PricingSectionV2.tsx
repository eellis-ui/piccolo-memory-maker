import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ArrowRight, PlayCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useBasket, UNIQUE_PHOTOS_PRICE, PERSONALIZE_COVER_PRICE } from "@/contexts/BasketContext";
import ProductImageGallery, { type ProductImage } from "../ProductImageGallery";
import { storefrontApiRequest } from "@/lib/shopify";
import TrustBadges from "../TrustBadges";
import HowItWorksSection from "../HowItWorksSection";
import CatBanner from "../CatBanner";
import InstagramSection from "../InstagramSection";
import StickyMobileCTA from "../StickyMobileCTA";
import FinalCTABlock from "../FinalCTABlock";
import HonestCountdown from "../HonestCountdown";
import DeliveryEstimate from "./DeliveryEstimate";
import GuaranteeBadgesV2 from "./GuaranteeBadgesV2";
import TryYourPhoto from "./TryYourPhoto";
import GiftLane from "./GiftLane";
import CustomerReviewsSectionV2 from "./CustomerReviewsSectionV2";
import { Annotated } from "./WhatChanged";

// Data below mirrors the live PricingSection; the V2 differences are marked
// with the Annotated wrappers and the "What changed?" toggle.

const physicalPricing = [
  { quantity: 1, price: 35, originalPrice: 45, savingsPercent: "22%", label: null as string | null, savingsBadge: null as string | null },
  { quantity: 2, price: 59.5, originalPrice: 90, savingsPercent: "34%", savingsBadge: "SAVE $30.50", label: "MOST POPULAR" },
  { quantity: 3, price: 69.3, originalPrice: 135, savingsPercent: "49%", savingsBadge: "SAVE $65.70", label: "BEST VALUE" },
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
  // V2: answer rewritten to state the same guarantee as the badge above the
  // CTA, so the page never contradicts itself.
  { question: "What if something goes wrong – do you offer returns or replacements?", answer: "Every order is covered by our Love-Your-Book Guarantee: if your book arrives damaged, misprinted, or not what you approved, contact us within 14 days of delivery with your order number and a photo, and we'll send a free replacement or a full refund.\n\nBecause each book is custom-made from your photos, we can't accept change-of-mind returns — but you're in full control before printing: you choose every photo, preview every line-art page, and approve the final book in the builder. Nothing prints until you're happy with it. See our Refund Policy for full details." },
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

const PricingSectionV2 = () => {
  const [selectedQuantity, setSelectedQuantity] = useState(2);
  const [pendingUniquePhotos, setPendingUniquePhotos] = useState(false);
  const [pendingPersonalizeCover, setPendingPersonalizeCover] = useState(false);
  const { addToCart, setIsCartOpen, clear } = useBasket();
  const [productImages, setProductImages] = useState<ProductImage[]>([
    { url: "/images/product-hero.webp", altText: "Personalized Coloring Book" },
    { url: "/images/product-gallery-2.webp", altText: "Coloring book pages with pens" },
    { url: "/images/product-gallery-3.webp", altText: "Coloring book front cover" },
    { url: "/images/product-gallery-4.webp", altText: "Photo to coloring page conversion" },
    { url: "/images/product-gallery-5.webp", altText: "Coloring book page on sofa" },
    { url: "/images/product-gallery-6.webp", altText: "Coloring book on table with pencils" },
  ]);
  // Local fallback images render immediately — the ad visitor's first
  // paint must never wait on a cross-origin Shopify API round-trip.
  const [imagesLoading] = useState(false);
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
      {/* Product + AggregateRating schema — review stars in search results.
          Production populates this from the live review feed. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Personalized Coloring Book",
            image: "https://piccoload.com/images/product-hero.webp",
            description: "A one-of-a-kind coloring book made from your personal photos, transformed into black-and-white line art.",
            brand: { "@type": "Brand", name: "Piccoload" },
            // aggregateRating deliberately omitted until a real review feed
            // backs the numbers — fabricated counts risk a Google penalty.
            offers: { "@type": "Offer", price: "35.00", priceCurrency: "USD", availability: "https://schema.org/InStock" },
          }),
        }}
      />

      {/* 1. Product Hero */}
      <section className="py-12 md:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            {/* Left — Image Gallery */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <ProductImageGallery images={productImages} isLoading={imagesLoading} />
              {/* V2: reserved flip-through video slot */}
              <Annotated n={7} label="Video slot">
                <div className="mt-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 flex items-center gap-3">
                  <PlayCircle className="w-8 h-8 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Video slot:</strong> 15-second flip-through of a
                    real book goes here (gallery position 2) — hands turning pages, phone showing the
                    original photo beside the colored page.
                  </p>
                </div>
              </Annotated>
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
                <span className="text-sm text-muted-foreground">Loved by families across the US &amp; UK</span>
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

              {/* V2: honest offer framing — a true statement, not a fake deadline */}
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-4 text-xs font-bold uppercase tracking-widest text-foreground">
                    Bundle &amp; Save up to 49%
                  </span>
                </div>
              </div>

              {/* V2: honest countdown — real weekly print-run cutoff */}
              <Annotated n={2} label="Honest countdown">
                <div className="mb-6">
                  <HonestCountdown />
                </div>
              </Annotated>

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
                    <span className="text-primary font-bold">+${PERSONALIZE_COVER_PRICE.toFixed(2)}{pendingUniquePhotos ? "/book" : ""}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add a custom title to the front cover of each book
                  </p>
                </div>
              </label>

              {/* V2: gift-buyer lane */}
              <Annotated n={9} label="Gift lane">
                <GiftLane />
              </Annotated>

              {/* V2: guarantee badges that match the refund policy */}
              <Annotated n={3} label="Consistent guarantee">
                <GuaranteeBadgesV2 />
              </Annotated>

              {/* V2: creation-verb CTA + delivery promise */}
              <Annotated n={8} label="CTA verb">
                <Button ref={ctaButtonRef} onClick={handleAddToBasket} className="w-full rounded-lg py-6 text-base font-semibold mt-5" size="lg">
                  Start My Book — ${totalPrice.toFixed(2)}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Annotated>
              <Annotated n={6} label="Delivery promise">
                <DeliveryEstimate />
              </Annotated>

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

      {/* V2: interactive try-your-photo replaces the static before/after strip */}
      <Annotated n={4} label="Try your photo">
        <TryYourPhoto onCtaClick={handleAddToBasket} />
      </Annotated>

      {/* Cat Banner */}
      <CatBanner />

      {/* How It Works */}
      <HowItWorksSection />

      {/* FAQ */}
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

      {/* V2: photo-first customer reviews */}
      <Annotated n={5} label="Photo reviews">
        <CustomerReviewsSectionV2 />
      </Annotated>

      {/* Instagram Feed */}
      <InstagramSection />

      {/* Final CTA Block */}
      <FinalCTABlock onCtaClick={handleAddToBasket} />

      {/* V2: sticky mobile CTA — appears once the buy button scrolls away */}
      <StickyMobileCTA
        price={totalPrice.toFixed(2)}
        onCtaClick={handleAddToBasket}
        triggerRef={ctaButtonRef}
      />
    </>
  );
};

export default PricingSectionV2;
