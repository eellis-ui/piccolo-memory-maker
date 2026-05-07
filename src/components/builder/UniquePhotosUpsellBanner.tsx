import { Images, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useBasket, UNIQUE_PHOTOS_PRICE } from "@/contexts/BasketContext";

const UniquePhotosUpsellBanner = () => {
  const { items, setUniquePhotos } = useBasket();

  // Only show for multi-book bundles
  const qualifyingItems = items.filter((i) => i.quantity > 1);
  if (qualifyingItems.length === 0) return null;

  const allEnabled = qualifyingItems.every((i) => i.uniquePhotos);
  const anyEnabled = qualifyingItems.some((i) => i.uniquePhotos);

  if (allEnabled) {
    return (
      <Card className="rounded-lg border border-primary bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Images className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-foreground">
                20 Unique Photos Per Book
              </p>
              <p className="text-xs text-foreground">
                Each book will use different photos
              </p>
            </div>
          </div>
          <Switch
            checked={true}
            onCheckedChange={() => setUniquePhotos(false)}
          />
        </CardContent>
      </Card>
    );
  }

  const bookCount = qualifyingItems.filter((i) => !i.uniquePhotos).reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Card className="rounded-lg border-2 border-foreground bg-background overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-background" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-base font-semibold text-foreground">
              Make each book unique!
            </h3>
             <p className="text-sm text-foreground mt-1">
               {anyEnabled
                 ? `${bookCount} book${bookCount > 1 ? 's' : ''} still share the same photos. Add unique photos to each.`
                 : `Upload 20 different photos for each book in your multi-book bundles.`}
             </p>
          </div>
        </div>

        <button
          onClick={() => setUniquePhotos(true)}
          className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-foreground bg-background hover:bg-muted transition-all text-left"
        >
          <div>
            <span className="font-semibold text-foreground text-sm">
              20 Different Photos Per Book
            </span>
            <span className="text-xs text-primary ml-2 font-bold">
              +${UNIQUE_PHOTOS_PRICE.toFixed(2)} per bundle
            </span>
          </div>
          <span className="font-bold text-foreground shrink-0 ml-4">
            Upgrade to all
          </span>
        </button>
      </CardContent>
    </Card>
  );
};

export default UniquePhotosUpsellBanner;
