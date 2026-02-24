

## Redesign Cart Drawer to Match Reference

Update the basket/cart drawer in the Navbar to match the Shopify cart design shown in the reference screenshot.

### Elements to add (top to bottom)

**1. Next steps banner (top of cart)**
- Sparkle emoji with reassuring message: "You're in good hands! After your purchase, we'll email you clear, easy-to-follow steps to upload your photos for your one-of-a-kind coloring book."
- Dark background with white text, rounded corners

**2. Free shipping progress bar**
- "Free shipping unlocked!" text
- Full progress bar with a checkmark/sparkle icon at the end
- Since all orders qualify, this is always shown as "unlocked"

**3. Redesigned cart item card**
- Product image thumbnail (using the existing product image from lovable-uploads)
- "Personalised Coloring Book" title with trash icon
- Quantity controls (minus / number / plus) inline
- Strikethrough original price + sale price + "(Save $X.XX)" in green
- "FEBRUARY SALE" badge with sparkle icon

**4. Digital copies upsell card**
- Thumbnail image, title "Get Digital Copies Delivered within 24 hours!"
- Strikethrough original price + sale price
- Toggle switch to enable/disable
- Description text below

**5. Discounts line**
- "Discounts" label with "FEBRUARY SALE" badge
- Negative discount amount shown

**6. Checkout button**
- Full-width dark button: "Checkout . $XX.XX"

**7. Payment trust badges (bottom)**
- Row of payment method icons: Apple Pay, Google Pay, PayPal, AMEX, Visa, Mastercard, Maestro, Shop Pay
- Using text-based badges similar to the existing TrustBadges component

### Technical changes

**Modified: `src/components/layout/Navbar.tsx`**
- Rewrite the `BasketContent` component to include all the above elements
- Add the reassurance banner at the top
- Add the free shipping bar
- Redesign the item card with product image, inline quantity controls, sale pricing, and FEBRUARY SALE badge
- Add the digital copies upsell with toggle switch
- Add discounts line showing the savings from the sale
- Replace the "Continue to Builder" button with "Checkout" style button
- Add payment method badges at the bottom

No new files needed -- all changes are within the existing `BasketContent` component in Navbar.tsx.

