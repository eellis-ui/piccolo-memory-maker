import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Gift } from "lucide-react";

/**
 * Gift-buyer lane: gift note at the order bump, plus a visible answer for
 * the "I can't make it for them" visitor (gift card path).
 *
 * DEMO NOTE: the gift-note flag is local state only — production threads it
 * through BasketContext into the order, and the gift-card link goes live once
 * a gift-card product exists in Shopify.
 */
const GiftLane = ({ onGiftNoteChange }: { onGiftNoteChange?: (checked: boolean) => void }) => {
  const [giftNote, setGiftNote] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-background mb-3 overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Gift className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Buying as a gift?</p>
      </div>
      <label className="flex items-start gap-3 p-4 pt-2.5 cursor-pointer">
        <Checkbox
          checked={giftNote}
          onCheckedChange={(checked) => {
            setGiftNote(!!checked);
            onGiftNoteChange?.(!!checked);
          }}
          className="mt-0.5"
        />
        <div className="flex-1">
          <p className="text-sm text-foreground">
            Add a free handwritten-style gift note <span className="text-primary font-bold">FREE</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            We&apos;ll tuck it inside the front cover — no prices on the packing slip
          </p>
        </div>
      </label>
      <div className="px-4 pb-3 -mt-1">
        <p className="text-xs text-muted-foreground">
          Don&apos;t have their photos? <span className="text-primary font-semibold">Gift cards</span> let
          them build their own book <span className="italic">(coming soon)</span>
        </p>
      </div>
    </div>
  );
};

export default GiftLane;
