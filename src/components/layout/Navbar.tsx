import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingCart, Minus, Plus, Trash2, Shield, ClipboardList, Sparkles, Tag } from "lucide-react";
import { useState, useEffect } from "react";
import { useBasket, DIGITAL_DOWNLOAD_PRICE, UNIQUE_PHOTOS_PRICE } from "@/contexts/BasketContext";
import { useIsAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger } from
"@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { item, setQuantity, pricingTiers, digitalCopies, setDigitalCopies, digitalPrice, addOns, addOnsTotal: basketAddOnsTotal, addOnPrice, uniquePhotos, setUniquePhotos, uniquePhotosPrice, activeSessionId } = useBasket();
  const { isAdmin } = useIsAdmin();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const navLinks = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Shop" },
  { href: "/about", label: "Our Story" },
  { href: "/contact", label: "Contact Us" }];


  const maxQuantity = Math.max(...pricingTiers.map((t) => t.quantity));
  const hasItems = !!(item || digitalCopies > 0);
  const itemCount = (item?.quantity ?? 0) + (digitalCopies > 0 ? 1 : 0) + (uniquePhotos ? 1 : 0);

  const bookTotal = item ? item.totalPrice : 0;
  const grandTotal = bookTotal + digitalPrice + basketAddOnsTotal + uniquePhotosPrice;

  const savings = item ? item.originalTotalPrice - item.totalPrice : 0;
  const totalDiscount = savings;

  const BasketContent = () =>
  <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 py-4">
        {/* Next steps banner */}
        <div className="bg-foreground text-background rounded-lg p-4 text-xs leading-relaxed">
          <div className="flex gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              <span className="font-semibold">You're in good hands!</span> After your purchase, we'll email you clear, easy-to-follow steps to upload your photos for your one-of-a-kind coloring book.
            </p>
          </div>
        </div>

        {/* Free shipping bar */}
        <div className="space-y-2">
          <p className="text-center font-semibold text-foreground text-base">Free shipping unlocked!</p>
          <div className="relative">
            <Progress value={100} className="h-3 bg-muted [&>div]:bg-foreground rounded-full" />
            <div className="absolute -right-1 -top-1 bg-foreground text-background rounded-full w-5 h-5 flex items-center justify-center">
              <Tag className="w-3 h-3" />
            </div>
          </div>
          <p className="text-right text-xs text-muted-foreground font-medium">Free Shipping</p>
        </div>

        {!hasItems &&
      <p className="text-center text-muted-foreground py-12 text-sm">
            Your basket is empty
          </p>
      }

        {/* Main item card */}
        {item &&
      <div className="rounded-lg border border-border bg-background p-3 space-y-3">
            <div className="flex gap-3">
              <img
            src="/lovable-uploads/d741aeb9-21af-45e1-9863-e350da643d42.png"
            alt="Personalised Coloring Book"
            className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between">
                  <span className="font-semibold text-foreground text-sm leading-tight">Personalised Coloring Book</span>
                  <button
                onClick={() => setQuantity(0)}
                className="text-muted-foreground hover:text-destructive transition-colors p-0.5">

                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {/* Quantity controls */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                onClick={() => {if (item.quantity > 1) setQuantity(item.quantity - 1);}}
                disabled={item.quantity <= 1}
                className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 text-xs">

                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-semibold text-foreground w-5 text-center text-sm">{item.quantity}</span>
                  <button
                onClick={() => {if (item.quantity < maxQuantity) setQuantity(item.quantity + 1);}}
                disabled={item.quantity >= maxQuantity}
                className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 text-xs">

                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {/* Pricing */}
                <div className="flex items-center gap-2 text-sm pt-0.5">
                  <span className="line-through text-muted-foreground">${item.originalTotalPrice.toFixed(2)}</span>
                  <span className="font-bold text-foreground">${item.totalPrice.toFixed(2)}</span>
                  {savings > 0 &&
              <span className="text-green-600 text-xs font-medium">(Save ${savings.toFixed(2)})</span>
              }
                </div>
              </div>
            </div>
            {/* Sale badge */}
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-0 px-2 py-0.5">
                <Sparkles className="w-3 h-3 mr-1" />
                February Sale
              </Badge>
            </div>
          </div>
      }

        {/* Digital copies upsell */}
        




























        {/* Unique photos upsell */}
        {uniquePhotos &&
      <div className="space-y-3 p-3 rounded-lg border border-border bg-background">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-sm">Unique Photos Per Book</span>
              <button onClick={() => setUniquePhotos(false)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Different photos for each book</span>
              <span className="font-semibold">${UNIQUE_PHOTOS_PRICE.toFixed(2)}</span>
            </div>
          </div>
      }

        {addOns.dedicationPageEnabled &&
      <div className="space-y-3 p-3 rounded-lg border border-border bg-background">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-sm">Personalized Cover</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Custom cover text</span>
              <span className="font-semibold">${addOnPrice.toFixed(2)}</span>
            </div>
          </div>
      }
      </div>

      {/* Footer */}
      {hasItems &&
    <div className="border-t border-border pt-4 space-y-4 flex-shrink-0">
          {/* Discounts line */}
          {totalDiscount > 0 &&
      <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-foreground font-medium text-base">Discounts</span>
                <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-muted text-foreground border-0 px-2.5 py-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  February Sale
                </Badge>
              </div>
              <span className="text-foreground font-medium text-base">– ${totalDiscount.toFixed(2)}</span>
            </div>
      }

          <Button asChild className="w-full rounded-lg py-6 text-base font-bold bg-foreground text-background hover:bg-foreground/90" size="lg">
            <Link to={activeSessionId ? `/builder?sessionId=${activeSessionId}` : "/builder"}>
              Checkout • ${grandTotal.toFixed(2)}
            </Link>
          </Button>

          {/* Payment trust badges */}
          <div className="flex items-center justify-center gap-2 flex-wrap pb-2">
            {[
              { name: "Apple Pay", svg: <svg viewBox="0 0 50 20" className="h-5 w-auto"><text x="3" y="15" fontSize="11" fontFamily="system-ui" fontWeight="600" fill="currentColor">Pay</text></svg> },
            ].map(() => null)}
            {["Apple Pay", "G Pay", "PayPal", "AMEX", "VISA", "Mastercard", "Maestro", "Shop Pay"].map((method) =>
        <span
          key={method}
          className="text-[9px] font-bold tracking-wide border border-border rounded-md px-2 py-1.5 text-muted-foreground">
                {method}
              </span>
        )}
          </div>
        </div>
    }
    </div>;


  const CartButton = () =>
  <Sheet>
      <SheetTrigger asChild>
        <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
          <ShoppingCart className="w-5 h-5 text-foreground" />
          {hasItems &&
        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full">
              {itemCount}
            </Badge>
        }
        </button>
      </SheetTrigger>
      <SheetContent className="w-[350px] sm:w-[400px]">
      <SheetHeader>
          <SheetTitle className="font-display text-lg font-bold">Cart {hasItems ? `• ${itemCount}` : ''}</SheetTitle>
        </SheetHeader>
        <BasketContent />
      </SheetContent>
    </Sheet>;


  return (
    <nav className="sticky top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center h-16">
          {/* Left: Navigation (desktop) / Hamburger (mobile) */}
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                className="p-2"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu">

                {isMenuOpen ?
                <X className="h-6 w-6 text-foreground" /> :

                <Menu className="h-6 w-6 text-foreground" />
                }
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) =>
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-foreground hover:text-foreground/70 transition-colors">

                  {link.label}
                </Link>
              )}
              {isAdmin &&
              <Link
                to="/admin"
                className="text-sm font-medium text-foreground hover:text-foreground/70 transition-colors flex items-center gap-1">

                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </Link>
              }
              {isLoggedIn &&
              <Link
                to="/my-orders"
                className="text-sm font-medium text-foreground hover:text-foreground/70 transition-colors flex items-center gap-1">

                  <ClipboardList className="w-3.5 h-3.5" />
                  My Orders
                </Link>
              }
            </div>
          </div>

          {/* Center: Logo (absolutely centered) */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex items-center">
            <img alt="Piccoload – From pic to pen" className="h-14 w-auto" src="/lovable-uploads/piccoload-logo-large.png" />
          </Link>

          {/* Right: Cart + CTA */}
          <div className="ml-auto flex items-center gap-3">
            <CartButton />
            <Button asChild className="hidden md:inline-flex rounded-lg px-6 bg-foreground text-background hover:bg-foreground/90">
              <Link to="/pricing">Start Creating</Link>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen &&
        <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) =>
            <Link
              key={link.href}
              to={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
              onClick={() => setIsMenuOpen(false)}>

                  {link.label}
                </Link>
            )}
              {isAdmin &&
            <Link
              to="/admin"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2 flex items-center gap-1"
              onClick={() => setIsMenuOpen(false)}>

                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </Link>
            }
              {isLoggedIn &&
            <Link
              to="/my-orders"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2 flex items-center gap-1"
              onClick={() => setIsMenuOpen(false)}>

                  <ClipboardList className="w-3.5 h-3.5" />
                  My Orders
                </Link>
            }
              <Button asChild className="rounded-lg mx-2">
                <Link to="/pricing" onClick={() => setIsMenuOpen(false)}>
                  Start Creating
                </Link>
              </Button>
            </div>
          </div>
        }
      </div>
    </nav>);

};

export default Navbar;