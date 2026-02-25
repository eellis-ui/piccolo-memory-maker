

# Pull Product Images from Shopify

## What We'll Do
Update the product image gallery on the pricing page to dynamically load all product photos from your Shopify store instead of the 3 hardcoded images it currently uses.

Your Shopify product ("Personalised Coloring Book") already has multiple images uploaded -- they'll all show up automatically, and any future image changes in Shopify will be reflected on the site.

## Technical Approach

### 1. Update `ProductImageGallery` to accept images as props
- Change the component from using a hardcoded `images` array to accepting an `images` prop
- Add a loading skeleton state for while images are fetching

### 2. Fetch product images via Storefront API in `PricingSection`
- Use the existing `storefrontApiRequest` helper from `src/lib/shopify.ts` to query the Storefront API for the "Personalised Coloring Book" product images
- Query by handle (`personalized-coloring-book`) to get all image URLs and alt text
- Pass the fetched images down to `ProductImageGallery`

### 3. Fallback behaviour
- While loading, show skeleton placeholders in the gallery
- If the API call fails, fall back to the current 3 local images so the page never appears broken

### Files Changed
- `src/components/landing/ProductImageGallery.tsx` -- accept `images` prop, add loading state
- `src/components/landing/PricingSection.tsx` -- fetch product images from Shopify on mount, pass to gallery

