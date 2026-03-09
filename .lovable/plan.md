

## Plan: Build-First, Pay-Last Flow with Stripe Checkout

### Current Flow (to change)
Pricing → Add to Cart → Builder (Upload → Approve → Cover → **Shopify Checkout**) → Post-payment "Thank You" banner → Upload photos

### New Flow
Pricing → Add to Cart → Builder (Upload → Approve → Cover → **Stripe Checkout**) → Payment confirmation page

The build process already happens before payment in the current step sequence. The main change is replacing Shopify checkout with Stripe checkout and removing the post-checkout loop-back logic.

### Steps

**1. Create Stripe Products & Prices**
Create the matching products/prices in Stripe for:
- Coloring Book 1-pack ($35), 2-pack ($59.50), 3-pack ($69.30)
- Digital Download add-on ($6.99)
- Unique Photos add-on ($4.99)
- Personalize Cover add-on ($1.99)

**2. Create a `create-stripe-checkout` Edge Function**
A new backend function that:
- Accepts line items (product quantities, add-ons, session ID)
- Creates a Stripe Checkout Session with the correct line items
- Passes the guest `sessionId` as metadata so the webhook can link it later
- Returns the checkout URL
- Sets success/cancel URLs back to the builder page

**3. Update `CheckoutStep.tsx` — Replace Shopify with Stripe**
- Remove Shopify cart creation (`createShopifyCheckout`)
- Instead, call the new `create-stripe-checkout` edge function
- Open the returned Stripe checkout URL in the same or new tab
- Remove the "awaiting payment" UI and `visibilitychange` listener (Stripe redirects back via `success_url`)

**4. Create a `stripe-webhook` Edge Function**
- Listens for `checkout.session.completed` events
- Extracts the `sessionId` from metadata
- Updates the orders in the database (marks as paid, stores Stripe payment ID)
- Triggers line-art conversion (same as the current Shopify webhook does)

**5. Update `Builder.tsx` — Simplify Post-Checkout**
- Remove the `postCheckout` state and "Thank You" banner (no longer needed since payment is the final step)
- Remove `handleCheckoutComplete` callback and `paid=true` URL param logic
- The checkout step is now simply the last step; after payment, Stripe redirects to a success page

**6. Add a Success/Thank You Page**
- New route `/order-confirmed` 
- Shows order confirmation with a thank-you message
- Clears the basket and session

**7. Remove Shopify Dependencies**
- Remove `src/lib/shopify.ts` (Shopify storefront API)
- Remove Shopify imports from `CheckoutStep.tsx` and `PricingSection.tsx`
- Clean up any remaining Shopify references

### What Stays the Same
- The builder step flow (Upload → Approve → Cover) is unchanged
- Guest session model and database schema remain the same
- Basket context and pricing tiers stay as-is
- All photo upload, approval, and cover design functionality is untouched

