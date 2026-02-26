import { Images, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBasket, UNIQUE_PHOTOS_PRICE } from "@/contexts/BasketContext";

const UniquePhotosUpsellBanner = () => {
  const { uniquePhotos, setUniquePhotos, item } = useBasket();
  const bookCount = item?.quantity ?? 1;

  if (bookCount <= 1) return null;

  if (uniquePhotos) {
    return (
      <Card className="rounded-3xl border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Images className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                20 Unique Photos Per Book
                <Badge variant="secondary" className="text-xs">Added</Badge>
              </p>
              <p className="text-xs text-foreground">
                Each of your {bookCount} books will use different photos
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-xl text-muted-foreground hover:text-destructive shrink-0 text-xs"
            onClick={() => setUniquePhotos(false)}
          >
            Remove
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-dashed border-2 border-secondary bg-secondary/20 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-secondary/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-secondary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-base font-semibold text-foreground">
              Make each book unique!
            </h3>
             <p className="text-sm text-foreground mt-1">
               You're ordering <strong>{bookCount} books</strong>. Without this upgrade, all {bookCount} books will contain the <strong>same 20 photos</strong>. Add this to upload 20 <em>different</em> photos for each book.
             </p>
          </div>
        </div>

        <button
          onClick={() => setUniquePhotos(true)}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
        >
          <div>
            <span className="font-semibold text-foreground text-sm">
              20 Different Photos Per Book
            </span>
            <span className="text-xs text-foreground ml-2">Upload unique photos for each of your {bookCount} books</span>
          </div>
          <span className="font-bold text-foreground shrink-0 ml-4">
            + ${UNIQUE_PHOTOS_PRICE.toFixed(2)}
          </span>
        </button>
      </CardContent>
    </Card>
  );
};

export default UniquePhotosUpsellBanner;
