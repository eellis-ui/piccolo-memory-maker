import { Truck, ShieldCheck, Award } from "lucide-react";

const badges = [
  { icon: Truck, label: "Free Shipping over $35" },
  { icon: ShieldCheck, label: "Money-Back Guarantee" },
  { icon: Award, label: "Premium Quality" },
];

const GuaranteeBadges = () => {
  return (
    <div className="flex items-center justify-center gap-8 sm:gap-12 py-6 border-t border-border/40 mt-2">
      {badges.map((b) => (
        <div key={b.label} className="flex flex-col items-center gap-2 text-center">
          <div className="bg-primary/10 rounded-full p-2.5">
            <b.icon className="w-7 h-7 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">{b.label}</span>
        </div>
      ))}
    </div>
  );
};

export default GuaranteeBadges;
