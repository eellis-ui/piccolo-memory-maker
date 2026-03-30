

## Plan: Fix PDF Generation Timeout — Decouple from Webhook

### Problem
The `shopify-order-webhook` edge function is hitting **CPU Time exceeded** errors because inline PDF generation (downloading multiple images, encoding base64, compositing with jsPDF) is too heavy for the webhook's CPU budget. The webhook times out, so:
- Customer never gets their PDF
- Original photos may not get cleaned up
- The "PDF Generating…" spinner in My Orders spins forever

### Solution: Decouple PDF generation from the webhook

**1. Strip PDF generation and photo cleanup from `shopify-order-webhook/index.ts`**
- Remove the `generateAndUploadPdf` function and all PDF-related logic (~lines 52–229)
- Remove the `downloadAsBase64` helper and jsPDF import
- Remove the photo deletion block
- The webhook becomes lightweight: just update order status to "paid", set flags, handle affiliates

**2. Create new edge function `generate-customer-pdf/index.ts`**
- Accepts `{ orderId }` — no user auth required (uses service role key internally)
- Validates the order exists and has `digital_download = true`
- Checks if `digital_pdf_path` is already set (idempotent — skip if PDF exists)
- Generates the full branded PDF (same logic as admin `generate-pdf`: cover grid, back cover, title/dedication pages, line art pages)
- Uploads to storage, updates `digital_pdf_path` on the order
- Sends the download email to `customer_email`
- Deletes original photos after successful generation
- Returns `{ pdfPath }` on success

**3. Update `MyOrders.tsx` — auto-trigger PDF generation**
- When the page detects a paid order with `digital_download = true` and `digital_pdf_path = null`, automatically call the `generate-customer-pdf` function
- On success, refresh the order list so the "Download PDF" button appears instantly
- Add a guard to prevent duplicate calls (track in-flight requests by order ID)

**4. Admin PDF remains unchanged**
- The existing `generate-pdf` edge function continues to work independently for admin downloads
- Admins can generate/download PDFs instantly from the admin dashboard as before

### Technical Details

- The webhook drops from ~200+ lines of PDF logic to just status updates — well within CPU limits
- The new function gets its own CPU budget, solving the timeout
- Idempotent check (`digital_pdf_path` already set?) prevents duplicate generation
- Customer sees PDF available within seconds of landing on My Orders, not 5–10 minutes
- Photo cleanup moves into the new function, happening right after PDF generation succeeds

### File Changes
| File | Action |
|------|--------|
| `supabase/functions/shopify-order-webhook/index.ts` | Remove PDF gen, photo cleanup, jsPDF import |
| `supabase/functions/generate-customer-pdf/index.ts` | **New** — PDF gen + email + cleanup |
| `src/pages/MyOrders.tsx` | Add auto-trigger for PDF generation |

