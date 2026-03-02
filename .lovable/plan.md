

# Change Book Preview to A4 Aspect Ratio

## What's changing
The large page preview currently uses `aspect-[3/4]` (0.75 ratio), but A4 paper is 210mm x 297mm (0.707 ratio) -- slightly taller and narrower. We'll update this to match true A4 proportions so the preview accurately represents how the printed book pages will look.

## Technical details

### `src/components/builder/BookPreview.tsx`

**Single change** -- update the aspect ratio class on the main page view container (around line 237):

- Change `aspect-[3/4]` to `aspect-[210/297]`

This applies to the cover, back cover, and all line-art page views since they all render inside this same container.

No other files need changes.

