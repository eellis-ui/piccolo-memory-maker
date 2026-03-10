import { DollarSign } from "lucide-react";

const items = [
  "Make money from your phone",
  "Share products you love",
  "Share the gift of memories",
];

const AffiliateBanner = () => {
  return (
    <div className="bg-foreground overflow-hidden py-3">
      <div className="flex animate-[scroll_40s_linear_infinite] w-max">
        {[...items, ...items, ...items].map((text, i) => (
          <div key={i} className="flex items-center gap-3.5 px-7 whitespace-nowrap">
            <DollarSign className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <span className="text-sm font-sans font-bold text-white">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AffiliateBanner;
