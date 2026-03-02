

# Fix: Session Resume Loses Books Due to Pricing Tier Mismatch

## Problem
When resuming a session with 4+ books (e.g., a 3-book bundle + a 1-book bundle = 4 orders), the builder calls `setQuantity(4)`. But `setQuantity` is a legacy function that maps to `PRICING_TIERS` which only supports quantities 1, 2, or 3. For quantity 4, it falls back to tier[0] (quantity 1), so the cart is reset to just 1 book.

## Root Cause
`setQuantity()` in `BasketContext` calls `createBasketItem(quantity)` which does:
```text
PRICING_TIERS.find(t => t.quantity === quantity) ?? PRICING_TIERS[0]
```
Since there's no tier for quantity 4 or 5, it always falls back to the first tier (1 book).

## Fix

### `src/pages/Builder.tsx` (~line 93-99)

Replace the `setQuantity(existingOrders.length)` call with logic that properly reconstructs the cart. Since we can't know the original bundle grouping from the database (all orders are stored individually), we should use the `items` array from the basket if it already has the right count, or fall back to adding each order as a single-book item.

The simplest correct approach: use `clear()` + multiple `addToCart(1, ...)` calls -- one per order. This creates the correct number of line items in the cart, each individually priced. The total book count will then correctly equal the number of orders.

Replace:
```text
setQuantity(existingOrders.length);
const hasUniquePhotos = existingOrders.some((o: any) => o.unique_photos);
if (hasUniquePhotos) {
  setUniquePhotos(true);
}
```

With logic that:
1. Checks if current basket `totalBookCount` already matches `existingOrders.length` -- if so, skip (cart is already correct from product page navigation).
2. Otherwise, clears the cart and adds each order as its own single-book item, preserving the per-order `unique_photos` flag.

### `src/contexts/BasketContext.tsx`

Import `clear` in the builder's destructuring (already available). No changes needed to the context itself -- `addToCart(1, { uniquePhotos })` already works correctly for single-book items.

## What This Fixes
- Resuming a session with 4+ books will correctly show all book tabs
- Each order's `unique_photos` flag is restored individually per cart item
- The cart total and book count will match the actual number of orders in the session
