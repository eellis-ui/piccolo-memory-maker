

## Fix: Shopify Checkout 404 — Re-add `channel=online_store`

### Problem
The previous fix **removed** the `channel=online_store` parameter from checkout URLs, but this parameter is actually **required** for Shopify checkouts to work when using the Storefront API. Without it, Shopify doesn't know which sales channel to route the checkout through, resulting in a 404.

Since password protection is confirmed off, the real fix is to **add back** the `channel=online_store` parameter.

### Solution
**One file change: `src/lib/shopify.ts`**

Restore `formatCheckoutUrl` to append `channel=online_store`:

```typescript
function formatCheckoutUrl(checkoutUrl: string): string {
  try {
    const url = new URL(checkoutUrl);
    url.searchParams.set('channel', 'online_store');
    return url.toString();
  } catch {
    return checkoutUrl;
  }
}
```

### Why This Should Work
- Password protection is disabled (user confirmed)
- The `channel=online_store` parameter tells Shopify to route checkout through the Online Store channel, which is the standard channel for processing payments
- Without this parameter, the checkout URL may point to the Headless channel which might not have checkout properly configured on this store

### Additional Debugging
If the 404 persists after this change, the products may not be "available" on the Online Store sales channel in Shopify. The user would need to check **Products → [each product] → Sales channels** in Shopify admin and ensure "Online Store" is checked.

