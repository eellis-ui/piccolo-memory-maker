import { Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBasket, DIGITAL_TIERS } from "@/contexts/BasketContext";

interface DigitalUpsellBannerProps {
  variant?: "compact" | "full";
}

const DigitalUpsellBanner = ({ variant = "full" }: DigitalUpsellBannerProps) => {
  const { digitalDownload, setDigitalDownload } = useBasket();

  if (digitalDownload) return null;

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
                Want a printable PDF too?
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Print extra copies at home — from $5
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl shrink-0 border-primary/30 hover:bg-primary/10"
            onClick={() => setDigitalDownload({ pages: 20, price: 10 })}
          >
            Add $10
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
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              Add a Digital Download
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Get a printable PDF of your coloring book — print extra copies at home anytime!
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DIGITAL_TIERS.map((tier) => (
            <button
              key={tier.pages}
              onClick={() => setDigitalDownload({ pages: tier.pages, price: tier.price })}
              className="flex flex-col items-center p-3 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <span className="font-bold text-foreground">${tier.price}</span>
              <span className="text-xs text-muted-foreground">{tier.pages} pages</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DigitalUpsellBanner;
