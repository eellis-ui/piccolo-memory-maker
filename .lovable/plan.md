

## Problem

`window.open(checkoutUrl, '_blank')` on line 242 is called **after** an `await` (the `createShopifyCheckout` call). Because the `window.open` is no longer in the synchronous call stack of the user's click event, mobile browsers (and many desktop browsers) silently block it as a popup.

## Solution

Open the new window **immediately** on click (synchronously, within the click handler's trust), then navigate it to the checkout URL once the API responds. If the API fails, close the blank window.

## Changes — `src/components/builder/CheckoutStep.tsx`

Update the `handleCheckout` function (~lines 187-250):

```tsx
const handleCheckout = async () => {
  setIsCheckingOut(true);
  
  // Open window immediately (synchronous, trusted click context)
  const newWindow = window.open('about:blank', '_blank');
  
  try {
    // ... build lines array (unchanged) ...

    const checkoutUrl = await createShopifyCheckout(lines, sessionId || undefined);
    if (checkoutUrl && newWindow) {
      newWindow.location.href = checkoutUrl;
      setAwaitingPayment(true);
    } else {
      // API failed or returned null — close the blank tab
      newWindow?.close();
    }
  } catch (error) {
    console.error('Checkout error:', error);
    newWindow?.close();
  } finally {
    setIsCheckingOut(false);
  }
};
```

**Key change**: `window.open('about:blank', '_blank')` runs synchronously in the click handler, so browsers trust it. Then `newWindow.location.href = checkoutUrl` navigates it after the API call completes.

## Additionally: Faster polling (from approved plan)

- Reduce polling interval from 5s → 2s (line 148)
- Add a "Checking…" spinner on visibility change

## Files to change

- `src/components/builder/CheckoutStep.tsx` — Fix popup blocking + faster polling

