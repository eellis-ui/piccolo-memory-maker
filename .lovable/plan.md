
Goal: make “Have 20 different photos in each book!” actually selectable on the product page and ensure that selection is attached to the specific cart item when added.

What I found
- The checkbox UI is rendering on the product page, but it is controlled by `uniquePhotos` from basket context.
- In basket context, `uniquePhotos` is derived from existing cart items (`items.some(...)`), and `setUniquePhotos` mutates existing items only.
- On product page before adding anything, `items` is empty, so toggling does nothing visually (appears “not clickable”).
- Also, product-page total price still uses an old gate: `(uniquePhotos && selectedQuantity > 1)`, which prevents add-on pricing for single-book selections.
- Add-to-cart currently does not pass any per-item upsell choice (`addToCart(selectedQuantity)` only), so product page cannot preconfigure the newly added line item.

Implementation plan

1) Decouple product-page checkbox from cart-derived state
- File: `src/components/landing/PricingSection.tsx`
- Introduce local state for pending selection (example: `pendingUniquePhotos`).
- Bind the checkbox to this local state instead of `useBasket().uniquePhotos`.
- Keep label/checkbox fully clickable (and simplify/remove the redundant `{( ... )}` wrapper introduced in the last diff).

2) Pass upsell selection into newly added line item
- File: `src/contexts/BasketContext.tsx`
- Extend `addToCart` to accept an optional options argument (e.g. `{ uniquePhotos?: boolean }`).
- Extend `createBasketItem` to accept initial `uniquePhotos` flag and set it on the new item.
- Preserve backward compatibility so existing callers without options still work.

3) Wire product-page add-to-cart to per-item upsell
- File: `src/components/landing/PricingSection.tsx`
- Update both CTA paths (`handleAddToBasket` and `FinalCTABlock` callback) to call:
  - `addToCart(selectedQuantity, { uniquePhotos: pendingUniquePhotos })`
- This ensures each added bundle/single book carries the selected upsell independently.

4) Fix product-page price preview logic
- File: `src/components/landing/PricingSection.tsx`
- Compute displayed CTA price from local pending checkbox state and remove quantity gating:
  - include `+ $4.99` whenever pending checkbox is selected, for both single and bundle.
- This aligns with your requirement (“any individual or bundle”).

5) Quick consistency checks after implementation
- On `/pricing`, checkbox can be toggled on/off immediately before any cart items exist.
- Add single book with checkbox on → cart line shows unique photos enabled and +$4.99 applied.
- Add another item with checkbox off → second line has no unique photos charge.
- Toggle cart per-line unique photos still works.
- CTA total updates correctly for both 1-book and 2/3-book selections.

Technical notes
- This is a state-flow bug, not a visual rendering bug.
- The fix keeps per-item upsell architecture intact and avoids reintroducing global-only behavior.
- No backend/database changes are needed for this request.
