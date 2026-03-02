

# Editable Bundles in Cart

## What Changes
Each bundle in the cart will display quantity controls (minus/plus buttons) allowing users to change the number of books within that bundle (cycling between 1, 2, and 3 books). Bundles stack separately as individual line items -- adding another bundle from the product page creates a new card in the cart, not merging with existing ones.

## How It Works

### 1. Add `updateItemQuantity` to BasketContext
- New function: `updateItemQuantity(id: string, newQuantity: number)`
- Finds the item by id, recalculates pricing using the matching pricing tier (1/2/3 books), and updates the item in place
- If `newQuantity` is 0 or less, removes the item
- Expose this function via the context

### 2. Update Cart Drawer (Navbar.tsx - BasketContent)
- Add `updateItemQuantity` to the `BasketContentProps` interface
- For each line item card, add minus/plus quantity controls between the product info and the delete button
- Minus button: decreases bundle quantity by 1 (minimum 1 book; at 1, disabled or removes item)
- Plus button: increases bundle quantity by 1 (maximum 3 books per bundle, matching the pricing tiers)
- The price, savings, and per-book rate update live as the user changes the bundle size
- Display the per-book price (e.g., "$29.75/book") below the quantity selector for clarity

### Visual Layout per Cart Item
```text
[Image] | Personalised Coloring Book     [Trash]
        | 2 books
        | [-] 2 [+]
        | $90.00  $59.50  (Save $30.50)
        | [February Sale badge]
```

## Technical Details

**Files to change:**
1. **`src/contexts/BasketContext.tsx`** -- Add `updateItemQuantity` method that replaces an item's quantity/pricing in the `items` array using `createBasketItem` with the new quantity, preserving the original item id
2. **`src/components/layout/Navbar.tsx`** -- Add `updateItemQuantity` to props, wire up minus/plus buttons in each item card. The buttons cycle through quantities 1, 2, 3 (matching `PRICING_TIERS`). Disable minus at 1, disable plus at 3.

