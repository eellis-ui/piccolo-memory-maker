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

## Add-on charges: 50 of 80 combinations undercharge

`npm run verify:pricing` walks every combination a customer can select,
computes the displayed total and creates a real Shopify cart from the lines
the app would send. Result as of 24 Aug 2026: **30 of 80 match, 50 undercharge**
by $1.99 or $3.98. Nothing overcharges.

Bundle prices, extra photos and the digital download are all correct. Every
failure comes from the three add-on toggles, via two independent bugs:

### 1. The dedication page is never charged

The displayed total counts it (`perBookAddOnsTotal` includes
`dedicationPageEnabled`), but the Shopify `PERSONALIZE_COVER` line derives its
quantity from `titlePageEnabled` only. Dedication contributes to no line item,
so it is advertised at +$1.99 and billed at $0 — in every combination where it
is selected.

### 2. Cover and title page collapse into one charge

The displayed total *sums* the contributions: title page, dedication page and
the basket's "personalize cover" option each add $1.99. The Shopify line takes
the *maximum* of the title-page-derived count and the basket count. So a
customer selecting both the basket cover option and a title page is shown
2 x $1.99 and charged 1 x $1.99.

The two bugs stack: cover + title + dedication is shown $3.98 above what
Shopify charges.

### Fixing it

Both sides need one counting rule. Which rule is the pricing decision:

- **Charge per add-on** (the displayed rule) — each of the three toggles bills
  $1.99. Customers pay what they are shown; revenue rises up to $3.98/order.
  Needs the cart lines changed, and a Shopify variant for the dedication page.
- **Charge once** (the Shopify rule) — one $1.99 cover charge however many
  toggles are on. Needs the displayed total changed to stop summing.

Nothing is changed here pending that decision. No customer has been
overcharged by this — it is lost revenue only.

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
