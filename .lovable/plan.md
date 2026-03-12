

## Plan: Post-Checkout Thank You Banner on Builder Page

### Current Flow
Checkout opens Shopify in a **new tab** (`window.open`). The original Builder tab remains open. After payment, the customer switches back to the Builder tab.

### Problem
When customers return to the Builder tab after paying, there's no acknowledgment of their payment and no clear prompt to start uploading photos.

### Proposed Changes

**1. `src/pages/Builder.tsx`** — Add a `postCheckout` state
- Detect a `paid=true` URL parameter OR set it locally after checkout button is clicked
- When `postCheckout` is true, show a thank-you banner at the top of the builder (above progress steps)
- Reset the builder to the upload step so they're ready to add photos
- The banner includes: a confirmation message ("Thank you for your order!"), a prompt ("Now upload your photos to create your coloring book"), and a friendly icon

**2. `src/components/builder/CheckoutStep.tsx`** — After opening checkout URL
- After `window.open(checkoutUrl, '_blank')`, call a new `onCheckoutComplete` callback prop
- This lets the parent Builder component transition to the post-checkout upload state

**3. `src/pages/Builder.tsx`** — Handle checkout complete
- Add `onCheckoutComplete` handler that sets `showingCheckout = false`, sets a `postCheckout = true` state, and updates the URL with `&paid=true`
- The builder then shows the upload step with the thank-you banner on top

### Thank You Banner Design
A full-width, visually distinct banner (green/success themed) at the top of the builder content area:
- Check icon + "Thank You For Your Order!"  
- Subtext: "Your payment was successful. Now let's create your coloring book — start by uploading your favorite photos below."
- Dismissible with an X button

### What Won't Change
- The Shopify checkout still opens in a new tab (required by Shopify)
- All existing builder steps and session persistence remain intact

