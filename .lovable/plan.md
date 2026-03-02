

# Fix: Allow "Unique Photos" Toggle for All Cart Items

## Problem
The unique photos toggle in the cart only appears for bundles with 2 or more books (`lineItem.quantity >= 2`). You want it available for every item -- single books and bundles alike.

## Changes

### `src/components/layout/Navbar.tsx` (line 148)
- Remove the `lineItem.quantity >= 2` condition so the unique photos toggle renders for every cart line item regardless of bundle size.

### `src/contexts/BasketContext.tsx`
- Update `setUniquePhotos` (the global toggle used by the upsell banner) to apply to ALL items, not just multi-book ones (currently filters with `i.quantity > 1`).

### `src/components/builder/UniquePhotosUpsellBanner.tsx`
- Update the qualifying items filter to include all items (currently `items.filter((i) => i.quantity > 1)` excludes single books).

All three are small one-line fixes removing the quantity gate.

