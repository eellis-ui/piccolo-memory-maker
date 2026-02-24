import { Pencil } from "lucide-react";

const items = [
  { type: "quote" as const, text: "Love it SOO much", name: "Ellie, UK" },
  { type: "promo" as const, text: "Buy Three, Save 40%!" },
  { type: "quote" as const, text: "Mums Birthday is complete!", name: "Georgie, USA" },
  { type: "quote" as const, text: "Really enjoyed colouring my London Marathon run!", name: "Ewan, UK" },
  { type: "promo" as const, text: "Buy Three, Save 40%!" },
  { type: "quote" as const, text: "Exactly what I didn't know I needed", name: "Matilda, UK" },
];

const ReviewsBanner = () => {
  return (
    <div className="bg-foreground text-cream overflow-hidden py-2.5">
      <div className="flex animate-[scroll_30s_linear_infinite] w-max">
        {[...items, ...items].map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-6 whitespace-nowrap">
            <Pencil className="w-3 h-3 text-cream/40 shrink-0" />
            {item.type === "quote" ? (
              <>
                <span className="text-xs font-sans">"{item.text}"</span>
                <span className="text-cream/50 text-xs">— {item.name}</span>
              </>
            ) : (
              <span className="text-xs font-sans font-bold">{item.text}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsBanner;
