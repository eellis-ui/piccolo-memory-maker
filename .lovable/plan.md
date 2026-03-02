
## Plan: Add "Personalize Cover" Upsell to Pricing Page

### Current state
The "Personalize Cover" (+$1.99/book) add-on only appears inside the builder's checkout step, tied to `addOns.titlePageEnabled`. Customers on the pricing page have no way to opt in before adding to cart.

### Goal
Add a "Personalize your cover" checkbox below the "Unique Photos" checkbox in `PricingSection.tsx`, matching the same visual style. When checked, the price shown on the Add to Cart button updates accordingly, and when the item is added to the basket the selection is stored so the checkout step knows to include the `PERSONALIZE_COVER` variant.

### Changes required

**1. `src/contexts/BasketContext.tsx`**
- Add a `personalizeCover` boolean field to `BasketItem` (per-item, like `uniquePhotos`)
- Update `createBasketItem` to accept `personalizeCover` option
- Expose `personalizeCover` and a setter/toggle in context
- Update `addToCart` signature to accept `{ uniquePhotos?, personalizeCover? }`

**2. `src/components/landing/PricingSection.tsx`**
- Add `pendingPersonalizeCover` state (boolean, default false)
- Add a second checkbox below the "Unique Photos" one:
  ```
  ☐  Personalize your cover!  +$1.99
     Add a custom title and message to the front cover of each book
  ```
- Include `$1.99 × quantity` in the `totalPrice` calculation displayed on the Add to Cart button
- Pass `personalizeCover: pendingPersonalizeCover` to `addToCart()`

**3. `src/components/builder/CheckoutStep.tsx`**
- Read `personalizeCover` from `BasketContext` (via `useBasket()`) in addition to the existing `bookAddOnsList.titlePageEnabled` check
- When building Shopify cart lines, add `PERSONALIZE_COVER` variant if either the basket-level flag OR any book's `titlePageEnabled` is true
- This ensures no double-counting: use basket flag as the primary source when coming from the pricing page, and the per-book add-ons panel as the secondary source for builder-level selection

### Price display logic
- 1 book + personalize cover: `$35.00 + $1.99 = $36.99`
- 2 books + personalize cover: `$59.50 + $3.98 = $63.48`
- 3 books + personalize cover: `$69.30 + $5.97 = $75.27`
- Combined with unique photos: stacks correctly

### Visual layout (pricing page, below unique photos checkbox)
```
[ ] Unique Photos — +$4.99
    If unticked, all books in the bundle will contain the same photos

[ ] Personalize your cover! — +$1.99/book
    Add a custom title to the front cover of each book
```
Both use identical label/checkbox styling for consistency.
