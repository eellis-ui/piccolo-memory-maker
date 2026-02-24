import { Shield, Lock, CreditCard, Truck } from "lucide-react";

const TrustBadges = () => {
  return (
    <div className="w-full">
      <p className="text-xs text-muted-foreground text-center mb-3 flex items-center justify-center gap-1.5">
        <Lock className="w-3.5 h-3.5" />
        Guaranteed safe &amp; secure checkout
      </p>
      <div className="flex items-center justify-center gap-4 text-muted-foreground/60">
        <Shield className="w-6 h-6" />
        <CreditCard className="w-6 h-6" />
        <Truck className="w-6 h-6" />
        {/* Visa / MC / Amex text icons */}
        <span className="text-[10px] font-bold tracking-wide border border-muted-foreground/30 rounded px-1.5 py-0.5">VISA</span>
        <span className="text-[10px] font-bold tracking-wide border border-muted-foreground/30 rounded px-1.5 py-0.5">MC</span>
        <span className="text-[10px] font-bold tracking-wide border border-muted-foreground/30 rounded px-1.5 py-0.5">AMEX</span>
      </div>
    </div>
  );
};

export default TrustBadges;
