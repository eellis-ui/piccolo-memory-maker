import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Heart } from "lucide-react";
import { useBasket } from "@/contexts/BasketContext";

const BookOptionsPanel = () => {
  const { addOns, setAddOns, addOnPrice } = useBasket();

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
          <Input
            value={addOns.titlePageText}
            onChange={(e) =>
              setAddOns({ ...addOns, titlePageText: e.target.value })
            }
            placeholder="My Piccoload Coloring Book"
            maxLength={100}
            className="rounded-xl"
          />
        )}
      </div>

      {/* Dedication Note */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            <Label htmlFor="dedication-page" className="font-medium">
              Dedication Note
            </Label>
            <Badge variant="outline" className="text-xs">
              +${addOnPrice.toFixed(2)}
            </Badge>
          </div>
          <Switch
            id="dedication-page"
            checked={addOns.dedicationPageEnabled}
            onCheckedChange={() => toggle("dedicationPageEnabled")}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Replaces "for kids and adults alike" on the cover
        </p>
        {addOns.dedicationPageEnabled && (
          <Textarea
            value={addOns.dedicationPageText}
            onChange={(e) =>
              setAddOns({ ...addOns, dedicationPageText: e.target.value })
            }
            placeholder="For my little artist..."
            className="rounded-xl resize-none"
            rows={3}
            maxLength={200}
          />
        )}
      </div>

      {/* Page Summary */}
      <div className="text-sm text-muted-foreground border-t border-border pt-4">
        <p>
          Your book will include:{" "}
          <span className="font-medium text-foreground">Cover</span>
          {addOns.titlePageEnabled && (
            <>, <span className="font-medium text-foreground">Title Page (+${addOnPrice})</span></>
          )}
          {addOns.dedicationPageEnabled && (
            <>, <span className="font-medium text-foreground">Dedication Note (+${addOnPrice})</span></>
          )}
          , then your coloring pages.
        </p>
      </div>
    </div>
  );
};

export default BookOptionsPanel;
