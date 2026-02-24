

## Add Judge.me-Style Customer Reviews Section

Add a full customer reviews section to the pricing/product page, replicating the judge.me review widget from your Shopify page. This goes below the existing testimonials section.

### What it looks like

The section has two parts:

**1. Review summary header**
- "Customer Reviews" heading
- Large "4.95 out of 5" rating with stars
- "Based on 3,952 reviews" with a verified checkmark
- Star distribution bars (5-star: 3814, 4-star: 85, 3-star: 52, 2-star: 1, 1-star: 0)

**2. Individual review cards**
- Each review shows: date, reviewer name, star rating, review text
- Some have a "Verified" badge
- Reviews pulled from the actual judge.me data on your Shopify page:
  - Anonymous (02/23/2026): "These are absolutely amazing! We love them..."
  - Makeba (02/08/2026): "Beautiful product just as advertised"
  - Paul H (01/29/2026): "Fun project to have someone do..."
  - Karen Ryan (01/28/2026): "Loved the product."
  - Karina F. (01/28/2026): "Very happy with my order!..."

### Changes

**New file: `src/components/landing/CustomerReviewsSection.tsx`**
- Self-contained component with hardcoded review data matching the live site
- Star distribution bar chart (horizontal bars showing count per star level)
- Review cards with date, name, optional verified badge, star rating, and text
- Clean, minimal styling matching the rest of the product page

**Modified: `src/components/landing/PricingSection.tsx`**
- Import and add `CustomerReviewsSection` below the existing `CustomerTestimonials` component (around line 245)

### No backend changes needed
The reviews are hardcoded to match what's on the live Shopify page. This keeps it simple and fast-loading.

