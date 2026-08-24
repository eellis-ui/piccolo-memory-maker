# Pricing: displayed vs charged

Audited against the live Shopify store (`piccaload.myshopify.com`) by creating
real carts through the Storefront API. Last verified 24 Aug 2026.

## The market bug (fixed in code, not yet deployed)

The store has two markets, **GB/GBP** and **US/USD**. A cart created without a
buyer country falls back to the GB market. The app was creating carts with no
country, so a US shopper who saw `$59.50` was sent to a checkout billing in
**pounds** at GB-market prices.

`createShopifyCheckout()` now pins every cart to `buyerIdentity.countryCode:
"US"` and logs an error if Shopify ever prices a cart in anything but USD.
Guarded by `src/lib/shopify-market.test.ts`.

This is also why the Meta pixel was hardcoded to GBP — the checkout genuinely
was in GBP.

**This fix is not live.** Until the frontend is deployed, production still
creates GB-market carts, so the figures in the "live today" column below are
what customers are actually charged right now.

## Current state

| Scenario | Site shows | Live today (GB cart) | After deploy | Gap |
|---|---|---|---|---|
| 1 book | $35.00 | £26.00 | $35.00 | match |
| 2 books | $59.50 | £44.00 | $59.50 | match |
| 3 books | $69.30 | £51.00 | $69.50 | **−$0.20** |
| 2 books + photos + cover | $69.47 | £53.00 | $69.47 | match |
| 1 book + digital | $41.99 | £32.00 | $41.99 | match |

Per line item:

| Item | Site constant | Shopify US price | Status |
|---|---|---|---|
| 1 book | `PRICING_TIERS` 35.00 | 35.00 | matches |
| 2 books | `PRICING_TIERS` 59.50 | 59.50 | matches |
| 3 books | `PRICING_TIERS` 69.30 | **69.50** | **mismatch** |
| Extra photos | `UNIQUE_PHOTOS_PRICE` 5.99 | 5.99 | matches |
| Custom cover | `PERSONALIZE_COVER_PRICE` 1.99 | 1.99 | matches |
| Digital download | `DIGITAL_DOWNLOAD_PRICE` 6.99 | 6.99 | matches |

### Outstanding: the 3-book bundle

The site says $69.30, Shopify charges $69.50, so a 3-book order overcharges by
20c. Either set the Shopify variant to `69.30`, or change `PRICING_TIERS` in
`src/contexts/BasketContext.tsx` to `69.50` — the code currently says 69.30.

## Bundle price is authoritative

`PRICING_TIERS` stores `bundlePrice`, not a per-book price, because a bundle
total need not divide evenly by its book count. Per-book figures are derived
for display only. `PricingSection` derives its prices and savings badges from
the same tiers rather than keeping a second hardcoded copy — the two used to
drift independently.

## Known add-on quirk

The builder's title-page and dedication-page toggles both bill through the same
Shopify `PERSONALIZE_COVER` variant, but the two sides count differently:

- **Displayed total** *sums* the contributions — title page, dedication page
  and the basket's "personalize cover" option each add $1.99.
- **The Shopify line** takes the *maximum* of the title-page-derived count and
  the basket count, not the sum.

So a customer who selects more than one of those is shown more than Shopify
charges. Not a currency or price-list problem — the two counting rules simply
disagree. Reconciling them means picking which rule is intended.

## Not a thing any more

**Extra pages** (`extraPages`) is dead. `Builder.tsx` passes `extraPages={0}`,
so `extraPagesPrice` is always $0 and it is neither shown nor charged. The
plumbing is still in `CheckoutStep` but contributes nothing.

## Reproducing

Carts are not orders — creating them charges nothing:

```graphql
mutation { cartCreate(input: {
  lines: [{ merchandiseId: "gid://shopify/ProductVariant/57146362397045", quantity: 1 }]
  buyerIdentity: { countryCode: US }
}) { cart { cost { subtotalAmount { amount currencyCode } } } } }
```

Drop `buyerIdentity` to see the GB-market fallback.
