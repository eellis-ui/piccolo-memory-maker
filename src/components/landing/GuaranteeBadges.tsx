import { Truck, ShieldCheck, Award } from "lucide-react";

const badges = [
  { icon: Truck, label: "Free Shipping" },
  { icon: ShieldCheck, label: "Money-Back Guarantee" },
  { icon: Award, label: "Premium Quality" },
];

const GuaranteeBadges = () => {
  return (
    <div className="flex items-center justify-center gap-6 sm:gap-10 py-4">
      {badges.map((b) => (
        <div key={b.label} className="flex flex-col items-center gap-1.5 text-center">
          <b.icon className="w-6 h-6 text-primary" />
          <span className="text-xs font-semibold text-foreground">{b.label}</span>
        </div>
      ))}
    </div>
  );
};

export default GuaranteeBadges;
