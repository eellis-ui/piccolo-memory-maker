import { Check, ShoppingCart, Lock, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBasket } from "@/contexts/BasketContext";

interface CheckoutStepProps {
  pageCount: number;
  hasUniquePhotos: boolean;
  extraPages: number;
  convertedUrls: (string | null)[];
  onBack: () => void;
}

const CheckoutStep = ({ pageCount, hasUniquePhotos, extraPages, convertedUrls, onBack }: CheckoutStepProps) => {
  const { item, setQuantity, pricingTiers } = useBasket();
  
  const bookCount = item?.quantity ?? 1;
  const basePrice = item?.pricePerBook ?? 35;
  const originalBasePrice = item?.originalPricePerBook ?? 42;
  const uniquePhotosPrice = hasUniquePhotos ? 5 : 0;
  const extraPagesPrice = extraPages === 10 ? 6 : extraPages === 20 ? 10 : extraPages === 40 ? 18 : 0;
  const totalPrice = (basePrice + uniquePhotosPrice + extraPagesPrice) * bookCount;
  const originalTotalPrice = (originalBasePrice + uniquePhotosPrice + extraPagesPrice) * bookCount;

  const maxQuantity = Math.max(...pricingTiers.map((t) => t.quantity));
  const handleDecrement = () => { if (bookCount > 1) setQuantity(bookCount - 1); };
  const handleIncrement = () => { if (bookCount < maxQuantity) setQuantity(bookCount + 1); };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Review Your Order
        </h2>
        <p className="text-muted-foreground">
          Almost there! Review your book details before checkout
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* What's Included */}
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="font-display text-lg">What's Included</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary" />
                <span>{pageCount + extraPages} page personalized coloring book</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary" />
                <span>High-quality line art conversions</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary" />
                <span>Custom front cover design</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary" />
                <span>Premium paper quality</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary" />
                <span>US delivery included</span>
              </div>
              {hasUniquePhotos && bookCount > 1 && (
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span>20 unique photos per book (no repeats across books)</span>
                  <Badge variant="secondary">Add-on</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="font-display text-lg">Book Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {convertedUrls.map((url, i) => (
                  <div key={i} className="flex-shrink-0 w-32 aspect-[3/4] bg-cream rounded-xl flex items-center justify-center relative overflow-hidden">
                    {url ? (
                      <img src={url} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Page {i + 1}</span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-lg font-display text-foreground/5 rotate-[-30deg]">
                        PREVIEW
                      </span>
                    </div>
                  </div>
                ))}
                {pageCount > convertedUrls.length && (
                  <div className="flex-shrink-0 w-32 aspect-[3/4] bg-cream rounded-xl flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">+{pageCount - convertedUrls.length} more</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Price Summary */}
        <div>
          <Card className="rounded-3xl sticky top-24">
            <CardHeader>
              <CardTitle className="font-display text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quantity selector */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDecrement}
                    disabled={bookCount <= 1}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-semibold text-foreground w-6 text-center">{bookCount}</span>
                  <button
                    onClick={handleIncrement}
                    disabled={bookCount >= maxQuantity}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Coloring Book (20 pages){bookCount > 1 ? ` × ${bookCount}` : ""}</span>
                <div className="flex items-center gap-2">
                  <span className="line-through text-muted-foreground text-sm">${(originalBasePrice * bookCount).toFixed(2)}</span>
                  <span>${(basePrice * bookCount).toFixed(2)}</span>
                </div>
              </div>
              
              {hasUniquePhotos && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">20 Unique Photos{bookCount > 1 ? ` × ${bookCount}` : ""}</span>
                  <span>${(uniquePhotosPrice * bookCount).toFixed(2)}</span>
                </div>
              )}
              
              {extraPages > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+{extraPages} Extra Pages{bookCount > 1 ? ` × ${bookCount}` : ""}</span>
                  <span>${(extraPagesPrice * bookCount).toFixed(2)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <div className="flex items-center gap-2">
                  <span className="line-through text-muted-foreground text-sm font-normal">${originalTotalPrice.toFixed(2)}</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <Button className="w-full rounded-2xl py-6 text-base mt-4" size="lg">
                <ShoppingCart className="w-5 h-5 mr-2 shrink-0" />
                <span className="truncate">Secure Checkout</span>
              </Button>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span>Secure checkout via Shopify</span>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Watermarks will be removed after payment. Full-resolution PDF generated within 24 hours.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-start pt-4">
        <Button variant="outline" onClick={onBack} className="rounded-2xl">
          Back to Cover Design
        </Button>
      </div>
    </div>
  );
};

export default CheckoutStep;
