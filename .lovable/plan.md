

## Plan: Fix Digital Download PDF to Include Full Book Layout

### Problem
The digital download PDF generated for customers (in the webhook) uses a simplified layout — just a single cover image and basic line art pages. It should match the full branded book layout (cover with logo, 2×2 grid, text, back cover, title/dedication pages, then line art in order). Additionally, there's a bug: original photos are deleted *before* the PDF is generated, so the cover grid images (which reference `original_path`) will fail.

### Changes

**1. Fix execution order in `shopify-order-webhook/index.ts`**
- Move the "delete original photos" block to *after* the PDF generation block. Currently originals are deleted at lines 294–315, then PDF is generated at line 320. The cover grid needs `original_path` data, so deletion must happen last.

**2. Update `generateAndUploadPdf` in `shopify-order-webhook/index.ts`**
- Replace the simple cover rendering (lines 86–98) with the full branded composite layout matching the admin `generate-pdf` function:
  - Cream background, "piccoload" logo, 2×2 photo grid (original + converted for both cover photos), subtitle/title text
  - Back cover page with branding
  - Title and dedication pages
  - Line art pages in `page_position` order, skipping cover images
- Fetch `cover_image_id_2` alongside existing fields in the order query (line 56)

**3. No UI changes needed**
- `MyOrders.tsx` already shows the "Download PDF" button when `digital_pdf_path` is set, and prompts account creation in the email. The digital download flow and account-gating are already in place.

### Technical Details

- The webhook's inline `generateAndUploadPdf` function will be updated to mirror the admin `generate-pdf` logic (cover composite, back cover, text pages, photo pages)
- Order query updated: `select("title_page_text, title_page_enabled, dedication_page_text, dedication_page_enabled, cover_image_id, cover_image_id_2")`
- Execution order: update payment status → generate PDF → send email → delete originals

