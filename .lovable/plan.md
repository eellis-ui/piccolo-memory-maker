

## Analysis: Shopify Checkout Line Item Grouping

### The Problem

In your current Shopify theme, add-ons (Unique Photos, Digital Download, Personalize Cover) appear visually grouped/indented beneath the main "Personalised Coloring Book" product in checkout. When using the Storefront API `cartCreate` mutation (the Lovable approach), each line item is sent as a separate product variant, so Shopify's checkout renders them as flat, unrelated items with no visual hierarchy.

### Why This Happens

Shopify's checkout UI groups line items **by parent product**. If multiple variants belong to the **same product**, they appear visually connected. Your current theme likely has the add-ons configured as variants of the main Coloring Book product, so they auto-group. In our implementation, `COLORING_BOOK`, `DIGITAL_DOWNLOAD`, `UNIQUE_PHOTOS`, and `PERSONALIZE_COVER` are all **separate products** with their own variant IDs — so Shopify treats them independently.

### Proposed Solution

**Use Shopify cart line `attributes`** to attach metadata to each line item. While this won't force Shopify's checkout to visually indent items (that's controlled by parent product grouping), it will:

1. Add descriptive labels beneath each line item in checkout (e.g., "Add-on for: Personalised Coloring Book")
2. Keep the items in logical order (main product first, then add-ons)

**Changes required:**

1. **`src/lib/shopify.ts`** — Update the `CartLineInput` type and `CART_CREATE_MUTATION` to support `attributes` (key-value pairs) on each cart line:
   ```graphql
   lines: [{ merchandiseId: "...", quantity: 1, attributes: [{ key: "For", value: "Coloring Book" }] }]
   ```

2. **`src/components/builder/CheckoutStep.tsx`** — Add attributes to each add-on line item to label them as belonging to the main product.

### Alternative (Shopify Admin side)

If you truly need the indented/grouped appearance, the only reliable way is to restructure your Shopify products so the add-ons are **variants of the same parent product** rather than separate products. This is a Shopify Admin change, not a code change. However, this has trade-offs (variant limits, pricing complexity).

### Recommendation

Start with **cart line attributes** — it's a quick code-only fix that adds context to each item in checkout. If the visual grouping is critical, we can discuss restructuring the Shopify products afterward.

