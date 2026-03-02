import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Download, ShoppingCart, Lock, Loader2, ArrowLeft, Sparkles, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useBasket, DIGITAL_DOWNLOAD_PRICE, UNIQUE_PHOTOS_PRICE } from "@/contexts/BasketContext";
import { createShopifyCheckout, SHOPIFY_VARIANTS, type CartLineInput } from "@/lib/shopify";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const OrderReview = () => {
  const {
    items,
    totalBookCount,
    removeItem,
    updateItemQuantity,
    digitalCopies,
    setDigitalCopies,
    uniquePhotosPrice,
    activeSessionId,
    setIsCartOpen,
  } = useBasket();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground text-lg">Your cart is empty.</p>
            <Button asChild>
              <Link to="/pricing">Shop Now</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Totals
  const booksTotal = items.reduce((s, i) => s + i.totalPrice, 0);
  const booksOriginalTotal = items.reduce((s, i) => s + i.originalTotalPrice, 0);
  const uniquePhotosTotal = items
    .filter((i) => i.uniquePhotos)
    .reduce((s, i) => s + (i.uniquePhotos ? UNIQUE_PHOTOS_PRICE : 0), 0);
  const personalizeCoverTotal = items.reduce((s, i) => {
    if (!i.personalizeCover) return s;
    return s + (i.uniquePhotos ? i.quantity * 1.99 : 1.99);
  }, 0);
  const digitalTotal = digitalCopies * DIGITAL_DOWNLOAD_PRICE;
  const grandTotal = booksTotal + uniquePhotosTotal + personalizeCoverTotal + digitalTotal;
  const totalSavings = booksOriginalTotal - booksTotal;

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const lines: CartLineInput[] = [];

      lines.push({ merchandiseId: SHOPIFY_VARIANTS.COLORING_BOOK, quantity: totalBookCount });

      if (digitalCopies > 0) {
        lines.push({ merchandiseId: SHOPIFY_VARIANTS.DIGITAL_DOWNLOAD, quantity: digitalCopies });
      }

      const uniquePhotosItems = items.filter((i) => i.uniquePhotos);
      if (uniquePhotosItems.length > 0) {
        lines.push({ merchandiseId: SHOPIFY_VARIANTS.UNIQUE_PHOTOS, quantity: uniquePhotosItems.length });
      }

      const personalizeCount = items.reduce((s, i) => {
        if (!i.personalizeCover) return s;
        return s + (i.uniquePhotos ? i.quantity : 1);
      }, 0);
      if (personalizeCount > 0) {
        lines.push({ merchandiseId: SHOPIFY_VARIANTS.PERSONALIZE_COVER, quantity: personalizeCount });
      }

      const checkoutUrl = await createShopifyCheckout(lines);
      if (checkoutUrl) {
        window.open(checkoutUrl, "_blank");
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="font-display text-3xl font-bold text-foreground">Review Your Order</h1>
            <p className="text-muted-foreground mt-1">Almost there! Check your items below before checkout.</p>
          </div>

          <div className="space-y-4">
            {/* Line items */}
            {items.map((lineItem) => {
              const savings = lineItem.originalTotalPrice - lineItem.totalPrice;
              const personalizeCost = lineItem.personalizeCover
                ? (lineItem.uniquePhotos ? lineItem.quantity * 1.99 : 1.99)
                : 0;
              return (
                <Card key={lineItem.id} className="rounded-2xl overflow-hidden">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex gap-4">
                      <img
                        src="/lovable-uploads/d741aeb9-21af-45e1-9863-e350da643d42.png"
                        alt="Personalised Coloring Book"
                        className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-foreground text-sm leading-tight">
                            {lineItem.quantity === 1
                              ? "Personalised Coloring Book"
                              : `${lineItem.quantity}× Coloring Book Bundle`}
                          </span>
                          <button
                            onClick={() => removeItem(lineItem.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateItemQuantity(lineItem.id, lineItem.quantity - 1)}
                            disabled={lineItem.quantity <= 1}
                            className="w-6 h-6 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-semibold w-4 text-center">{lineItem.quantity}</span>
                          <button
                            onClick={() => updateItemQuantity(lineItem.id, lineItem.quantity + 1)}
                            disabled={lineItem.quantity >= 3}
                            className="w-6 h-6 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="text-xs text-muted-foreground">${lineItem.pricePerBook.toFixed(2)}/book</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <span className="line-through text-muted-foreground">${lineItem.originalTotalPrice.toFixed(2)}</span>
                          <span className="font-bold text-foreground">${lineItem.totalPrice.toFixed(2)}</span>
                          {savings > 0 && (
                            <span className="text-green-600 text-xs font-medium">Save ${savings.toFixed(2)}</span>
                          )}
                        </div>

                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-0 px-2 py-0.5">
                          <Sparkles className="w-3 h-3 mr-1" />
                          February Sale
                        </Badge>
                      </div>
                    </div>

                    {/* What's included */}
                    <div className="space-y-1.5 pt-1">
                      {[
                        "20-page personalised coloring book",
                        "High-quality line art conversions",
                        "Custom front cover design",
                        "Premium paper quality",
                        "US delivery included",
                      ].map((feat) => (
                        <div key={feat} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          {feat}
                        </div>
                      ))}
                      {lineItem.uniquePhotos && lineItem.quantity > 1 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          20 unique photos per book — ${UNIQUE_PHOTOS_PRICE.toFixed(2)}
                        </div>
                      )}
                      {lineItem.personalizeCover && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          Personalized cover — ${personalizeCost.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Digital Download Upsell */}
            <Card className="rounded-2xl border-dashed border-2 border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-foreground">
                      Add an Instant Digital Download
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Get a printable PDF of your coloring book — print extra copies at home anytime!
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={digitalCopies > 0}
                      onCheckedChange={(checked) => setDigitalCopies(checked ? totalBookCount : 0)}
                    />
                    <div>
                      <span className="font-semibold text-foreground text-sm">
                        Digital PDF {totalBookCount > 1 ? `× ${totalBookCount}` : "Copy"}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">Instantly downloadable</span>
                    </div>
                  </div>
                  <span className="font-bold text-foreground">
                    ${(totalBookCount * DIGITAL_DOWNLOAD_PRICE).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="rounded-2xl">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-display text-base font-semibold text-foreground">Order Summary</h3>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Coloring Book{totalBookCount > 1 ? ` × ${totalBookCount}` : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-muted-foreground text-xs">${booksOriginalTotal.toFixed(2)}</span>
                    <span className="font-medium">${booksTotal.toFixed(2)}</span>
                  </div>
                </div>

                {uniquePhotosTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unique Photos Per Book</span>
                    <span className="font-medium">${uniquePhotosTotal.toFixed(2)}</span>
                  </div>
                )}

                {personalizeCoverTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Personalised Cover</span>
                    <span className="font-medium">${personalizeCoverTotal.toFixed(2)}</span>
                  </div>
                )}

                {digitalCopies > 0 && (
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-primary" />
                      <span className="text-muted-foreground">Digital PDF × {digitalCopies}</span>
                    </div>
                    <span className="font-medium">${digitalTotal.toFixed(2)}</span>
                  </div>
                )}

                {totalSavings > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>You save</span>
                    <span>– ${totalSavings.toFixed(2)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>

                {/* Checkout button */}
                <Button
                  className="w-full rounded-2xl py-6 text-base mt-2"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-5 h-5 mr-2" />
                  )}
                  {isCheckingOut ? "Creating Checkout…" : "Checkout"}
                </Button>

                <p className="text-xs text-center text-muted-foreground pt-1">
                  After checkout, you will be taken to a page where you can upload your photos and customise your books.
                </p>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Secure checkout via Shopify</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default OrderReview;
