

## Scrolling Quote Banners (matching piccoload.com)

Update the existing `ReviewsBanner` component and add a second instance to match the piccoload.com homepage layout.

### What changes

**1. Update `ReviewsBanner.tsx`**
- Replace the current review quotes with the exact ones from piccoload.com:
  - "Love it SOO much" - Ellie, UK
  - "Mums Birthday is complete!" - Georgie, USA
  - "Really enjoyed colouring my London Marathon run!" - Ewan, UK
  - "Exactly what I didn't know I needed" - Matilda, UK
- Mix in a promotional message: "Buy Three, Save 40%!"
- Replace the star icons with a small sketchbook/pencil icon separator (matching the piccoload.com style)
- Keep the same dark background with light text, continuous scrolling animation

**2. Add a second scrolling banner below the hero section**
- The piccoload.com site has a second identical banner that appears below the hero/gallery area
- Add `ReviewsBanner` a second time in `Index.tsx`, placed after the hero section

**3. No animation changes needed**
- The existing `@keyframes scroll` in `index.css` already handles the infinite horizontal scroll -- it will be reused as-is

### Technical details

- **File: `src/components/landing/ReviewsBanner.tsx`** -- Update the quotes array, replace star separators with a small icon, and match the text-only style (quote + name/location, no stars)
- **File: `src/pages/Index.tsx`** -- Add a second `<ReviewsBanner />` after `<HeroSection />`
