

# Per-Bundle Unique Photos

## Problem
"Unique Photos" is stored as a single global boolean in the basket context. Adding it to multiple bundles only counts once ($4.99 total instead of $4.99 per bundle).

## Solution
Move `uniquePhotos` from a global boolean to a per-item property on each `BasketItem`. Each bundle independently tracks whether unique photos is enabled, and each one adds $4.99 to the total.

## Changes

### 1. `src/contexts/BasketContext.tsx`
- Add `uniquePhotos: boolean` field to the `BasketItem` interface
- Add `toggleItemUniquePhotos(id: string)` function to toggle it per item
- Update `createBasketItem` to default `uniquePhotos: false`
- Calculate `uniquePhotosPrice` as the sum of $4.99 for each item that has it enabled (and has quantity > 1, since unique photos only makes sense for multi-book bundles)
- Keep the global `uniquePhotos` getter as a derived value (true if any item has it) for backward compatibility, but deprecate `setUniquePhotos`

### 2. `src/components/layout/Navbar.tsx` (Cart Drawer)
- Replace the single global "Unique Photos" card with a per-item toggle shown inside each bundle card (only for bundles with 2+ books)
- Add a small toggle/checkbox row under each qualifying bundle: "Unique photos for this bundle +$4.99"
- Wire up to `toggleItemUniquePhotos(lineItem.id)`
- Update the `BasketContentProps` interface to include `toggleItemUniquePhotos`
- Remove the standalone unique photos section (lines 153-167)

### 3. `src/components/builder/UniquePhotosUpsellBanner.tsx`
- Update to work with per-item unique photos -- show the upsell for each bundle that qualifies (quantity > 1) and doesn't yet have it enabled
- Or keep as a global toggle that enables it for all qualifying bundles at once

### 4. Price Calculations
- `uniquePhotosPrice` becomes: count of items with `uniquePhotos === true` multiplied by $4.99
- Grand total in cart footer updates accordingly
