import { createContext, useContext, useState, ReactNode } from "react";

export interface BasketItem {
  quantity: number;
  pricePerBook: number;
  originalPricePerBook: number;
  totalPrice: number;
  originalTotalPrice: number;
}

export interface BookAddOns {
  titlePageEnabled: boolean;
  titlePageText: string;
  bottomTitle: string;
  dedicationPageEnabled: boolean;
  dedicationPageText: string;
}

const ADD_ON_PRICE = 1.99;
export const DIGITAL_DOWNLOAD_PRICE = 5.99;
export const UNIQUE_PHOTOS_PRICE = 4.99;

const PRICING_TIERS = [
  { quantity: 1, pricePerBook: 35, originalPricePerBook: 45 },
  { quantity: 2, pricePerBook: 29.75, originalPricePerBook: 45 },
  { quantity: 3, pricePerBook: 23.10, originalPricePerBook: 45 },
];

interface BasketContextType {
  item: BasketItem | null;
  setQuantity: (quantity: number) => void;
  clear: () => void;
  pricingTiers: typeof PRICING_TIERS;
  digitalCopies: number;
  setDigitalCopies: (copies: number) => void;
  digitalPrice: number;
  addOns: BookAddOns;
  setAddOns: (addOns: BookAddOns) => void;
  addOnPrice: number;
  addOnsTotal: number;
  uniquePhotos: boolean;
  setUniquePhotos: (val: boolean) => void;
  uniquePhotosPrice: number;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const BasketContext = createContext<BasketContextType | undefined>(undefined);

export const BasketProvider = ({ children }: { children: ReactNode }) => {
  const [item, setItem] = useState<BasketItem | null>(null);
  const [digitalCopies, setDigitalCopies] = useState<number>(0);
  const [uniquePhotos, setUniquePhotos] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addOns, setAddOns] = useState<BookAddOns>({
    titlePageEnabled: false,
    titlePageText: "",
    bottomTitle: "color your memories",
    dedicationPageEnabled: false,
    dedicationPageText: "",
  });

  const addOnsTotal =
    (addOns.titlePageEnabled ? ADD_ON_PRICE : 0) +
    (addOns.dedicationPageEnabled ? ADD_ON_PRICE : 0);

  const digitalPrice = digitalCopies * DIGITAL_DOWNLOAD_PRICE;

  const setQuantity = (quantity: number) => {
    if (quantity <= 0) {
      setItem(null);
      return;
    }
    const tier = PRICING_TIERS.find((t) => t.quantity === quantity) ?? PRICING_TIERS[0];
    setItem({
      quantity: tier.quantity,
      pricePerBook: tier.pricePerBook,
      originalPricePerBook: tier.originalPricePerBook,
      totalPrice: +(tier.pricePerBook * tier.quantity).toFixed(2),
      originalTotalPrice: +(tier.originalPricePerBook * tier.quantity).toFixed(2),
    });
  };

  const clear = () => {
    setItem(null);
    setDigitalCopies(0);
    setUniquePhotos(false);
    setActiveSessionId(null);
    setAddOns({
      titlePageEnabled: false,
      titlePageText: "",
      bottomTitle: "color your memories",
      dedicationPageEnabled: false,
      dedicationPageText: "",
    });
  };

  return (
    <BasketContext.Provider
      value={{
        item, setQuantity, clear,
        pricingTiers: PRICING_TIERS,
        digitalCopies, setDigitalCopies, digitalPrice,
        addOns, setAddOns,
        addOnPrice: ADD_ON_PRICE,
        addOnsTotal,
        uniquePhotos, setUniquePhotos,
        uniquePhotosPrice: uniquePhotos ? UNIQUE_PHOTOS_PRICE : 0,
        activeSessionId, setActiveSessionId,
        isCartOpen, setIsCartOpen,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
};

export const useBasket = () => {
  const context = useContext(BasketContext);
  if (!context) throw new Error("useBasket must be used within BasketProvider");
  return context;
};
