

## Plan: Pause Builder Until Payment Confirmed, Then Show Upload Step

### Current Flow
Checkout opens Shopify in a new tab via `window.open`. The builder immediately transitions to a post-checkout state after the tab opens — but there's no actual payment confirmation.

### New Flow
1. Checkout opens in a **new tab** (kept as-is)
2. The original tab shows a **"waiting for payment"** overlay/state instead of immediately transitioning
3. The tab polls for payment confirmation using `visibilitychange` — when the user switches back, it checks a flag
4. Since we can't get real-time payment confirmation from Shopify via the Storefront API, we use the pragmatic approach: when the user returns to the tab (tab becomes visible again after checkout was opened), we treat that as "payment completed" and transition to the upload step with the thank-you banner

### Changes

**1. `src/components/builder/CheckoutStep.tsx`**
- After `window.open(checkoutUrl, '_blank')`, instead of calling `onCheckoutComplete` immediately, set a local `awaitingPayment` state to `true`
- Show a waiting UI: "Complete your payment in the other tab. Once done, come back here."
- Listen for `visibilitychange` — when the tab becomes visible again and `awaitingPayment` is true, call `onCheckoutComplete()`

**2. `src/pages/Builder.tsx`**
- `handleCheckoutComplete` already sets `postCheckout = true` and hides checkout — keep this
- Additionally, reset all books back to the `upload` step so the user lands on the photo upload page
- The thank-you banner (already implemented) shows at the top

### Waiting State UI (CheckoutStep)
When `awaitingPayment` is true, replace the checkout content with a centered message:
- Spinner/icon + "Waiting for payment..."
- "Complete your purchase in the Shopify tab, then return here"
- A "I've completed payment" button as a manual fallback

