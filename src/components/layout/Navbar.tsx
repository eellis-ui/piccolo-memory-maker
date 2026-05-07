import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingCart, Minus, Plus, Trash2, Shield, ClipboardList, Sparkles, Tag, Check, Download, Loader2, Lock, Users, UserCircle2, LogOut } from "lucide-react";
import { createShopifyCheckout, SHOPIFY_VARIANTS, type CartLineInput } from "@/lib/shopify";
import { trackAddToCart } from "@/lib/shopify-analytics";
import { trackEvent } from "@/lib/analytics-tracker";
import { useState, useCallback, useEffect } from "react";
import { useBasket, UNIQUE_PHOTOS_PRICE, DIGITAL_DOWNLOAD_PRICE, PERSONALIZE_COVER_PRICE } from "@/contexts/BasketContext";
import { useIsAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Basket content (extracted outside Navbar to prevent remount on re-render) ──
interface BasketContentProps {
  hasItems: boolean;
  items: ReturnType<typeof useBasket>["items"];
  totalBookCount: number;
  totalDiscount: number;
  addOns: ReturnType<typeof useBasket>["addOns"];
  addOnPrice: number;
  activeSessionId: string | null;
  setIsCartOpen: (open: boolean) => void;
  removeItem: (id: string) => void;
  updateItemQuantity: (id: string, newQuantity: number) => void;
  toggleItemUniquePhotos: (id: string) => void;
  toggleItemPersonalizeCover: (id: string) => void;
  digitalCopies: number;
  setDigitalCopies: (n: number) => void;
  isCheckingOut: boolean;
  onCheckout: () => void;
  onNavigateToBuilder: () => void;
  grandTotal: number;
}

const BasketContent = ({
  hasItems,
  items,
  totalBookCount,
  totalDiscount,
  addOns,
  addOnPrice,
  activeSessionId,
  setIsCartOpen,
  removeItem,
  updateItemQuantity,
  toggleItemUniquePhotos,
  toggleItemPersonalizeCover,
  digitalCopies,
  setDigitalCopies,
  isCheckingOut,
  onCheckout,
  onNavigateToBuilder,
  grandTotal
}: BasketContentProps) =>
<div className="flex flex-col h-full">
    <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 py-4">
      {/* Next steps banner */}
      






    

      {/* Free shipping bar */}
      {(() => {
      const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
      const FREE_SHIPPING_THRESHOLD = 35;
      const unlocked = subtotal >= FREE_SHIPPING_THRESHOLD;
      const amountRemaining = (FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2);
      return (
        <p className="text-center text-xs text-muted-foreground py-1">
          {unlocked ? <span className="font-bold text-foreground">✓ Free shipping unlocked!</span> : <>Free shipping on orders over $35 · <span className="font-medium">${amountRemaining} away</span></>}
        </p>);
    })()}

      {!hasItems &&
    <p className="text-center text-muted-foreground py-12 text-sm">
          Your basket is empty
        </p>
    }

      {/* Item cards */}
      {items.map((lineItem) => {
      const lineSavings = lineItem.originalTotalPrice - lineItem.totalPrice;
      return (
        <div key={lineItem.id} className="rounded-lg border border-border bg-background p-3 space-y-3">
            <div className="flex gap-3">
              <img
              src="/lovable-uploads/67e8bc18-d4da-4d1e-bb5c-8235ea57eb6d.png"
              alt="Personalized Coloring Book"
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between">
                  <span className="font-semibold text-foreground text-sm leading-tight">
                    {lineItem.quantity === 1 ? 'Personalized Coloring Book' : `${lineItem.quantity}x Coloring Book Bundle`}
                  </span>
                  <button
                  onClick={() => removeItem(lineItem.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-0.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{lineItem.quantity} {lineItem.quantity === 1 ? 'book' : 'books'}</p>
                {/* Quantity controls */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                  onClick={() => updateItemQuantity(lineItem.id, lineItem.quantity - 1)}
                  disabled={lineItem.quantity <= 1}
                  className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-foreground disabled:opacity-30 hover:bg-muted transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-semibold text-foreground w-4 text-center">{lineItem.quantity}</span>
                  <button
                  onClick={() => updateItemQuantity(lineItem.id, lineItem.quantity + 1)}
                  disabled={lineItem.quantity >= 3}
                  className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-foreground disabled:opacity-30 hover:bg-muted transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-muted-foreground">${lineItem.pricePerBook.toFixed(2)}/book</span>
                </div>
                {/* Pricing */}
                <div className="flex items-center gap-2 text-sm pt-0.5">
                  <span className="line-through text-muted-foreground">${lineItem.originalTotalPrice.toFixed(2)}</span>
                  <span className="font-bold text-foreground">${lineItem.totalPrice.toFixed(2)}</span>
                  {lineSavings > 0 &&
                <span className="text-green-600 text-xs font-medium">(Save ${lineSavings.toFixed(2)})</span>
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
            {/* Per-bundle unique photos toggle (only for 2+ book bundles) */}
            {lineItem.quantity > 1 && (
            <button
            onClick={() => toggleItemUniquePhotos(lineItem.id)}
            className={`flex items-center justify-between w-full p-2.5 rounded-lg border text-left text-xs transition-all ${
            lineItem.uniquePhotos ?
            'border-green-500 bg-green-50 dark:bg-green-950/30' :
            'border-dashed border-muted-foreground/30 bg-transparent hover:border-muted-foreground/50'}`
            }>

              <span className="flex items-center gap-1.5">
                {lineItem.uniquePhotos ?
              <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span className="font-semibold text-green-700 dark:text-green-400">Unique photos per book</span>
                    <span className="text-[10px] font-bold uppercase bg-green-500 text-white px-1.5 py-0.5 rounded-full leading-none">Added</span>
                  </> :

              <>
                    <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">Unique photos per book</span>
                  </>
              }
              </span>
              <span className={`font-semibold ${lineItem.uniquePhotos ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                ${UNIQUE_PHOTOS_PRICE.toFixed(2)}
              </span>
            </button>
            )}
            {/* Personalize cover toggle */}
            <button
              onClick={() => toggleItemPersonalizeCover(lineItem.id)}
              className={`flex items-center justify-between w-full p-2.5 rounded-lg border text-left text-xs transition-all ${
                lineItem.personalizeCover ?
                'border-green-500 bg-green-50 dark:bg-green-950/30' :
                'border-dashed border-muted-foreground/30 bg-transparent hover:border-muted-foreground/50'}`
              }>
              <span className="flex items-center gap-1.5">
                {lineItem.personalizeCover ?
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span className="font-semibold text-green-700 dark:text-green-400">Personalized cover</span>
                    <span className="text-[10px] font-bold uppercase bg-green-500 text-white px-1.5 py-0.5 rounded-full leading-none">Added</span>
                  </> :
                  <>
                    <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">Personalized cover</span>
                  </>
                }
              </span>
              <span className={`font-semibold ${lineItem.personalizeCover ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                ${((lineItem.uniquePhotos ? lineItem.quantity : 1) * 1.99).toFixed(2)}
              </span>
            </button>
          </div>);

    })}

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

        {/* Digital download upsell */}
        <div className={`rounded-lg border-2 px-4 py-3 space-y-2 transition-all ${
          digitalCopies > 0
            ? 'border-primary bg-primary/10'
            : 'border-primary/50 bg-primary/5 animate-pulse-subtle'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">📥 Add Digital PDF</span>
                <span className="text-[10px] text-primary font-semibold">Most popular add-on!</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-bold text-foreground">${DIGITAL_DOWNLOAD_PRICE.toFixed(2)}</span>
              <Switch
                checked={digitalCopies > 0}
                onCheckedChange={(checked) => setDigitalCopies(checked ? 1 : 0)}
                className="shrink-0"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">Get all your line art as a <strong className="text-foreground">printable PDF</strong> — color as many times as you like!</p>
        </div>

        {/* Discounts line */}
        {totalDiscount > 0 &&
    <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-foreground font-medium text-sm">Discounts</span>
              <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider bg-muted text-foreground border-0 px-2 py-0.5 flex items-center gap-0.5">
                <Tag className="w-2.5 h-2.5" />
                February Sale
              </Badge>
            </div>
            <span className="text-foreground font-medium text-sm">– ${totalDiscount.toFixed(2)}</span>
          </div>
    }

        <Button
          className="w-full rounded-lg py-6 text-base font-bold bg-foreground text-background hover:bg-foreground/90"
          size="lg"
          onClick={() => {
            setIsCartOpen(false);
            onNavigateToBuilder();
          }}
        >
          Go To Next Step — ${grandTotal.toFixed(2)}
        </Button>

        {/* Payment trust badges */}
        <div className="flex items-center justify-center gap-1 pb-2">
          <span className="border border-border rounded px-1.5 py-0.5 flex items-center justify-center h-6 w-9">
            <svg viewBox="0 0 50 20" className="h-3 w-auto">
              <path d="M9.6 5.4c-.6.7-1.5 1.3-2.4 1.2-.1-1 .4-2 .9-2.6C8.7 3.3 9.7 2.7 10.5 2.7c.1 1-.3 2-.9 2.7zm.9 1.4c-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.3 1 8.4.7 1 1.5 2.2 2.6 2.1 1-.1 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7 1.1 0 1.8-1 2.5-2.1.8-1.2 1.1-2.3 1.1-2.4 0 0-2.2-.8-2.2-3.2 0-2 1.6-2.9 1.7-3-.9-1.4-2.4-1.5-2.9-1.5z" fill="#000" />
              <path d="M20 4.2c3.2 0 5.4 2.2 5.4 5.4 0 3.2-2.3 5.4-5.5 5.4h-3.5v5.6h-2.6V4.2H20zm-3.6 8.6h2.9c2.2 0 3.5-1.2 3.5-3.2 0-2-1.3-3.2-3.5-3.2h-2.9v6.4zm10.2 4.3c0-2.1 1.6-3.4 4.5-3.5l3.3-.2v-.9c0-1.3-.9-2.1-2.4-2.1-1.4 0-2.3.7-2.5 1.7h-2.4c.1-2.2 2-3.8 5-3.8 2.9 0 4.8 1.6 4.8 4v8.3h-2.4v-2h-.1c-.7 1.4-2.2 2.2-3.8 2.2-2.4.1-4-1.5-4-3.7zm7.8-1.1V15l-3 .2c-1.5.1-2.3.7-2.3 1.7s.9 1.7 2.1 1.7c1.7 0 3.2-1.2 3.2-2.6zm4.6 7.6v-2c.2 0 .6.1.8.1 1.2 0 1.8-.5 2.2-1.8l.2-.8-4.6-12.8h2.7l3.2 10.4h.1l3.2-10.4h2.6L45 21.4c-1.1 3-2.3 4-4.9 4-.2 0-.8 0-1.1-.1z" fill="#000" />
            </svg>
          </span>
          <span className="border border-border rounded px-1.5 py-0.5 flex items-center justify-center h-6 w-9">
            <svg viewBox="0 0 40 16" className="h-2.5 w-auto">
              <path d="M15.5 8.1V12h-1.2V2h3.2c.8 0 1.5.3 2 .8s.8 1.2.8 2-.3 1.4-.8 2c-.5.5-1.2.8-2 .8h-2v.5zm0-4.9v3.7h2c.5 0 .9-.2 1.2-.5.3-.3.5-.8.5-1.3s-.2-1-.5-1.3c-.3-.4-.7-.6-1.2-.6h-2z" fill="#3C4043" />
              <path d="M23.5 5.3c.9 0 1.6.2 2.1.7.5.5.8 1.2.8 2v4h-1.2v-.9c-.4.7-1.1 1-2 1-.7 0-1.4-.2-1.8-.6-.5-.4-.7-.9-.7-1.5 0-.6.2-1.1.7-1.5.5-.4 1.1-.5 1.9-.5.7 0 1.3.2 1.7.5v-.4c0-.5-.2-.8-.5-1.1-.3-.3-.7-.4-1.2-.4-.7 0-1.3.3-1.6.9l-1-.4c.5-.9 1.3-1.3 2.4-1.3h.4zm-1.5 5c0 .3.1.6.4.8.3.2.6.3 1 .3.5 0 1-.2 1.4-.6.4-.4.6-.8.6-1.3-.4-.3-.9-.5-1.6-.5-.5 0-.9.1-1.2.4-.4.2-.6.5-.6.9z" fill="#3C4043" />
              <path d="M31.5 5.5l-3.8 8.7h-1.3l1.4-3.1-2.5-5.6h1.3l1.8 4.2 1.7-4.2h1.4z" fill="#3C4043" />
              <path d="M10.1 7.3c0-.4 0-.8-.1-1.1H5.2v2.1h2.8c-.1.6-.5 1.2-1 1.6v1.3h1.6c1-.9 1.5-2.2 1.5-3.9z" fill="#4285F4" />
              <path d="M5.2 11.4c1.3 0 2.5-.4 3.3-1.2l-1.6-1.3c-.4.3-1 .5-1.7.5-1.3 0-2.4-.9-2.8-2h-1.7v1.3c.8 1.6 2.5 2.7 4.5 2.7z" fill="#34A853" />
              <path d="M2.4 7.4c-.1-.3-.2-.7-.2-1.1s.1-.7.2-1.1V3.9H.7C.3 4.7 0 5.6 0 6.5s.2 1.7.7 2.5l1.7-1.6z" fill="#FBBC04" />
              <path d="M5.2 3.2c.7 0 1.4.3 1.9.7l1.4-1.4C7.6 1.7 6.5 1.2 5.2 1.2 3.2 1.2 1.5 2.3.7 3.9l1.7 1.3c.4-1.2 1.5-2 2.8-2z" fill="#EA4335" />
            </svg>
          </span>
          <span className="border border-border rounded px-1.5 py-0.5 flex items-center justify-center h-6 w-9">
            <svg viewBox="0 0 24 28" className="h-3.5 w-auto">
              <path d="M20.1 7.4c.2-1.5 0-2.5-.8-3.4C18.4 2.9 16.5 2.2 14 2.2H6.5c-.4 0-.8.3-.9.7L3 22.5c0 .3.2.6.5.6h4l1-6.4-.1.2c.1-.4.5-.7.9-.7h1.9c3.7 0 6.5-1.5 7.4-5.8.1-.1.1-.3.1-.4.3-1.6.2-2.8-.6-3.6z" fill="#003087" />
              <path d="M20.1 7.4c-.8 4.3-3.7 7-8.3 7h-1.5c-.4 0-.8.3-.9.7L8 22.9c0 .3.2.5.5.5h3.3c.4 0 .7-.3.8-.6l.7-4.5c.1-.4.4-.6.8-.6h.5c3.3 0 5.9-1.3 6.6-5.2.3-1.6.1-2.9-.7-3.8-.1-.1-.3-.2-.4-.3z" fill="#0070E0" />
              <path d="M9.6 7.5c.1-.2.2-.4.4-.5.1-.1.3-.1.5-.1h5.5c.6 0 1.2.1 1.7.1.1 0 .3.1.4.1.5.2.9.4 1.2.7.2-1.5 0-2.5-.8-3.4C17.6 3.3 15.7 2.6 13.2 2.6H5.7c-.4 0-.8.3-.9.7L2.2 22.9c0 .3.2.6.5.6h4l1-6.4 1.9-9.6z" fill="#001C64" />
            </svg>
          </span>
          <span className="border border-border rounded px-1 py-0.5 flex items-center justify-center h-6 w-9 bg-[#006FCF]">
            <span className="text-[7px] font-black text-white tracking-tight leading-none">AMEX</span>
          </span>
          <span className="border border-border rounded px-1.5 py-0.5 flex items-center justify-center h-6 w-9">
            <svg viewBox="0 0 48 16" className="h-2.5 w-auto">
              <path d="M19.1 1l-5.4 14h-3.5L7.1 4.3c-.2-.7-.3-1-.8-1.3C5.3 2.5 3.8 2 2.5 1.7l.1-.3h5.6c.7 0 1.4.5 1.5 1.3l1.4 7.4L14.6 1h3.5V1zM33.2 10.1c0-3.6-5-3.8-5-5.4 0-.5.5-1 1.5-1.1.5-.1 1.9-.1 3.5.7l.6-2.9c-.8-.3-1.9-.6-3.3-.6-3.5 0-6 1.9-6 4.5 0 2 1.8 3.1 3.1 3.7 1.4.7 1.8 1.1 1.8 1.7 0 .9-1.1 1.3-2.1 1.4-1.8 0-2.8-.5-3.6-.9l-.6 3c.8.4 2.3.7 3.9.7 3.7 0 6.2-1.8 6.2-4.8zM41.5 15h3.1L41.9 1h-2.9c-.6 0-1.2.4-1.4.9L33 15h3.5l.7-1.9h4.3l.4 1.9h-.4zM37.9 10.3l1.8-4.9 1 4.9h-2.8zM17.2 1L14.5 15h-3.3L13.9 1h3.3z" fill="#1A1F71" />
            </svg>
          </span>
          <span className="border border-border rounded px-1.5 py-0.5 flex items-center justify-center h-6 w-9">
            <svg viewBox="0 0 32 20" className="h-3 w-auto">
              <circle cx="11" cy="10" r="7" fill="#EB001B" />
              <circle cx="21" cy="10" r="7" fill="#F79E1B" />
              <path d="M16 4.6c1.8 1.3 3 3.3 3 5.4s-1.2 4.1-3 5.4c-1.8-1.3-3-3.3-3-5.4s1.2-4.1 3-5.4z" fill="#FF5F00" />
            </svg>
          </span>
          <span className="border border-border rounded px-1.5 py-0.5 flex items-center justify-center h-6 w-9">
            <svg viewBox="0 0 32 20" className="h-3 w-auto">
              <circle cx="11" cy="10" r="7" fill="#0099DF" />
              <circle cx="21" cy="10" r="7" fill="#000" />
              <path d="M16 4.6c1.8 1.3 3 3.3 3 5.4s-1.2 4.1-3 5.4c-1.8-1.3-3-3.3-3-5.4s1.2-4.1 3-5.4z" fill="#00588B" />
            </svg>
          </span>
          <span className="border border-border rounded px-1 py-0.5 flex items-center justify-center h-6 w-9 bg-[#5A31F4]">
            <span className="text-[6px] font-bold text-white tracking-tight leading-none">Shop Pay</span>
          </span>
        </div>
      </div>
  }
  </div>;


// ── Cart button + sheet (extracted outside Navbar to prevent remount) ──
interface CartButtonProps {
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  hasItems: boolean;
  itemCount: number;
  basketContentProps: BasketContentProps;
}

const CartButton = ({ isCartOpen, setIsCartOpen, hasItems, itemCount, basketContentProps }: CartButtonProps) =>
<Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
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
      <BasketContent {...basketContentProps} />
    </SheetContent>
  </Sheet>;


const Navbar = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { items, totalBookCount, removeItem, updateItemQuantity, toggleItemUniquePhotos, toggleItemPersonalizeCover, digitalCopies, setDigitalCopies, digitalPrice, addOns, addOnsTotal: basketAddOnsTotal, addOnPrice, uniquePhotos, uniquePhotosPrice, activeSessionId, isCartOpen, setIsCartOpen } = useBasket();
  const { isAdmin } = useIsAdmin();
  const { user, loading: authLoading } = useAuth();
  const isLoggedIn = !!user;
  const [isAffiliate, setIsAffiliate] = useState(false);

  useEffect(() => {
    if (!user) { setIsAffiliate(false); return; }
    supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setIsAffiliate(!!data))
      .catch(() => setIsAffiliate(false));
  }, [user]);

  const navLinks = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Shop" },
  { href: "/about", label: "Our Story" },
  { href: "/contact", label: "Contact Us" }];


  const hasItems = items.length > 0 || digitalCopies > 0;
  const itemCount = totalBookCount + (digitalCopies > 0 ? 1 : 0) + (uniquePhotos ? 1 : 0);

  const bookTotal = items.reduce((s, i) => s + i.totalPrice, 0);
  const uniquePhotosTotal = items.filter((i) => i.uniquePhotos).reduce((s) => s + UNIQUE_PHOTOS_PRICE, 0);
  const personalizeCoverTotal = items.reduce((s, i) => {
    if (!i.personalizeCover) return s;
    return s + (i.uniquePhotos ? i.quantity * PERSONALIZE_COVER_PRICE : PERSONALIZE_COVER_PRICE);
  }, 0);
  const digitalTotal = digitalCopies > 0 ? DIGITAL_DOWNLOAD_PRICE : 0;
  const grandTotal = bookTotal + uniquePhotosTotal + personalizeCoverTotal + digitalTotal;

  const totalOriginal = items.reduce((s, i) => s + i.originalTotalPrice, 0);
  const totalDiscount = totalOriginal - bookTotal;

  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = useCallback(async () => {
    setIsCheckingOut(true);
    try {
      const lines: CartLineInput[] = [];
      // Digital print-out is an alternative to the physical book. If any digital_print
      // item is in the cart, send the digital variant instead of the coloring book.
      const digitalPrintCount = items.filter((i) => i.kind === "digital_print").length;
      if (digitalPrintCount > 0) {
        lines.push({ merchandiseId: SHOPIFY_VARIANTS.DIGITAL_PRINT_OUT, quantity: digitalPrintCount });
      } else {
        // 1. Main product first
        lines.push({ merchandiseId: SHOPIFY_VARIANTS.COLORING_BOOK, quantity: totalBookCount });
        // 2. Unique photos (relates to book)
        const uniquePhotosItems = items.filter((i) => i.uniquePhotos);
        if (uniquePhotosItems.length > 0) {
          lines.push({ merchandiseId: SHOPIFY_VARIANTS.UNIQUE_PHOTOS, quantity: uniquePhotosItems.length });
        }
        // 3. Personalize cover (relates to book)
        const personalizeCount = items.reduce((s, i) => {
          if (!i.personalizeCover) return s;
          return s + (i.uniquePhotos ? i.quantity : 1);
        }, 0);
        if (personalizeCount > 0) {
          lines.push({ merchandiseId: SHOPIFY_VARIANTS.PERSONALIZE_COVER, quantity: personalizeCount });
        }
      }
      // 4. Digital download last (standalone add-on)
      if (digitalCopies > 0) {
        lines.push({ merchandiseId: SHOPIFY_VARIANTS.DIGITAL_DOWNLOAD, quantity: 1 });
      }
      // Track events for our admin dashboard + Shopify
      trackEvent("add_to_cart", "/cart", { totalBookCount });
      trackEvent("checkout_initiated", "/cart", { totalBookCount });
      trackAddToCart(
        lines.map((line) => ({
          productGid: "gid://shopify/Product/15269689852277",
          variantGid: line.merchandiseId,
          title:
            line.merchandiseId === SHOPIFY_VARIANTS.COLORING_BOOK ? "Personalised Coloring Book" :
            line.merchandiseId === SHOPIFY_VARIANTS.DIGITAL_DOWNLOAD ? "Instant Digital Download" :
            line.merchandiseId === SHOPIFY_VARIANTS.UNIQUE_PHOTOS ? "Unique Photos" :
            line.merchandiseId === SHOPIFY_VARIANTS.PERSONALIZE_COVER ? "Personalized Cover" : "Item",
          price:
            line.merchandiseId === SHOPIFY_VARIANTS.COLORING_BOOK ? "31.99" :
            line.merchandiseId === SHOPIFY_VARIANTS.DIGITAL_DOWNLOAD ? "5.99" :
            line.merchandiseId === SHOPIFY_VARIANTS.UNIQUE_PHOTOS ? "5.99" :
            line.merchandiseId === SHOPIFY_VARIANTS.PERSONALIZE_COVER ? "1.99" : "0",
          quantity: line.quantity,
        }))
      );

      const checkoutUrl = await createShopifyCheckout(lines);
      if (checkoutUrl) {
        setIsCartOpen(false);
        window.open(checkoutUrl, "_blank");
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setIsCheckingOut(false);
    }
  }, [items, totalBookCount, digitalCopies, setIsCartOpen]);

  const basketContentProps: BasketContentProps = {
    hasItems,
    items,
    totalBookCount,
    totalDiscount,
    addOns,
    addOnPrice,
    activeSessionId,
    setIsCartOpen,
    removeItem,
    updateItemQuantity,
    toggleItemUniquePhotos,
    toggleItemPersonalizeCover,
    digitalCopies,
    setDigitalCopies,
    isCheckingOut,
    onCheckout: handleCheckout,
    onNavigateToBuilder: () => navigate('/builder'),
    grandTotal,
  };

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

            {/* Desktop Navigation — base links only; user-specific actions
                live in the right-side user dropdown so they don't collide
                with the absolutely-centered logo on smaller desktops. */}
            <div className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) =>
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-foreground hover:text-foreground/70 transition-colors">

                  {link.label}
                </Link>
              )}
            </div>
          </div>

          {/* Center: Logo (absolutely centered) */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex items-center">
            <img alt="Piccoload – From pic to pen" className="h-14 w-auto" src="/lovable-uploads/piccoload-logo-large.png" />
          </Link>

          {/* Right: Cart + user menu + CTA */}
          <div className="ml-auto flex items-center gap-3">
            <CartButton
              isCartOpen={isCartOpen}
              setIsCartOpen={setIsCartOpen}
              hasItems={hasItems}
              itemCount={itemCount}
              basketContentProps={basketContentProps} />
            {!authLoading && isLoggedIn && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
                  aria-label="Account menu"
                >
                  <UserCircle2 className="w-6 h-6 text-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {user?.email && (
                    <>
                      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground truncate">
                        {user.email}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="flex items-center gap-2 cursor-pointer">
                      <ClipboardList className="w-4 h-4" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  {isAffiliate && (
                    <DropdownMenuItem asChild>
                      <Link to="/affiliates" className="flex items-center gap-2 cursor-pointer">
                        <Users className="w-4 h-4" />
                        Affiliate Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                        <Shield className="w-4 h-4" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      supabase.auth.signOut({ scope: 'local' })
                        .finally(() => { window.location.href = "/"; });
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!authLoading && !isLoggedIn && (
              <Link
                to="/auth"
                state={{ from: "/my-orders" }}
                className="hidden md:inline-flex text-sm font-medium text-foreground hover:text-foreground/70 transition-colors"
              >
                Sign In
              </Link>
            )}
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
              {!authLoading && isAffiliate &&
            <Link
              to="/affiliates"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2 flex items-center gap-1"
              onClick={() => setIsMenuOpen(false)}>
                  <Users className="w-3.5 h-3.5" />
                  Affiliate Dashboard
                </Link>
            }
              {!authLoading && isLoggedIn &&
            <Link
              to="/account"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2 flex items-center gap-1"
              onClick={() => setIsMenuOpen(false)}>
                  <ClipboardList className="w-3.5 h-3.5" />
                  My Account
                </Link>
            }
              {!authLoading && isLoggedIn && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    supabase.auth.signOut({ scope: 'local' }).then(() => {
                      window.location.href = "/";
                    }).catch(() => {
                      window.location.href = "/";
                    });
                  }}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2 text-left"
                >
                  Sign Out
                </button>
              )}
              {!authLoading && !isLoggedIn && (
                <Link
                  to="/auth"
                  state={{ from: "/my-orders" }}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
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