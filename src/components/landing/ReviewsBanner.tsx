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
    <div className="bg-foreground overflow-hidden py-3">
      <div className="flex animate-[scroll_40s_linear_infinite] w-max">
        {[...items, ...items].map((item, i) => (
          <div key={i} className="flex items-center gap-3.5 px-7 whitespace-nowrap">
            <Pencil className="w-3.5 h-3.5 text-white/40 shrink-0" />
            {item.type === "quote" ? (
              <>
                <span className="text-sm font-sans text-white">"{item.text}"</span>
                <span className="text-white/50 text-sm">— {item.name}</span>
              </>
            ) : (
              <span className="text-sm font-sans font-bold text-white">{item.text}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsBanner;
