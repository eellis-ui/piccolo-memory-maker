import { Truck, HeartHandshake, Award } from "lucide-react";

// V2: the middle badge now matches the refund policy exactly, instead of a
// generic "Money-Back Guarantee" the FAQ contradicts.
const badges = [
  { icon: Truck, label: "Free US Shipping", sub: "On every bundle" },
  { icon: HeartHandshake, label: "Love-Your-Book Guarantee", sub: "Free replacement or refund if it arrives damaged, misprinted or wrong" },
  { icon: Award, label: "Premium Quality", sub: "170gsm paper, 350gsm cover" },
];

const GuaranteeBadgesV2 = () => {
  return (
    <div className="grid grid-cols-3 gap-4 sm:gap-6 py-6 border-t border-border/40 mt-2">
      {badges.map((b) => (
        <div key={b.label} className="flex flex-col items-center gap-2 text-center">
          <div className="bg-primary/10 rounded-full p-2.5">
            <b.icon className="w-6 h-6 text-primary" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-foreground leading-tight">{b.label}</span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug hidden sm:block">{b.sub}</span>
        </div>
      ))}
    </div>
  );
};

export default GuaranteeBadgesV2;
