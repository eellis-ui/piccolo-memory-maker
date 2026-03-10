

## Plan: Change "Submit Your Order" to "Checkout" with Shopify Cart

### What Changed
The user previously asked to skip checkout and go straight to a thank-you page, but now wants to revert: the Recap page's button should say **"Checkout"** and open the Shopify checkout (via the existing `CheckoutStep` flow).

### Changes

**1. `src/components/builder/RecapStep.tsx`** — Rename button
- Change "Submit Your Order" to "Checkout"

**2. `src/pages/Builder.tsx`** — Route recap → checkout instead of thank-you
- Update the `onContinueToCheckout` handler to set `showingRecap = false` and `showingCheckout = true` (instead of `setPostCheckout(true)`)
- Remove the `paid=true` URL param setting from this handler (that should only happen after actual payment)

This restores the original flow: **Recap → CheckoutStep → Shopify payment → Thank You page**.

