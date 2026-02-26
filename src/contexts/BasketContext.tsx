import { createContext, useContext, useState, ReactNode } from "react";

export interface BasketItem {
  id: string;
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

let nextItemId = 1;

interface BasketContextType {
  /** @deprecated Use items array instead */
  item: BasketItem | null;
  /** All line items in the cart */
  items: BasketItem[];
  /** Total book count across all line items */
  totalBookCount: number;
  /** Add a bundle to the cart (stacks as new line item) */
  addToCart: (quantity: number) => void;
  /** Remove a specific line item by id */
  removeItem: (id: string) => void;
  /** Legacy: set single item (used by builder for quantity changes) */
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

function createBasketItem(quantity: number): BasketItem {
  const tier = PRICING_TIERS.find((t) => t.quantity === quantity) ?? PRICING_TIERS[0];
  return {
    id: `item-${nextItemId++}`,
    quantity: tier.quantity,
    pricePerBook: tier.pricePerBook,
    originalPricePerBook: tier.originalPricePerBook,
    totalPrice: +(tier.pricePerBook * tier.quantity).toFixed(2),
    originalTotalPrice: +(tier.originalPricePerBook * tier.quantity).toFixed(2),
  };
}

export const BasketProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<BasketItem[]>([]);
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

  const totalBookCount = items.reduce((sum, i) => sum + i.quantity, 0);

  // Backward compat: first item or a synthesized aggregate
  const item: BasketItem | null = items.length > 0
    ? {
        id: items[0].id,
        quantity: totalBookCount,
        pricePerBook: items[0].pricePerBook,
        originalPricePerBook: items[0].originalPricePerBook,
        totalPrice: +items.reduce((s, i) => s + i.totalPrice, 0).toFixed(2),
        originalTotalPrice: +items.reduce((s, i) => s + i.originalTotalPrice, 0).toFixed(2),
      }
    : null;

  const addToCart = (quantity: number) => {
    if (quantity <= 0) return;
    setItems((prev) => [...prev, createBasketItem(quantity)]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Legacy: replaces all items with a single item (used by builder quantity controls)
  const setQuantity = (quantity: number) => {
    if (quantity <= 0) {
      setItems([]);
      return;
    }
    setItems([createBasketItem(quantity)]);
  };

  const clear = () => {
    setItems([]);
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
        item, items, totalBookCount,
        addToCart, removeItem, setQuantity, clear,
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
