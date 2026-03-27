

## What's been happening

You've been approving browser navigation requests (to test checkout URLs), not code deployments. The actual code fix — forcing checkout URLs to use `piccaload.myshopify.com` instead of `piccoload.com` — was already applied to `src/lib/shopify.ts` in an earlier message.

However, there's one remaining issue: the `channel=online_store` query parameter is **not** being added to the checkout URL. The Shopify skill docs say this parameter is required for the checkout to work properly.

## Plan

**Single file change: `src/lib/shopify.ts`**

Update `formatCheckoutUrl` to also append the `channel=online_store` query parameter:

```typescript
function formatCheckoutUrl(checkoutUrl: string): string {
  try {
    const url = new URL(checkoutUrl);
    url.host = SHOPIFY_STORE_PERMANENT_DOMAIN;
    url.protocol = 'https:';
    url.searchParams.set('channel', 'online_store');
    return url.toString();
  } catch {
    return checkoutUrl;
  }
}
```

This is a one-line addition. The domain rewrite is already in place; this ensures the checkout page routes through the correct Shopify sales channel.

## What to test after

Go through the full builder flow (Upload → Approve → Cover → Checkout → click "Secure Checkout") and confirm the Shopify payment page loads in the new tab instead of showing a 404.

