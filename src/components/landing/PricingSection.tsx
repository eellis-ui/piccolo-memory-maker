import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const physicalPricing = [
  {
    quantity: 1,
    price: "£26",
    pricePerBook: "£26",
    popular: false,
  },
  {
    quantity: 2,
    price: "£44.20",
    pricePerBook: "£22.10",
    popular: true,
    savings: "Save 15%",
  },
  {
    quantity: 3,
    price: "£51.48",
    pricePerBook: "£17.16",
    popular: false,
    savings: "Save 34%",
  },
];

const digitalPricing = [
  { conversions: 10, price: "£2" },
  { conversions: 25, price: "£4" },
  { conversions: 50, price: "£7" },
];

const features = [
  "20 pages included",
  "High-quality line art conversion",
  "Custom front cover",
  "Premium paper quality",
  "UK-made & shipped",
];

const PricingSection = () => {
  return (
    <section className="py-20 bg-cream">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose the perfect package for your personalised colouring book
          </p>
        </div>

        {/* Physical Books */}
        <div className="mb-16">
          <h3 className="font-display text-xl font-semibold text-foreground text-center mb-8">
            Physical Colouring Books
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {physicalPricing.map((tier) => (
              <Card 
                key={tier.quantity}
                className={`relative rounded-3xl border-2 transition-all duration-300 hover:shadow-soft-lg ${
                  tier.popular ? "border-primary shadow-soft-lg" : "border-border"
                }`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-2">
                  <CardDescription className="text-muted-foreground">
                    {tier.quantity} {tier.quantity === 1 ? "Book" : "Books"}
                  </CardDescription>
                  <CardTitle className="font-display text-4xl font-semibold text-foreground">
                    {tier.price}
                  </CardTitle>
                  {tier.savings && (
                    <Badge variant="secondary" className="mt-2">
                      {tier.savings}
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    {tier.pricePerBook} per book
                  </p>
                  
                  <ul className="space-y-3 mb-6">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button asChild className="w-full rounded-2xl" variant={tier.popular ? "default" : "outline"}>
                    <Link to="/builder">Get Started</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Digital Packs */}
        <div className="max-w-2xl mx-auto">
          <h3 className="font-display text-xl font-semibold text-foreground text-center mb-8">
            Digital-Only Packs
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            {digitalPricing.map((pack) => (
              <Card key={pack.conversions} className="rounded-2xl text-center p-6 hover:shadow-soft transition-all">
                <p className="font-display text-2xl font-semibold text-foreground mb-1">
                  {pack.price}
                </p>
                <p className="text-sm text-muted-foreground">
                  {pack.conversions} conversions
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Upsells info */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground text-sm">
            Add-ons available: Extra pages • 20 unique photos per book • Hardcover upgrade
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
