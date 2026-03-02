

## Plan: Reorder Checkout Line Items in Builder Flow

The cart drawer (`Navbar.tsx`) already sends items in the correct order after the last edit. However, the builder's checkout flow (`CheckoutStep.tsx`) still sends items in a different order — Digital Download comes right after the book, before the book-related upsells.

### Change

**`src/components/builder/CheckoutStep.tsx`** — Reorder the `lines.push()` calls in `handleCheckout` to match:

1. **Coloring Book** (main product)
2. **Unique Photos** (book-related upsell)
3. **Personalize Cover** (book-related upsell)
4. **Digital Download** (standalone add-on, last)

Currently the code pushes Digital Download second and Unique Photos third. The fix is simply swapping those two blocks so book-related add-ons appear directly beneath the book on the Shopify checkout page.

