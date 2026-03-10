import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Check } from "lucide-react";
import { useBasket } from "@/contexts/BasketContext";

const BookOptionsPanel = () => {
  const { addOns, setAddOns, addOnPrice, item } = useBasket();
  const alreadyPurchased = item?.personalizeCover ?? false;

  // Auto-enable title page if personalize cover was selected in cart/product page
  useEffect(() => {
    if (alreadyPurchased && !addOns.titlePageEnabled) {
      setAddOns({ ...addOns, titlePageEnabled: true });
    }
  }, [alreadyPurchased]);

  const toggle = (field: "titlePageEnabled" | "dedicationPageEnabled") => {
    setAddOns({ ...addOns, [field]: !addOns[field] });
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6 space-y-6">
      <h3 className="font-display text-lg font-semibold text-foreground">
        Book Options
      </h3>

      {/* Title Page */}
      <div className="space-y-3">
        {alreadyPurchased ? (
          /* Already purchased — just show inputs, no toggle/price */
          <>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <Label className="font-medium">Title Page</Label>
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Check className="w-3 h-3" /> Included
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Personalize your cover text below</p>
            <Input
              value={addOns.titlePageText}
              onChange={(e) =>
                setAddOns({ ...addOns, titlePageText: e.target.value })
              }
              placeholder="Cover Title (top)"
              maxLength={100}
              className="rounded-xl"
            />
            <Input
              value={addOns.bottomTitle}
              onChange={(e) =>
                setAddOns({ ...addOns, bottomTitle: e.target.value })
              }
              placeholder="color your memories"
              maxLength={100}
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">Bottom title shown on cover</p>
          </>
        ) : (
          /* Not purchased — show toggle with price */
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <Label htmlFor="title-page" className="font-medium">
                  Title Page
                </Label>
                <Badge variant="outline" className="text-xs">
                  +${addOnPrice.toFixed(2)}
                </Badge>
              </div>
              <Switch
                id="title-page"
                checked={addOns.titlePageEnabled}
                onCheckedChange={() => toggle("titlePageEnabled")}
              />
            </div>
            {addOns.titlePageEnabled && (
              <>
                <Input
                  value={addOns.titlePageText}
                  onChange={(e) =>
                    setAddOns({ ...addOns, titlePageText: e.target.value })
                  }
                  placeholder="Cover Title (top)"
                  maxLength={100}
                  className="rounded-xl"
                />
                <Input
                  value={addOns.bottomTitle}
                  onChange={(e) =>
                    setAddOns({ ...addOns, bottomTitle: e.target.value })
                  }
                  placeholder="color your memories"
                  maxLength={100}
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">Bottom title shown on cover</p>
              </>
            )}
          </>
        )}
      </div>

      {/* Page Summary */}
      <div className="text-sm text-muted-foreground border-t border-border pt-4">
        <p>
          Your book will include:{" "}
          <span className="font-medium text-foreground">Cover</span>
          {addOns.titlePageEnabled && (
            <>, <span className="font-medium text-foreground">
              Title Page {alreadyPurchased ? "(included)" : `(+$${addOnPrice.toFixed(2)})`}
            </span></>
          )}
          , then your coloring pages.
        </p>
      </div>
    </div>
  );
};

export default BookOptionsPanel;
