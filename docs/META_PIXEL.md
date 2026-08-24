# Meta Pixel & Conversions API

Pixel ID: **1809702712963152**. Currency is **USD** everywhere — the storefront
sells US-only and displays dollar prices.

## The funnel

Each event fires in exactly one place. Duplicates were removed deliberately:
firing the same event at two points in one journey doubles the number Meta
optimises against.

| Event | Fires where | Value |
|---|---|---|
| `PageView` | `index.html` on load, `ShopifyAnalytics` on SPA route change | — |
| `ViewContent` | `PricingSection` on `/pricing`; re-fires on bundle switch | selected bundle price (35.00 / 59.50 / 69.30) |
| `ViewContent` | `Builder` on builder entry | cart total |
| `AddToCart` | `PricingSection` → Add to Cart button | cart total incl. add-ons |
| `InitiateCheckout` | `Builder` on builder entry ("Go To Next Step") | cart total |
| `InitiateCheckout` | `Navbar` → cart drawer straight to Shopify checkout | cart total |
| `Purchase` | `CheckoutStep` once payment is confirmed | Shopify order total |

The homepage fires **PageView only**. `ViewContent` starts at `/pricing`, where
a specific bundle and price are actually on screen.

## Server-side (Conversions API)

Every commerce event is also sent server-side, so conversions still land when
the browser pixel is blocked. Browser and server events share an `event_id`;
Meta deduplicates on that, so a working pixel is counted once, not twice.

| Event | Server sender | Event ID |
|---|---|---|
| `AddToCart` | `meta-capi` edge function, called by the browser | random, generated per event |
| `InitiateCheckout` | `meta-capi` edge function, called by the browser | random, generated per event |
| `Purchase` | `shopify-order-webhook` edge function | `purchase-<shopify order number>` |

`Purchase` is deliberately **not** accepted by the `meta-capi` relay. It is sent
by the Shopify webhook, which reads the authoritative order total from Shopify —
a client-supplied purchase value would let anyone inflate revenue reporting.

The Purchase event ID is derived from the order number on both sides, so the
browser and the webhook arrive at the identical string without coordinating.
`purchaseEventId()` in `src/lib/meta-pixel.ts` and the template literal in
`shopify-order-webhook` must stay in sync.

## Secrets

Set these as Supabase edge function secrets (Dashboard → Edge Functions →
Secrets, or `supabase secrets set`):

| Name | Required | Purpose |
|---|---|---|
| `META_CAPI_ACCESS_TOKEN` | **yes** | Conversions API token from Events Manager → Settings → Conversions API → Generate access token |
| `META_PIXEL_ID` | no | Overrides the pixel ID; defaults to the live one |
| `META_TEST_EVENT_CODE` | no | Routes server events to Test Events. **Unset it after testing** — while set, events are test traffic and do not count as conversions |

Without `META_CAPI_ACCESS_TOKEN` both server-side senders log a warning and
skip. The browser pixel is unaffected, so the site degrades to browser-only
tracking rather than breaking.

## Verifying in Events Manager → Test Events

Open Events Manager → your pixel → **Test Events**, and either enter the site
URL or use the browser test-code panel.

1. **Homepage** — load `/`. Expect `PageView` only. **No `ViewContent`.**
2. **Pricing** — go to `/pricing`. Expect `ViewContent`, `currency: USD`,
   `value: 59.50` (2 books is the default selection).
3. **Bundle switch** — click "1 Coloring Book", wait a beat. Expect a second
   `ViewContent` with `value: 35.00`. Click "3 Coloring Books" → `value: 69.30`.
   Clicking through all three quickly should produce one event, not three.
4. **Add to Cart** — click Add to Cart. Expect the event name to read exactly
   `AddToCart` with `value` matching the button, `currency: USD`, and
   `num_items` equal to the bundle size.
5. **Add-ons** — tick "20 different photos" (+$4.99) and "Personalize your
   cover" (+$1.99), then Add to Cart. `value` must include both.
6. **InitiateCheckout** — click "Go To Next Step" into `/builder`. Expect
   `InitiateCheckout` with the cart total and `num_items`. It must fire **once**
   per builder entry, not again at the Shopify redirect.
7. **Deduplication** — for steps 4 and 6, Test Events should show the browser
   and server event collapsed into one row, flagged as deduplicated. Two
   separate rows for the same action means the `event_id` did not match.
8. **Purchase** — complete a real (or Shopify test-mode) order. Expect one
   `Purchase` with the full order total in USD, deduplicated between browser
   and server. Confirm the server half in the `shopify-order-webhook` logs:
   `Meta CAPI accepted Purchase: purchase-#<order number>`.
9. **Blocked-pixel path** — repeat steps 4, 6 and 8 with an ad blocker on. The
   browser events vanish; the server events must still arrive.
10. **Clean up** — unset `META_TEST_EVENT_CODE` when finished.

Server-side failures surface in the edge function logs (Supabase Dashboard →
Edge Functions → `meta-capi` / `shopify-order-webhook` → Logs), not in the
browser console.
