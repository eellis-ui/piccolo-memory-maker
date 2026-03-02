
# Dynamic Free Shipping Progress Bar

## What Changes
The cart drawer currently always shows "Free shipping unlocked!" with a full progress bar. This will be updated so:

- **Under $35**: Shows "You're $X.XX away from free shipping!" with a partially filled progress bar
- **At or over $35**: Shows "Free shipping unlocked!" with a full progress bar and the tag icon

## Where
- **`src/components/layout/Navbar.tsx`** (BasketContent component, lines 60-70): Update the free shipping bar section to calculate cart total from `items` and render conditionally based on the $35 threshold.

## Technical Details

1. Calculate the cart subtotal from the `items` array (sum of `totalPrice` for all line items)
2. Define `FREE_SHIPPING_THRESHOLD = 35`
3. Compute `progressPercent = Math.min(100, (subtotal / threshold) * 100)`
4. Compute `amountRemaining = threshold - subtotal`
5. Conditionally render:
   - If `subtotal >= 35`: "Free shipping unlocked!" with 100% progress bar
   - If `subtotal < 35`: "You're $X.XX away from free shipping!" with partial progress bar
6. Also update the **GuaranteeBadges** component to show "Free Shipping over $35" instead of just "Free Shipping" for clarity on the product page
