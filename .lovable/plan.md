

## Plan: Fix Order Details, Production PDF, and Customer PDF

### Problems
1. **Order cards show "Untitled Book"** — Shopify order name and line items aren't stored or displayed
2. **`generate-customer-pdf` hits CPU Time exceeded** — jsPDF with cover composition + multiple image downloads is too heavy for edge functions
3. **No distinction between production PDF (admin) and customer PDF** — admin needs a PDF for every paid order; customer only sees PDF if they bought the digital upsell

### Solution

#### 1. Database Migration
Add three columns to `orders`:
- `order_name` (text) — stores Shopify order name (e.g. "#1042")
- `line_items` (jsonb, default `'[]'`) — stores Shopify line items for display
- `production_pdf_path` (text) — path to the production PDF for admin use

#### 2. Webhook Update (`shopify-order-webhook/index.ts`)
Store `order_name` and `line_items` from the Shopify payload when updating order status to "paid":
```typescript
updates.order_name = payload.name || null;
updates.line_items = payload.line_items || [];
```

#### 3. Fix `generate-customer-pdf` — Dual-Purpose + CPU Fix
Rename the function's role to handle BOTH production and customer PDFs:
- **Remove** the `digital_download` gate — generate for ALL paid orders
- **Store** the PDF as `production_pdf_path` on every order
- **Additionally** set `digital_pdf_path` and send email ONLY if `digital_download` is true
- **Fix CPU timeout**: Skip the heavy cover composition (4 image downloads + grid layout). Use a simple title-only cover page instead. The full branded cover is already available via the admin's on-demand `generate-pdf` function.
- This keeps the function well within CPU budget (just sequential line art pages)

#### 4. Admin UI (`Admin.tsx`)
- Update `OrderRow` interface to include `order_name`, `line_items`, `production_pdf_path`, `digital_download`
- Show `order_name` in the Title column (fallback to `title_page_text`)
- Show line items summary in the Details column
- Add a dedicated "Download Production PDF" button that uses `production_pdf_path` signed URL when available, falls back to the existing on-demand `generate-pdf` function
- Auto-trigger production PDF generation for orders missing `production_pdf_path`

#### 5. MyOrders Auto-Trigger Update (`MyOrders.tsx`)
- Trigger `generate-customer-pdf` for ALL paid orders missing `production_pdf_path` (not just digital ones)
- Keep customer-facing download button visible ONLY for `digital_download` orders
- Update `OrderRow` interface to include `order_name` and `line_items`
- Display `order_name` instead of `title_page_text` for paid orders
- Show line items summary on paid order cards

### File Changes
| File | Change |
|------|--------|
| Migration SQL | Add `order_name`, `line_items`, `production_pdf_path` columns |
| `supabase/functions/shopify-order-webhook/index.ts` | Store order_name + line_items |
| `supabase/functions/generate-customer-pdf/index.ts` | Remove digital-only gate, store production_pdf_path, simplify cover to fix CPU |
| `src/pages/Admin.tsx` | Show order name, items, production PDF download |
| `src/pages/MyOrders.tsx` | Show order name/items, trigger for all paid orders, gate download on digital_download |

