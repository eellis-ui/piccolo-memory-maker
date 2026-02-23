import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBasket, DIGITAL_DOWNLOAD_PRICE } from "@/contexts/BasketContext";

interface DigitalUpsellBannerProps {
  variant?: "compact" | "full";
  /** Max copies allowed (based on book quantity & unique photos setting) */
  maxCopies: number;
}

const DigitalUpsellBanner = ({ variant = "full", maxCopies }: DigitalUpsellBannerProps) => {
  const { digitalCopies, setDigitalCopies } = useBasket();

  // Already have all possible copies
  if (digitalCopies >= maxCopies) return null;

  const remainingCopies = maxCopies - digitalCopies;
  const priceLabel = maxCopies === 1 || remainingCopies === 1
    ? `$${DIGITAL_DOWNLOAD_PRICE.toFixed(2)}`
    : `$${DIGITAL_DOWNLOAD_PRICE.toFixed(2)}/copy`;

  if (variant === "compact") {
    return (
      <Card className="rounded-3xl border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-foreground">
                Add a Digital PDF Download
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Print extra copies at home — {priceLabel} · 20 pages
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl shrink-0 border-primary/30 hover:bg-primary/10"
            onClick={() => setDigitalCopies(digitalCopies + 1)}
          >
            Add {priceLabel}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-dashed border-2 border-primary/30 bg-primary/5 overflow-hidden">
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
              Get a printable PDF of your 20-page coloring book — print extra copies at home anytime!
            </p>
          </div>
        </div>

        {maxCopies > 1 ? (
          <div className="space-y-2">
            {Array.from({ length: remainingCopies }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setDigitalCopies(digitalCopies + n)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
              >
                <div>
                  <span className="font-semibold text-foreground text-sm">
                    {n} PDF {n === 1 ? "Copy" : "Copies"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">20 pages each</span>
                </div>
                <span className="font-bold text-foreground">
                  + ${(n * DIGITAL_DOWNLOAD_PRICE).toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setDigitalCopies(1)}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
          >
            <div>
              <span className="font-semibold text-foreground text-sm">1 PDF Copy</span>
              <span className="text-xs text-muted-foreground ml-2">20 pages</span>
            </div>
            <span className="font-bold text-foreground">
              + ${DIGITAL_DOWNLOAD_PRICE.toFixed(2)}
            </span>
          </button>
        )}
      </CardContent>
    </Card>
  );
};

export default DigitalUpsellBanner;
