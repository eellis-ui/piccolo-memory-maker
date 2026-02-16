

# Piccolo'd: Line Art Conversion + Book Structure Implementation

## Overview

Set up the full backend infrastructure for converting uploaded photos into print-quality colouring book line art, plus enforce the product rules for book structure (max 20 pages, optional title/dedication pages, cover).

---

## Part 1: Database Setup

Create tables to track orders, uploaded photos, and conversion results:

- **orders** -- tracks each book order session (status, page count, cover settings, title/dedication text)
- **order_photos** -- each uploaded photo linked to an order (original file path, converted file path, page position, approval status)
- **Storage bucket** -- `order-files` for storing original uploads and converted line art

RLS policies will be open for now (no auth yet) but structured for future user-scoping.

---

## Part 2: File Upload Integration

Update the `UploadStep` component to:

- Upload photos to the `order-files` storage bucket under `originals/{orderId}/`
- Create records in `order_photos` table
- Enforce the 20-photo maximum per book
- Show real upload progress

---

## Part 3: Line Art Conversion Edge Function

Create a `convert-to-lineart` backend function that:

- Accepts an image URL from storage
- Calls the Replicate API with the ControlNet Lineart model
- Uses the exact prompt: *"clean black-and-white colouring book line drawing, simple bold outlines, no shading, white background"*
- Negative prompt: *"shadows, grey tones, textures, colour, background noise, realism, pencil texture, sketch, greyscale, shading"*
- Returns the converted outline URL
- Stores the result back in storage at `converted/{orderId}/`

**Important**: This function requires a `REPLICATE_API_TOKEN` secret. You will be prompted to add this key before the function can work.

For the current build phase (pre-payment), conversion will be triggered from the Approve step so you can preview results. In production, this shifts to post-payment only.

---

## Part 4: Book Structure Rules

Update the builder flow to enforce:

- 1 book = max 20 photos (already enforced in UI)
- 1 photo = 1 full page
- Optional title page with editable text (default: "My Piccolo'd Colouring Book")
- Optional dedication page with editable text
- Cover page uses the existing fixed-frame designer
- Page ordering: Cover, Title (optional), Dedication (optional), then up to 20 line-art pages

Add a small "Book Options" panel before or within the Approve step for toggling title/dedication pages and entering custom text.

---

## Part 5: Conversion Quality Requirements

The edge function and any future PDF generation must enforce:

- Pure black outlines on pure white background
- No shading, greyscale, colour, sketch texture, or shadows
- Consistent clean line weight
- 300 DPI minimum resolution
- Output suitable for children or adults to colour in

---

## Technical Details

### Database Migration

```text
Tables:
  orders
    - id (uuid, PK)
    - created_at (timestamptz)
    - status (text: draft, pending_payment, paid, converting, ready, shipped)
    - title_page_enabled (boolean, default true)
    - title_page_text (text, default 'My Piccolo''d Colouring Book')
    - dedication_page_enabled (boolean, default false)
    - dedication_page_text (text)
    - cover_image_id (uuid, nullable)
    - cover_zoom (numeric, default 1)
    - cover_position_x (numeric, default 0)
    - cover_position_y (numeric, default 0)
    - extra_pages (integer, default 0)
    - unique_photos (boolean, default false)

  order_photos
    - id (uuid, PK)
    - order_id (uuid, FK -> orders)
    - created_at (timestamptz)
    - original_path (text)
    - converted_path (text, nullable)
    - page_position (integer)
    - is_approved (boolean, default false)
    - conversion_status (text: pending, converting, completed, failed)

Storage:
  order-files (public bucket for serving previews)
```

### Edge Function: convert-to-lineart

- Path: `supabase/functions/convert-to-lineart/index.ts`
- Method: POST
- Body: `{ "photoId": "uuid" }`
- Reads original from storage, sends to Replicate, saves result, updates `order_photos.converted_path`

### Frontend Changes

- `UploadStep`: Upload to storage, create DB records, pass order context
- `ApproveStep`: Fetch converted images from DB/storage, show before/after
- `Builder.tsx`: Add order state management, book options (title/dedication toggles)
- New `BookOptionsPanel` component for title/dedication page settings

### Sequence

```text
1. Create database tables + storage bucket (migration)
2. Request REPLICATE_API_TOKEN secret
3. Create convert-to-lineart edge function
4. Update UploadStep to use storage + DB
5. Add BookOptionsPanel component
6. Update ApproveStep to show real conversions
7. Update Builder.tsx to manage order state + book structure
```

