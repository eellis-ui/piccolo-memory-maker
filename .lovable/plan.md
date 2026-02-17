
# Redesigned Book Preview

## Problem
The current book preview is basic -- small spread view with tiny thumbnails, no cover page shown, and limited interactivity. Users can't visualize their finished book properly.

## Solution
Replace the current BookPreview with a polished, single-page-at-a-time flipbook experience that includes the cover as the first page and allows drag-to-reorder in a filmstrip below.

## What Changes

### 1. Redesigned BookPreview Component
- **Cover as Page 1**: The first "page" in the preview shows the actual cover design (logo, photos, title, dedication/subtitle) matching what CoverStep renders.
- **Single-page view**: Instead of a two-page spread, show one page at a time at a larger size so users can clearly see each line art drawing.
- **Page counter**: "Page 1 of 14" with previous/next navigation arrows.
- **Smooth transitions**: CSS transition when flipping between pages.
- **Current page highlight**: The active thumbnail in the filmstrip is highlighted with a ring.

### 2. Improved Filmstrip (Reorder Strip)
- Larger thumbnails (wider, taller) with clear page numbers.
- The cover thumbnail is shown first but is NOT draggable (fixed position).
- All other thumbnails remain drag-to-reorder using the existing dnd-kit setup.
- Scroll indicator when thumbnails overflow horizontally.
- Active page thumbnail gets a coloured border/ring so users know where they are.

### 3. Integration with Add-ons
- The BookPreview component receives `addOns` data from BasketContext so it can render the cover preview inline.
- It also receives the cover's selected photo data (passed down from ApproveStep or parent).

### 4. Show Preview Earlier
- Currently the BookPreview only appears when ALL photos are approved. This stays the same but the experience inside is much better.

## Technical Details

### Files Modified

**`src/components/builder/BookPreview.tsx`** -- Full rewrite:
- Accept new props: `coverTitle`, `coverSubtitle`, `coverPhotos` (the 2 selected cover images), `addOns` from basket context.
- Page 0 = Cover preview (rendered inline with logo, photos grid, title text, subtitle).
- Pages 1-N = The line art pages from `photos` array.
- Single large page view with aspect-ratio 3:4.
- Filmstrip below with dnd-kit sortable thumbnails (cover thumbnail locked, others draggable).
- Clicking a thumbnail jumps to that page.

**`src/components/builder/ApproveStep.tsx`** -- Minor updates:
- Pass additional cover-related props to BookPreview (or have BookPreview pull from BasketContext directly).
- Since cover photos aren't selected yet at the approve step, show a placeholder cover page using the logo and current add-on text.

### UI Layout

```text
+------------------------------------------+
|          [<]  Page 3 of 12  [>]           |
|                                           |
|  +------------------------------------+  |
|  |                                    |  |
|  |        (Large page view)           |  |
|  |     Shows converted line art       |  |
|  |     or cover on page 1             |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                           |
|  [Cover] [1] [2] [3] [4] [5] [6] ...     |
|  ^filmstrip - drag to reorder^            |
+------------------------------------------+
```

### No database changes needed
All data is already available from existing state and BasketContext.
