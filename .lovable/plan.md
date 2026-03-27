

## Plan: Ensure Cover Text Remains Visible in Preview and Downloads

### Problem
The bottom text on the cover ("FOR KIDS AND ADULTS ALIKE" and "color your memories") is being clipped in the BookPreview component and is entirely absent from the PDF download, which only renders a single photo as the front cover.

### Changes

**1. Fix BookPreview CoverPage text clipping** (`src/components/builder/BookPreview.tsx`)
- The bottom text section uses `flex-1` which can collapse to zero when the grid takes most of the space in the constrained preview container.
- Change the bottom text container from `flex-1` to a fixed proportional height using `containerType: inline-size` and `cqi` units (matching the CoverStep pattern), or use explicit min-height to guarantee the text area always renders.
- Use the same `cqi`-based font sizing as CoverStep for consistency (`3.9cqi` for subtitle, `4.7cqi` for title) by adding `containerType: "inline-size"` to the parent.

**2. Fix RecapStep mini cover text** (`src/components/builder/RecapStep.tsx`)
- Apply the same fix to ensure the smaller mini-cover previews also show the text. These already render text but may also clip at small sizes — will add `containerType: "inline-size"` and proportional sizing.

**3. Fix PDF generation to include cover text** (`supabase/functions/generate-pdf/index.ts`)
- Currently the front cover page just renders a single photo. Update it to render a proper cover layout:
  - White/cream background
  - "piccoload" text at top
  - 2×2 photo grid (original + converted for both cover photos)
  - Subtitle and title text at bottom
- This requires fetching both cover photos (not just one `cover_image_id`), reading the cover subtitle/title from the order, and compositing the layout using jsPDF positioning.
- Will need to store/read `cover_image_ids` (both IDs) and `cover_subtitle`/`cover_title` from the orders table. Check if these fields exist.

### Technical Details

- **BookPreview.tsx lines 104-166**: Wrap in `containerType: "inline-size"` and switch font sizes to `cqi` units
- **RecapStep.tsx lines 83-143**: Same container query approach
- **generate-pdf Edge Function**: Restructure front cover rendering to composite logo + grid + text using jsPDF drawing primitives
- May need a database migration to store both cover image IDs and cover text fields if not already present

