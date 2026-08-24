# Pricing: displayed vs charged

Audited 2026-08-24 against the live Shopify store (`piccaload.myshopify.com`)
by creating real carts through the Storefront API.

## The market bug (fixed)

The store has two markets, **GB/GBP** and **US/USD**. A cart created without a
buyer country falls back to the GB market. The app was creating carts with no
country, so a US shopper who saw `$59.50` was sent to a checkout billing
**£37.00 GBP**.

`createShopifyCheckout()` now pins every cart to `buyerIdentity.countryCode:
"US"`, and logs an error if Shopify ever prices a cart in anything but USD.
Guarded by `src/lib/shopify-market.test.ts`.

This is also why the Meta pixel was hardcoded to GBP — the checkout genuinely
was in GBP.

## Remaining mismatch (needs a decision)

Pinning the market fixes the currency but not the amounts. Shopify's USD prices
are lower than the prices the site displays:

| Scenario | Site shows | Live before fix | After fix | Still off by |
|---|---|---|---|---|
| 1 book | $35.00 | £24.00 | $31.99 | −$3.01 |
| 2 books | $59.50 | £37.00 | $49.99 | −$9.51 |
| 3 books | $69.30 | £44.00 | $59.99 | −$9.31 |
| 2 books + photos + cover | $68.47 | £46.00 | $59.96 | −$8.51 |
| 1 book + digital | $41.99 | £29.00 | $37.98 | −$4.01 |

Per line item:

| Item | Site constant | Shopify US price | Note |
|---|---|---|---|
| 1 book | `PRICING_TIERS` 35.00 | 31.99 | undercharged |
| 2 books | 29.75 × 2 = 59.50 | 49.99 | undercharged |
| 3 books | 23.10 × 3 = 69.30 | 59.99 | undercharged |
| Extra photos | `UNIQUE_PHOTOS_PRICE` 4.99 | 5.99 | **overcharged $1.00** |
| Custom cover | `PERSONALIZE_COVER_PRICE` 1.99 | 1.99 | matches |
| Digital download | `DIGITAL_DOWNLOAD_PRICE` 6.99 | 5.99 | undercharged |
| Extra pages | $6 / $10 / $18 per book | — | **no Shopify line item — never charged** |
| Title / dedication page | `ADD_ON_PRICE` 1.99 | — | **no Shopify line item — never charged** |

Two prices are the site's own, with nothing on Shopify behind them: extra pages
and the title/dedication page add-on are added to the displayed total and to
the pixel's Purchase value, but no line is ever pushed to the cart.

Fixing this means choosing which side is authoritative — raise the Shopify
variant prices to match the site, or lower the displayed prices to match
Shopify. That is a pricing decision, not a code fix, so nothing here changes
the amounts.

## Why it matters for the pixel

The browser `Purchase` reports the displayed total; the server `Purchase` (from
`shopify-order-webhook`) reports Shopify's real order total. While the two
disagree, the deduplicated event Meta keeps depends on which arrives first, so
reported revenue will be inconsistent until the amounts are reconciled.

## Reproducing

Carts are not orders — creating them charges nothing:

```graphql
mutation { cartCreate(input: {
  lines: [{ merchandiseId: "gid://shopify/ProductVariant/57146362397045", quantity: 1 }]
  buyerIdentity: { countryCode: US }
}) { cart { cost { subtotalAmount { amount currencyCode } } } } }
```

Drop `buyerIdentity` to see the GB-market fallback.
