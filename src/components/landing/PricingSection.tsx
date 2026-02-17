import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ShoppingCart, Download } from "lucide-react";
import { useBasket, DIGITAL_TIERS } from "@/contexts/BasketContext";
import { toast } from "sonner";

const physicalPricing = [
  {
    quantity: 1,
    price: 35,
    originalPrice: 42,
    savingsPercent: "17%",
    label: null as string | null,
    savingsBadge: null as string | null,
  },
  {
    quantity: 2,
    price: 63,
    originalPrice: 84,
    savingsPercent: "25%",
    savingsBadge: "SAVE $21",
    label: "MOST POPULAR",
  },
  {
    quantity: 3,
    price: 87,
    originalPrice: 126,
    savingsPercent: "31%",
    savingsBadge: "SAVE $39",
    label: "BEST VALUE",
  },
];

const features = [
  "Each book contains 20 Custom Photo Pages",
  "Personalized Line Art from Your Own Photos",
  "A Thoughtful Gift for Any Occasion",
  "Premium Paper Quality",
  "Made & Shipped in the USA",
];

const digitalFeatures = [
  "Instant PDF Download",
  "High-Resolution 300 DPI Line Art",
  "Print at Home as Many Times as You Like",
  "Same Beautiful Conversions as Print",
];

const PricingSection = () => {
  const [selectedQuantity, setSelectedQuantity] = useState(2);
  const [selectedDigitalPages, setSelectedDigitalPages] = useState<10 | 20 | 30 | null>(null);
  const [activeTab, setActiveTab] = useState<"print" | "digital">("print");
  const { setQuantity, setDigitalDownload } = useBasket();
  const navigate = useNavigate();

  const selectedTier = physicalPricing.find((t) => t.quantity === selectedQuantity)!;
  const selectedDigitalTier = DIGITAL_TIERS.find((t) => t.pages === selectedDigitalPages);

  const handleAddToBasket = () => {
    if (activeTab === "print") {
      setQuantity(selectedQuantity);
      toast.success(`${selectedQuantity} coloring ${selectedQuantity === 1 ? "book" : "books"} added to basket!`);
    } else {
      if (!selectedDigitalTier) {
        toast.error("Please select a digital download option");
        return;
      }
      setDigitalDownload({ pages: selectedDigitalTier.pages, price: selectedDigitalTier.price });
      toast.success(`Digital download (${selectedDigitalTier.pages} pages) added to basket!`);
    }
    navigate("/builder");
  };

  return (
    <section className="py-20 bg-cream">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto">

          {/* Tab switcher */}
          <div className="flex rounded-2xl border border-border overflow-hidden mb-8">
            <button
              onClick={() => setActiveTab("print")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === "print"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              Printed Book
            </button>
            <button
              onClick={() => setActiveTab("digital")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === "digital"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              Digital Download
            </button>
          </div>

          {activeTab === "print" ? (
            <>
              {/* Title */}
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 uppercase tracking-wide">
                Personalized Coloring Book
              </h2>

              {/* Features list */}
              <ul className="space-y-2 mb-8">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                A one-of-a-kind coloring book made from your personal photos,
                transformed into beautiful black-and-white line art, ready to color,
                gift, or keep. Perfect for birthdays, anniversaries, memory books, or
                moments that matter.
              </p>

              {/* Divider with sale text */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-cream px-4 text-xs font-bold uppercase tracking-widest text-foreground">
                    Limited Time Offer
                  </span>
                </div>
              </div>

              {/* Pricing options */}
              <div className="space-y-3 mb-6">
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
                      {/* Radio circle */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          isSelected ? "border-primary" : "border-muted-foreground/40"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                        )}
                      </div>

                      {/* Text */}
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

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-lg text-foreground">
                          ${tier.price.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground line-through">
                          ${tier.originalPrice.toFixed(2)}
                        </p>
                      </div>

                      {/* Label badge */}
                      {tier.label && (
                        <Badge className="absolute -top-2.5 right-4 bg-foreground text-background text-[10px] px-2 py-0.5 rounded-md">
                          {tier.label}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Add to basket */}
              <Button onClick={handleAddToBasket} className="w-full rounded-2xl py-6 text-base font-semibold" size="lg">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Basket — ${selectedTier.price.toFixed(2)}
              </Button>
            </>
          ) : (
            <>
              {/* Digital Title */}
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 uppercase tracking-wide">
                Digital Coloring Pages
              </h2>

              {/* Digital Features list */}
              <ul className="space-y-2 mb-8">
                {digitalFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                Get your personalized line art as a high-quality digital PDF.
                Print at home whenever you want — perfect for families who love
                coloring together or want extra copies on demand.
              </p>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-cream px-4 text-xs font-bold uppercase tracking-widest text-foreground">
                    Choose Your Pages
                  </span>
                </div>
              </div>

              {/* Digital pricing options */}
              <div className="space-y-3 mb-6">
                {DIGITAL_TIERS.map((tier) => {
                  const isSelected = selectedDigitalPages === tier.pages;
                  return (
                    <button
                      key={tier.pages}
                      onClick={() => setSelectedDigitalPages(tier.pages)}
                      className={`w-full relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-background hover:border-muted-foreground/30"
                      }`}
                    >
                      {/* Radio circle */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          isSelected ? "border-primary" : "border-muted-foreground/40"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-foreground">
                          {tier.pages} Coloring Pages
                        </span>
                        <p className="text-xs text-primary font-medium mt-0.5">
                          ${(tier.price / tier.pages).toFixed(2)} per page
                        </p>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-lg text-foreground">
                          ${tier.price.toFixed(2)}
                        </p>
                      </div>

                      {tier.pages === 30 && (
                        <Badge className="absolute -top-2.5 right-4 bg-foreground text-background text-[10px] px-2 py-0.5 rounded-md">
                          BEST VALUE
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Add to basket */}
              <Button
                onClick={handleAddToBasket}
                disabled={!selectedDigitalTier}
                className="w-full rounded-2xl py-6 text-base font-semibold"
                size="lg"
              >
                <Download className="w-5 h-5 mr-2" />
                {selectedDigitalTier
                  ? `Add Digital Download — $${selectedDigitalTier.price.toFixed(2)}`
                  : "Select a digital option"}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
