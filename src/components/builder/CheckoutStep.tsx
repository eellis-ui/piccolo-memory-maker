import { useState, useEffect, useCallback, useRef } from "react";
import { Check, ShoppingCart, Lock, Minus, Plus, Download, Loader2, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useBasket, DIGITAL_DOWNLOAD_PRICE } from "@/contexts/BasketContext";
import { createShopifyCheckout, SHOPIFY_VARIANTS, type CartLineInput } from "@/lib/shopify";
import { trackAddToCart } from "@/lib/shopify-analytics";
import { trackEvent } from "@/lib/analytics-tracker";
import { metaAddToCart, metaInitiateCheckout, metaPurchase } from "@/lib/meta-pixel";
import { getSessionOrders, uploadCover } from "@/lib/guest-api";
import { renderFrontCoverPng } from "@/lib/cover-renderer";
import logoImg from "@/assets/piccoload-logo.png";

interface BookDigitalDownload {
  bookIndex: number;
  enabled: boolean;
}

interface BookAddOnsInfo {
  bookIndex: number;
  titlePageEnabled: boolean;
  dedicationPageEnabled: boolean;
}

interface BookPreviewData {
  bookIndex: number;
  coverGridUrls: (string | null)[];
  pageUrls: (string | null)[];
  pageLandscape?: boolean[];
  coverSubtitle?: string;
  coverBottomTitle?: string;
}

interface CheckoutStepProps {
  pageCount: number;
  extraPages: number;
  convertedUrls: (string | null)[];
  onBack: () => void;
  onCheckoutComplete?: (shopifyOrderNumber?: string | null) => void;
  bookDigitalDownloads: BookDigitalDownload[];
  onToggleBookDigitalDownload: (bookIndex: number) => void;
  bookAddOnsList: BookAddOnsInfo[];
  bookPreviews?: BookPreviewData[];
  sessionId?: string | null;
  orderIds?: string[];
}

const MiniFlipbook = ({ bookPreview, bookCount }: { bookPreview: BookPreviewData; bookCount: number }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = 1 + bookPreview.pageUrls.length;

  const goBack = () => setCurrentPage((p) => Math.max(0, p - 1));
  const goForward = () => setCurrentPage((p) => Math.min(totalPages - 1, p + 1));

  return (
    <div className="flex flex-col items-center gap-2">
      {bookCount > 1 && (
        <span className="text-xs font-semibold text-foreground">Book {bookPreview.bookIndex + 1}</span>
      )}
      <div className="relative w-full aspect-[3/4] bg-[#fffaf3] rounded-lg overflow-hidden border border-border" style={{ containerType: "inline-size" }}>
        {currentPage === 0 ? (
          <div className="w-full h-full">
            <div className="flex items-center justify-center" style={{ height: "14%", overflow: "hidden" }}>
              <img src={logoImg} alt="Piccoload" style={{ width: "50%" }} />
            </div>
            <div className="grid grid-cols-2 grid-rows-2" style={{ height: "65%", margin: "0 8%", gap: "0.7%" }}>
              {bookPreview.coverGridUrls.map((url, idx) => (
                <div key={idx} className="overflow-hidden bg-[#ede8e0]">
                  {url ? (
                    <img src={url} alt={`Cover ${idx + 1}`} className="w-full h-full object-cover object-center" />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center items-end" style={{ height: "21%", paddingRight: "8%" }}>
              <p className="uppercase text-foreground leading-none" style={{ fontFamily: "'Yuji Syuku', serif", fontSize: "3.2cqi", letterSpacing: 0 }}>
                {bookPreview.coverSubtitle || "FOR KIDS AND ADULTS ALIKE"}
              </p>
              <p className="leading-none" style={{ fontFamily: "Bristol, serif", fontSize: "4cqi", marginTop: "2.5%", color: "hsl(var(--foreground))" }}>
                {bookPreview.coverBottomTitle || "color your memories"}
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white relative">
            {bookPreview.pageUrls[currentPage - 1] ? (
              <img
                src={bookPreview.pageUrls[currentPage - 1]!}
                alt={`Page ${currentPage}`}
                className={`w-full h-full object-cover ${bookPreview.pageLandscape?.[currentPage - 1] ? "rotate-90 scale-[1.42]" : ""}`}
              />
            ) : (
              <span className="text-xs text-muted-foreground">Page {currentPage}</span>
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-lg font-display text-foreground/20 rotate-[-30deg] font-bold tracking-widest select-none">
                PREVIEW
              </span>
            </div>
          </div>
        )}

        {currentPage > 0 && (
          <button
            onClick={goBack}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-foreground/70 text-background flex items-center justify-center hover:bg-foreground transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
        {currentPage < totalPages - 1 && (
          <button
            onClick={goForward}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-foreground/70 text-background flex items-center justify-center hover:bg-foreground transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {currentPage === 0 ? "Cover" : `Page ${currentPage}`} / {totalPages - 1} pages
      </span>
    </div>
  );
};

const CheckoutStep = ({ pageCount, extraPages, convertedUrls, onBack, onCheckoutComplete, bookDigitalDownloads, onToggleBookDigitalDownload, bookAddOnsList, bookPreviews = [], sessionId, orderIds = [] }: CheckoutStepProps) => {
  const { item, setQuantity, pricingTiers, addOnPrice, uniquePhotos, uniquePhotosPrice } = useBasket();
  const personalizeCoverFromBasket = item?.personalizeCover ?? false;
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [awaitingPayment, setAwaitingPayment] = useState(false);

  // Latest order totals for the payment poller — the memoized callback below
  // would otherwise capture stale values from the render it was created in
  const purchaseTotalsRef = useRef({ value: 0, bookCount: 1 });

  // Poll for payment confirmation from webhook
  const pollForPayment = useCallback(async () => {
    if (!sessionId) return false;
    try {
      const orders = await getSessionOrders(sessionId);
      if (orders && orders.length > 0) {
        const allPaid = orders.every((o: any) => o.payment_status === "paid");
        if (allPaid) {
          const shopifyNum = orders[0]?.shopify_order_number || null;
          trackEvent("purchase", "/builder/checkout", {
            shopifyOrderNumber: shopifyNum,
            bookCount: orders.length,
          });
          metaPurchase(purchaseTotalsRef.current.value, purchaseTotalsRef.current.bookCount, shopifyNum);
          onCheckoutComplete?.(shopifyNum);
          return true;
        }
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
    return false;
  }, [sessionId, onCheckoutComplete]);

  // Poll every 2 seconds while awaiting payment, plus on tab visibility change
  const [checkingNow, setCheckingNow] = useState(false);
  useEffect(() => {
    if (!awaitingPayment) return;

    const interval = setInterval(async () => {
      const paid = await pollForPayment();
      if (paid) setAwaitingPayment(false);
    }, 2000);

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && awaitingPayment) {
        setCheckingNow(true);
        const paid = await pollForPayment();
        setCheckingNow(false);
        if (paid) setAwaitingPayment(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [awaitingPayment, pollForPayment]);

  const bookCount = item?.quantity ?? 1;
  const basePrice = item?.pricePerBook ?? 35;
  const originalBasePrice = item?.originalPricePerBook ?? 42;
  const extraPagesPrice = extraPages === 10 ? 6 : extraPages === 20 ? 10 : extraPages === 40 ? 18 : 0;
  const digitalCount = bookDigitalDownloads.filter(b => b.enabled).length;
  const digitalPrice = digitalCount * DIGITAL_DOWNLOAD_PRICE;
  // Count per-book add-ons
  const titlePageCount = bookAddOnsList.filter(b => b.titlePageEnabled).length;
  const rawCoverPersonalizeCount = bookAddOnsList.filter(b => b.dedicationPageEnabled).length;
  // Shared-photo bundles: charge once; unique-photos bundles: charge per book
  const coverPersonalizeCount = rawCoverPersonalizeCount > 0 && !uniquePhotos ? 1 : rawCoverPersonalizeCount;
  const perBookAddOnsTotal = (titlePageCount + coverPersonalizeCount) * addOnPrice;
  const personalizeCoverBooksCount = personalizeCoverFromBasket ? (uniquePhotos ? bookCount : 1) : 0;
  const basketPersonalizeCoverCost = personalizeCoverBooksCount * 1.99;
  const totalPrice = (basePrice + extraPagesPrice) * bookCount + (uniquePhotos ? uniquePhotosPrice : 0) + digitalPrice + perBookAddOnsTotal + basketPersonalizeCoverCost;
  purchaseTotalsRef.current = { value: totalPrice, bookCount };
  const originalTotalPrice = (originalBasePrice + extraPagesPrice) * bookCount + (uniquePhotos ? uniquePhotosPrice : 0) + digitalPrice + perBookAddOnsTotal;

  const maxQuantity = Math.max(...pricingTiers.map((t) => t.quantity));
  const handleDecrement = () => { if (bookCount > 1) setQuantity(bookCount - 1); };
  const handleIncrement = () => { if (bookCount < maxQuantity) setQuantity(bookCount + 1); };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    // Open window immediately in trusted click context to avoid popup blocking
    const newWindow = window.open('about:blank', '_blank');
    try {
      // Render and upload covers before checkout (fire-and-forget — don't block checkout)
      if (sessionId && orderIds.length > 0) {
        try {
          const coverPromises: Promise<unknown>[] = [];

          // Front covers — one per book
          for (let i = 0; i < orderIds.length; i++) {
            const preview = bookPreviews[i] ?? bookPreviews[0];
            if (!preview) continue;
            const frontBlob = renderFrontCoverPng(
              logoImg,
              preview.coverGridUrls,
              preview.coverSubtitle || "FOR KIDS AND ADULTS ALIKE",
              preview.coverBottomTitle || "color your memories",
            ).then((blob) => uploadCover(sessionId!, orderIds[i], "front", blob));
            coverPromises.push(frontBlob);
          }

          // Back cover is a static asset in storage (covers/shared/back-cover.png)
          // — no need to render or upload it here

          await Promise.allSettled(coverPromises);
          console.log("Covers uploaded successfully");
        } catch (coverErr) {
          console.warn("Cover upload failed (non-blocking):", coverErr);
        }
      }

      const lines: CartLineInput[] = [];

      // 1. Main product — pick the bundle variant matching this book count
      // ($31.99 / $49.99 / $59.99 priced on Shopify, so checkout math is exact)
      const bookVariant =
        bookCount === 2 ? SHOPIFY_VARIANTS.COLORING_BOOK_2_BUNDLE :
        bookCount === 3 ? SHOPIFY_VARIANTS.COLORING_BOOK_3_BUNDLE :
        SHOPIFY_VARIANTS.COLORING_BOOK;
      lines.push({
        merchandiseId: bookVariant,
        quantity: 1,
        attributes: [{ key: "_position", value: "1" }],
      });

      // 2. Unique photos (book-related upsell)
      if (uniquePhotos && bookCount > 1) {
        lines.push({
          merchandiseId: SHOPIFY_VARIANTS.UNIQUE_PHOTOS,
          quantity: 1,
          attributes: [
             { key: "Add-on for", value: "Personalized Coloring Book" },
            { key: "_position", value: "2" },
          ],
        });
      }

      // 3. Personalize cover (book-related upsell)
      const rawPersonalizeCount = bookAddOnsList.filter(b => b.titlePageEnabled).length;
      const personalizeCount = rawPersonalizeCount > 0 && !uniquePhotos ? 1 : rawPersonalizeCount;
      const basketPersonalizeCount = personalizeCoverFromBasket ? (uniquePhotos ? bookCount : 1) : 0;
      const totalPersonalizeCount = Math.max(personalizeCount, basketPersonalizeCount);
      if (totalPersonalizeCount > 0) {
        lines.push({
          merchandiseId: SHOPIFY_VARIANTS.PERSONALIZE_COVER,
          quantity: totalPersonalizeCount,
          attributes: [
             { key: "Add-on for", value: "Personalized Coloring Book" },
            { key: "_position", value: "3" },
          ],
        });
      }

      // 4. Digital download last (standalone add-on)
      const digitalCount2 = bookDigitalDownloads.filter(b => b.enabled).length;
      if (digitalCount2 > 0) {
        lines.push({
          merchandiseId: SHOPIFY_VARIANTS.DIGITAL_DOWNLOAD,
          quantity: digitalCount2,
          attributes: [
            { key: "Add-on for", value: "Personalized Coloring Book" },
            { key: "_position", value: "4" },
          ],
        });
      }

      // Track events for our admin dashboard + Shopify analytics
      trackEvent("add_to_cart", "/builder/checkout", { bookCount });
      trackEvent("checkout_initiated", "/builder/checkout", { bookCount });
      metaAddToCart(totalPrice, bookCount);
      metaInitiateCheckout(totalPrice, bookCount);
      trackAddToCart(
        lines.map((line) => ({
          productGid: "gid://shopify/Product/15269689852277",
          variantGid: line.merchandiseId,
          title:
            line.merchandiseId === SHOPIFY_VARIANTS.COLORING_BOOK ? "Personalised Coloring Book — 1 Book" :
            line.merchandiseId === SHOPIFY_VARIANTS.COLORING_BOOK_2_BUNDLE ? "Personalised Coloring Book — 2-Book Bundle" :
            line.merchandiseId === SHOPIFY_VARIANTS.COLORING_BOOK_3_BUNDLE ? "Personalised Coloring Book — 3-Book Bundle" :
            line.merchandiseId === SHOPIFY_VARIANTS.DIGITAL_DOWNLOAD ? "Instant Digital Download" :
            line.merchandiseId === SHOPIFY_VARIANTS.UNIQUE_PHOTOS ? "Unique Photos" :
            line.merchandiseId === SHOPIFY_VARIANTS.PERSONALIZE_COVER ? "Personalized Cover" : "Item",
          price:
            line.merchandiseId === SHOPIFY_VARIANTS.COLORING_BOOK ? "31.99" :
            line.merchandiseId === SHOPIFY_VARIANTS.COLORING_BOOK_2_BUNDLE ? "49.99" :
            line.merchandiseId === SHOPIFY_VARIANTS.COLORING_BOOK_3_BUNDLE ? "59.99" :
            line.merchandiseId === SHOPIFY_VARIANTS.DIGITAL_DOWNLOAD ? "5.99" :
            line.merchandiseId === SHOPIFY_VARIANTS.UNIQUE_PHOTOS ? "5.99" :
            line.merchandiseId === SHOPIFY_VARIANTS.PERSONALIZE_COVER ? "1.99" : "0",
          quantity: line.quantity,
        }))
      );

      const checkoutUrl = await createShopifyCheckout(lines, sessionId || undefined);
      if (checkoutUrl) {
        if (newWindow) {
          newWindow.location.href = checkoutUrl;
        } else {
          // Popup was blocked — open in same tab
          window.location.href = checkoutUrl;
          return;
        }
        setAwaitingPayment(true);
      } else {
        newWindow?.close();
      }
    } catch (error) {
      console.error('Checkout error:', error);
      newWindow?.close();
    } finally {
      setIsCheckingOut(false);
    }
  };

  // ── Awaiting payment UI ──
  if (awaitingPayment) {
    return (
      <div className="space-y-8">
         <div className="max-w-md mx-auto text-center py-16 space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            {checkingNow ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <Clock className="w-8 h-8 text-primary animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              {checkingNow ? "Checking payment…" : "Waiting for payment…"}
            </h2>
            <p className="text-muted-foreground mt-2">
              Complete your purchase in the Shopify tab. This page will update automatically.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={async () => {
              const paid = await pollForPayment();
              if (!paid) {
                // Fallback: proceed anyway if user insists
                setAwaitingPayment(false);
                onCheckoutComplete?.(null);
              }
            }}
          >
            I've completed payment
          </Button>
        </div>
      </div>
    );
  }

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
          <Card className="rounded-lg border-2 border-foreground">
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
                <>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary" />
                    <span>
                      Digital PDF download × {digitalCount} {digitalCount === 1 ? "book" : "books"} (20 pages each)
                    </span>
                    <Badge variant="secondary">Add-on</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    After checkout, come back to this page to create a free account — your digital downloads will be available anytime from your My Orders page.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Per-Book Digital Download Upsell */}
          <Card className="rounded-lg border-2 border-foreground overflow-hidden">
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
                    Get an instant printable PDF of your coloring book emailed to you, so you have extra copies to color any time!
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {bookDigitalDownloads.map((bd) => (
                  <div
                    key={bd.bookIndex}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${bd.enabled ? "border-primary bg-primary/5" : "border-border bg-background"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={bd.enabled}
                        onCheckedChange={() => onToggleBookDigitalDownload(bd.bookIndex)}
                      />
                      <div>
                        <span className="font-semibold text-foreground text-sm">
                          {bookDigitalDownloads.length > 1 ? `Book ${bd.bookIndex + 1}` : "Digital PDF"}
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

          {/* Book Previews */}
          {bookPreviews.length > 0 && (
            <Card className="rounded-lg border-2 border-foreground">
              <CardHeader>
                <CardTitle className="font-display text-lg">Book Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-4 ${bookPreviews.length > 1 ? "grid-cols-2" : "grid-cols-1 max-w-[240px] mx-auto"}`}>
                  {bookPreviews.map((bp) => (
                    <MiniFlipbook key={bp.bookIndex} bookPreview={bp} bookCount={bookPreviews.length} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Price Summary */}
        <div>
          <Card className="rounded-lg border-2 border-foreground sticky top-24">
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

              {digitalCount > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-sm font-bold text-foreground">
                    To access your digital PDF after purchase, create a free account using the same email you use at checkout.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your PDF will be waiting in your My Orders page. Already have an account? Just sign in after payment.
                  </p>
                </div>
              )}

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
                Watermarks will be removed after payment.
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
