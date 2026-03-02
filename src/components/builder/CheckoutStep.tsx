import { useState } from "react";
import { Check, ShoppingCart, Lock, Minus, Plus, Download, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useBasket, DIGITAL_DOWNLOAD_PRICE } from "@/contexts/BasketContext";
import { createShopifyCheckout, SHOPIFY_VARIANTS, type CartLineInput } from "@/lib/shopify";

interface BookDigitalDownload {
  bookIndex: number;
  enabled: boolean;
}

interface BookAddOnsInfo {
  bookIndex: number;
  titlePageEnabled: boolean;
  dedicationPageEnabled: boolean;
}

interface CheckoutStepProps {
  pageCount: number;
  extraPages: number;
  convertedUrls: (string | null)[];
  onBack: () => void;
  bookDigitalDownloads: BookDigitalDownload[];
  onToggleBookDigitalDownload: (bookIndex: number) => void;
  bookAddOnsList: BookAddOnsInfo[];
}

const CheckoutStep = ({ pageCount, extraPages, convertedUrls, onBack, bookDigitalDownloads, onToggleBookDigitalDownload, bookAddOnsList }: CheckoutStepProps) => {
  const { item, setQuantity, pricingTiers, addOnPrice, uniquePhotos, uniquePhotosPrice } = useBasket();
  const personalizeCoverFromBasket = item?.personalizeCover ?? false;
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const bookCount = item?.quantity ?? 1;
  const basePrice = item?.pricePerBook ?? 35;
  const originalBasePrice = item?.originalPricePerBook ?? 42;
  const extraPagesPrice = extraPages === 10 ? 6 : extraPages === 20 ? 10 : extraPages === 40 ? 18 : 0;
  const digitalCount = bookDigitalDownloads.filter(b => b.enabled).length;
  const digitalPrice = digitalCount * DIGITAL_DOWNLOAD_PRICE;
  // Count per-book add-ons
  const titlePageCount = bookAddOnsList.filter(b => b.titlePageEnabled).length;
  const coverPersonalizeCount = bookAddOnsList.filter(b => b.dedicationPageEnabled).length;
  const perBookAddOnsTotal = (titlePageCount + coverPersonalizeCount) * addOnPrice;
  const personalizeCoverBooksCount = personalizeCoverFromBasket ? (uniquePhotos ? bookCount : 1) : 0;
  const basketPersonalizeCoverCost = personalizeCoverBooksCount * 1.99;
  const totalPrice = (basePrice + extraPagesPrice) * bookCount + (uniquePhotos ? uniquePhotosPrice : 0) + digitalPrice + perBookAddOnsTotal + basketPersonalizeCoverCost;
  const originalTotalPrice = (originalBasePrice + extraPagesPrice) * bookCount + (uniquePhotos ? uniquePhotosPrice : 0) + digitalPrice + perBookAddOnsTotal;

  const maxQuantity = Math.max(...pricingTiers.map((t) => t.quantity));
  const handleDecrement = () => { if (bookCount > 1) setQuantity(bookCount - 1); };
  const handleIncrement = () => { if (bookCount < maxQuantity) setQuantity(bookCount + 1); };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const lines: CartLineInput[] = [];

      // Add coloring books
      lines.push({ merchandiseId: SHOPIFY_VARIANTS.COLORING_BOOK, quantity: bookCount });

      // Add digital downloads
      const digitalCount2 = bookDigitalDownloads.filter(b => b.enabled).length;
      if (digitalCount2 > 0) {
        lines.push({ merchandiseId: SHOPIFY_VARIANTS.DIGITAL_DOWNLOAD, quantity: digitalCount2 });
      }

      // Add unique photos add-on
      if (uniquePhotos && bookCount > 1) {
        lines.push({ merchandiseId: SHOPIFY_VARIANTS.UNIQUE_PHOTOS, quantity: 1 });
      }

      // Add personalize cover add-on
      const personalizeCount = bookAddOnsList.filter(b => b.titlePageEnabled).length;
      const basketPersonalizeCount = personalizeCoverFromBasket ? (uniquePhotos ? bookCount : 1) : 0;
      const totalPersonalizeCount = Math.max(personalizeCount, basketPersonalizeCount);
      if (totalPersonalizeCount > 0) {
        lines.push({ merchandiseId: SHOPIFY_VARIANTS.PERSONALIZE_COVER, quantity: totalPersonalizeCount });
      }

      const checkoutUrl = await createShopifyCheckout(lines);
      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsCheckingOut(false);
    }
  };

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
              {coverPersonalizeCount > 0 && (
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span>Personalized cover × {coverPersonalizeCount} {coverPersonalizeCount === 1 ? "book" : "books"}</span>
                  <Badge variant="secondary">+${(coverPersonalizeCount * addOnPrice).toFixed(2)}</Badge>
                </div>
              )}
              {uniquePhotos && bookCount > 1 && (
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span>20 unique photos per book (no repeats across books)</span>
                  <Badge variant="secondary">Add-on</Badge>
                </div>
              )}
              {digitalCount > 0 && (
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span>
                    Digital PDF download × {digitalCount} {digitalCount === 1 ? "book" : "books"} (20 pages each)
                  </span>
                  <Badge variant="secondary">Add-on</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Per-Book Digital Download Upsell */}
          <Card className="rounded-3xl border-dashed border-2 border-primary/30 bg-primary/5 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">
                    Add a Digital PDF Download
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get a printable PDF of your coloring book — print extra copies at home anytime!
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {bookDigitalDownloads.map((bd) => (
                  <div
                    key={bd.bookIndex}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-background"
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={bd.enabled}
                        onCheckedChange={() => onToggleBookDigitalDownload(bd.bookIndex)}
                      />
                      <div>
                        <span className="font-semibold text-foreground text-sm">
                          Book {bd.bookIndex + 1}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          Instantly downloadable copy
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-foreground">
                      ${DIGITAL_DOWNLOAD_PRICE.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
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
                      <span className="text-2xl font-display text-foreground/25 rotate-[-30deg] font-bold tracking-widest select-none">
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

              {coverPersonalizeCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Personalized Cover × {coverPersonalizeCount}</span>
                  <span>${(coverPersonalizeCount * addOnPrice).toFixed(2)}</span>
                </div>
              )}

              {uniquePhotos && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unique Photos Per Book</span>
                  <span>${uniquePhotosPrice.toFixed(2)}</span>
                </div>
              )}

              {extraPages > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+{extraPages} Extra Pages{bookCount > 1 ? ` × ${bookCount}` : ""}</span>
                  <span>${(extraPagesPrice * bookCount).toFixed(2)}</span>
                </div>
              )}

              {digitalCount > 0 && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-primary" />
                    <span className="text-muted-foreground">
                      PDF Download × {digitalCount}
                    </span>
                  </div>
                  <span>${digitalPrice.toFixed(2)}</span>
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

              <Button 
                className="w-full rounded-2xl py-6 text-base mt-4" 
                size="lg"
                onClick={handleCheckout}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin shrink-0" />
                ) : (
                  <ShoppingCart className="w-5 h-5 mr-2 shrink-0" />
                )}
                <span className="truncate">{isCheckingOut ? "Creating Checkout…" : "Secure Checkout"}</span>
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
