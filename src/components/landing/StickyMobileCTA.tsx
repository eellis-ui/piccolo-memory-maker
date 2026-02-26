import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

interface StickyMobileCTAProps {
  price: string;
  onCtaClick: () => void;
  /** Ref to the main CTA button — bar appears after scrolling past it */
  triggerRef: React.RefObject<HTMLElement>;
}

const StickyMobileCTA = ({ price, onCtaClick, triggerRef }: StickyMobileCTAProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [triggerRef]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur border-t border-border px-4 py-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-xs text-muted-foreground">Total</p>
        <p className="text-lg font-bold text-foreground">${price}</p>
      </div>
      <Button onClick={onCtaClick} size="sm" className="rounded-lg font-semibold">
        <ShoppingCart className="w-4 h-4 mr-1.5" />
        Start Creating
      </Button>
    </div>
  );
};

export default StickyMobileCTA;
