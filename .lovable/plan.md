

## Plan: Pay-First Flow with Stripe Checkout

The current flow is: Select product → Upload photos → Approve → Cover → Checkout (Shopify). You want to flip this so customers **pay first via Stripe**, then get access to the builder.

### New Customer Flow

```text
Pricing Page (select quantity/add-ons)
        ↓
   Stripe Checkout (new tab)
        ↓
   Stripe webhook confirms payment
        ↓
   User returns to builder tab
        ↓
   Upload → Approve → Cover → Done
```

### Step 1: Enable Stripe Integration
Use the Stripe integration tool to connect your Stripe account. This will prompt you for your Stripe secret key and unlock Stripe-specific tools for creating products/prices.

### Step 2: Create Stripe Products & Prices
Set up Stripe products matching your pricing tiers:
- 1 book: £35.00
- 2 books: £59.50
- 3 books: £69.30
- Add-ons: Unique Photos (£4.99), Digital Download (£6.99), Personalize Cover (£1.99)

### Step 3: Create `stripe-checkout` Edge Function
- Accepts: quantity, add-on selections, session ID
- Creates a Stripe Checkout Session with the correct line items
- Sets `success_url` back to `/builder?sessionId={id}&paid=true`
- Returns the checkout URL to the frontend

### Step 4: Create `stripe-webhook` Edge Function
- Verifies Stripe signature using a webhook secret
- On `checkout.session.completed`: updates the order's `payment_status` to `"paid"` and `status` to `"confirmed"`
- Triggers any auto-processing if needed

### Step 5: Update Pricing Page / CTA
- Replace the "Add to Cart → Shopify Checkout" flow with a direct "Buy Now" button that calls the `stripe-checkout` edge function and redirects to Stripe
- Create the guest session and order records before redirecting so the builder has data ready when they return

### Step 6: Update Builder Page
- Remove the Checkout step from the builder steps (no more `checkout` tab)
- Builder becomes: Upload → Approve → Cover → Done
- The `paid=true` parameter and DB `payment_status` gate access to the builder
- Keep the existing post-checkout banner and session resume logic

### Step 7: Remove Shopify Checkout Code
- Remove `createShopifyCheckout` usage from `CheckoutStep.tsx`
- Remove Shopify checkout logic from `BasketContext` if no longer needed
- Keep Shopify webhook if you still want Shopify order sync, otherwise remove

### Technical Details
- **Database**: Add `stripe_checkout_session_id` and `stripe_payment_intent_id` columns to `orders` table for tracking
- **Security**: Stripe webhook verification using signing secret stored as a backend secret
- **Session continuity**: Guest session ID is embedded in Stripe checkout metadata and `success_url`, so the user returns to the correct builder session
- **No auth required**: Maintains the current guest checkout flow — no login needed

