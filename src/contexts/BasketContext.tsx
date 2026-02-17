import { createContext, useContext, useState, ReactNode } from "react";

export interface BasketItem {
  quantity: number;
  pricePerBook: number;
  originalPricePerBook: number;
  totalPrice: number;
  originalTotalPrice: number;
}

const PRICING_TIERS = [
  { quantity: 1, pricePerBook: 35, originalPricePerBook: 42 },
  { quantity: 2, pricePerBook: 31.5, originalPricePerBook: 42 },
  { quantity: 3, pricePerBook: 29, originalPricePerBook: 42 },
];

interface BasketContextType {
  item: BasketItem | null;
  setQuantity: (quantity: number) => void;
  clear: () => void;
  pricingTiers: typeof PRICING_TIERS;
}

const BasketContext = createContext<BasketContextType | undefined>(undefined);

export const BasketProvider = ({ children }: { children: ReactNode }) => {
  const [item, setItem] = useState<BasketItem | null>(null);

  const setQuantity = (quantity: number) => {
    const tier = PRICING_TIERS.find((t) => t.quantity === quantity) ?? PRICING_TIERS[0];
    setItem({
      quantity: tier.quantity,
      pricePerBook: tier.pricePerBook,
      originalPricePerBook: tier.originalPricePerBook,
      totalPrice: +(tier.pricePerBook * tier.quantity).toFixed(2),
      originalTotalPrice: +(tier.originalPricePerBook * tier.quantity).toFixed(2),
    });
  };

  const clear = () => setItem(null);

  return (
    <BasketContext.Provider value={{ item, setQuantity, clear, pricingTiers: PRICING_TIERS }}>
      {children}
    </BasketContext.Provider>
  );
};

export const useBasket = () => {
  const context = useContext(BasketContext);
  if (!context) throw new Error("useBasket must be used within BasketProvider");
  return context;
};
