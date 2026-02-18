import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingCart, Minus, Plus, Trash2, Download, Shield, ClipboardList } from "lucide-react";
import { useState, useEffect } from "react";
import { useBasket, DIGITAL_TIERS } from "@/contexts/BasketContext";
import { useIsAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { item, setQuantity, pricingTiers, digitalDownload, setDigitalDownload, addOnsTotal: basketAddOnsTotal } = useBasket();
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
    { href: "/contact", label: "Contact Us" },
  ];

  const maxQuantity = Math.max(...pricingTiers.map((t) => t.quantity));
  const hasItems = !!(item || digitalDownload);
  const itemCount = (item?.quantity ?? 0) + (digitalDownload ? 1 : 0);

  const bookTotal = item ? item.totalPrice : 0;
  const digitalTotal = digitalDownload?.price ?? 0;
  const grandTotal = bookTotal + digitalTotal + basketAddOnsTotal;

  const BasketContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 py-4">
        {!hasItems && (
          <p className="text-center text-muted-foreground py-12 text-sm">
            Your basket is empty
          </p>
        )}

        {item && (
          <div className="space-y-3 p-4 rounded-2xl border border-border bg-background">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-sm">
                Coloring {item.quantity === 1 ? "Book" : "Books"}
              </span>
              <button
                onClick={() => setQuantity(0)}
                className="text-destructive hover:text-destructive/80 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Quantity</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (item.quantity > 1) setQuantity(item.quantity - 1); }}
                  disabled={item.quantity <= 1}
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-semibold text-foreground w-5 text-center text-sm">{item.quantity}</span>
                <button
                  onClick={() => { if (item.quantity < maxQuantity) setQuantity(item.quantity + 1); }}
                  disabled={item.quantity >= maxQuantity}
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">${item.pricePerBook.toFixed(2)} each</span>
              <span className="font-semibold">${item.totalPrice.toFixed(2)}</span>
            </div>
          </div>
        )}

        {digitalDownload && (
          <div className="space-y-3 p-4 rounded-2xl border border-border bg-background">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">
                  Digital Download
                </span>
              </div>
              <button
                onClick={() => setDigitalDownload(null)}
                className="text-destructive hover:text-destructive/80 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{digitalDownload.pages} pages (PDF)</span>
              <span className="font-semibold">${digitalDownload.price.toFixed(2)}</span>
            </div>
            {/* Change tier */}
            <div className="flex gap-2">
              {DIGITAL_TIERS.map((tier) => (
                <button
                  key={tier.pages}
                  onClick={() => setDigitalDownload({ pages: tier.pages, price: tier.price })}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                    digitalDownload.pages === tier.pages
                      ? "border-primary bg-primary/10 text-foreground font-semibold"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {tier.pages}pg
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasItems && (
        <div className="border-t border-border pt-4 space-y-4">
          <div className="flex justify-between font-semibold text-foreground">
            <span>Total</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
          <Button asChild className="w-full rounded-2xl py-5" size="lg">
            <Link to="/builder">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Continue to Builder
            </Link>
          </Button>
        </div>
      )}
    </div>
  );

  const CartButton = () => (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative p-2 hover:bg-muted rounded-xl transition-colors">
          <ShoppingCart className="w-5 h-5 text-foreground" />
          {hasItems && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full">
              {itemCount}
            </Badge>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-[350px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="font-display">Your Basket</SheetTitle>
        </SheetHeader>
        <BasketContent />
      </SheetContent>
    </Sheet>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img alt="Piccoload – From pic to pen" className="h-10 w-auto" src="/lovable-uploads/bc0afa55-54e9-40fc-b263-333f5ed085bc.png" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
            {isLoggedIn && !isAdmin && (
              <Link
                to="/my-orders"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                My Orders
              </Link>
            )}
          </div>

          {/* CTA + Cart */}
          <div className="hidden md:flex items-center space-x-4">
            <CartButton />
            <Button asChild className="rounded-2xl px-6">
              <Link to="/builder">Start Creating</Link>
            </Button>
          </div>

          {/* Mobile Menu Button + Cart */}
          <div className="md:hidden flex items-center gap-2">
            <CartButton />
            <button
              className="p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-foreground" />
              ) : (
                <Menu className="h-6 w-6 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2 flex items-center gap-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </Link>
              )}
              {isLoggedIn && !isAdmin && (
                <Link
                  to="/my-orders"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2 flex items-center gap-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  My Orders
                </Link>
              )}
              <Button asChild className="rounded-2xl mx-2">
                <Link to="/builder" onClick={() => setIsMenuOpen(false)}>
                  Start Creating
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
