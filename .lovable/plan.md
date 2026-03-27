

## Fix: Shopify Checkout 404 Error

### Problem
The `formatCheckoutUrl` function on line 59-67 of `src/lib/shopify.ts` forces `channel=online_store` onto every checkout URL. Since your store uses the Storefront API (headless) rather than the Online Store sales channel, this parameter points Shopify to a channel that isn't configured for your setup, resulting in a 404.

### Solution
**One file change: `src/lib/shopify.ts`**

Simplify `formatCheckoutUrl` to return the checkout URL exactly as Shopify's Cart API provides it:

```typescript
function formatCheckoutUrl(checkoutUrl: string): string {
  return checkoutUrl;
}
```

This lets Shopify route the checkout through whichever sales channel your storefront token is associated with (Headless), which is where checkout actually works.

### Why It Works
Your Shopify store is on a paid Basic plan, so checkout is enabled. The Storefront API already returns a valid checkout URL for the correct sales channel. Overriding it with `channel=online_store` redirects to a channel that may not have checkout configured, causing the 404.

