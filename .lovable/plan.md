

## Redesign Pricing Page to Match Piccoload.com Product Page

Transform the current simple pricing page into a high-converting product page layout that mirrors the structure and elements from your live Shopify product page.

### What the page will look like

The new layout takes the best-converting elements from your Shopify product page and rebuilds them within your Lovable app. On desktop, it uses a two-column layout (images left, product details right). On mobile, it stacks vertically.

### Key elements being replicated

**1. Product image gallery (left column)**
- Large hero image showing the coloring book product
- Row of clickable thumbnail images below
- Uses your existing uploaded product images from `public/lovable-uploads/`

**2. Star rating + review count**
- "4.95 out of 5 -- 3952 reviews" displayed prominently above the title
- Five filled stars with the review count as a link/text

**3. Product title with display font**
- "PERSONALISED COLORING BOOK" in the Bristol display font, matching the reference

**4. Emoji feature bullets (replacing plain checkmarks)**
- Camera emoji: "Each book contains 20 Custom Photo Pages"
- Heart emoji: "Personalized Line Art from Your Own Photos"
- Gift emoji: "A Thoughtful Gift for Any Occasion"
- Zen emoji: "Designed for Calm, Creativity & Connection"

**5. Description paragraph**
- Same text as current, matching the Shopify page copy

**6. Urgency sale divider + countdown timer**
- "FEBRUARY SALE - FINAL DAY!" divider line
- A countdown timer bar: "Hurry! Offer expires in HH:MM:SS" with a clock emoji
- Timer counts down to midnight of the current day, resetting daily

**7. Updated pricing tiers (matching Shopify prices)**
- 1 Book: $35.00 (was $45.00) -- "You save 22%"
- 2 Books: $59.50 (was $90.00) -- "You save 34%" + "SAVE $30.50" badge + "MOST POPULAR" label
- 3 Books: $69.30 (was $135.00) -- "You save 45%" + "SAVE $65.70" badge + "BEST VALUE" label

**8. Unique Photos upsell checkbox**
- Inline checkbox: "Have 20 different photos in each book!" with thumbnail image
- Subtitle: "If unticked, all books in the bundle will contain the same photos"
- Price: $5.99
- Only shows when quantity > 1

**9. "Add to Cart" button**
- Full-width CTA button

**10. Trust badges**
- "Guarantee safe & secure checkout" with payment icons row below

**11. Process note**
- Highlighted text: "Our process is simple. You will be sent a secure link to upload your photos after purchase..."
- (Adapted: since our flow goes straight to the builder, this will say something like "Next step: upload your photos and preview your book")

**12. FAQ accordion section (inline on the page)**
- Reuses the same FAQ data already in the project
- Displayed directly below the product details, matching the Shopify page layout

**13. Customer testimonials section**
- Horizontally scrolling cards with customer photo, name, title, and review text
- Features: Georgie, Ewan, Tom, Ellie, Matilda (matching the Shopify page)

### Technical details

**Files to modify:**
- `src/components/landing/PricingSection.tsx` -- Complete rewrite to the new two-column product page layout with all elements above
- `src/contexts/BasketContext.tsx` -- Update pricing tiers to match new Shopify prices (1 book = $35/$45, 2 books = $29.75 each/$45, 3 books = $23.10 each/$45)
- `src/pages/Pricing.tsx` -- Remove the separate `CTASection` since the product page is now self-contained

**New components to create:**
- `src/components/landing/ProductImageGallery.tsx` -- Image gallery with main image + thumbnails
- `src/components/landing/CountdownTimer.tsx` -- Countdown timer that counts to midnight daily
- `src/components/landing/CustomerTestimonials.tsx` -- Scrolling testimonial cards with customer photos and reviews
- `src/components/landing/TrustBadges.tsx` -- Payment/security trust badge row

**No backend changes needed** -- this is purely a frontend layout and pricing update.
