

## Plan: Delete Original Photos After Order Payment

### Problem
When an order is paid, the customer's original uploaded photos remain in storage. Per the privacy policy and user request, only the converted line-art should be kept; originals must be deleted.

### Changes

**1. Update `shopify-order-webhook` Edge Function** (`supabase/functions/shopify-order-webhook/index.ts`)

After updating each order's payment status (around line 292), add a cleanup step:

- Query all `order_photos` for the order where `original_path` is not null
- Delete each original file from the `order-files` storage bucket using `admin.storage.from("order-files").remove([...paths])`
- Update each `order_photos` row to set `original_path` to a sentinel value like `'deleted'` (or null if the column allows it — currently it's `NOT NULL`, so use `'deleted'`)
- This ensures the "Order Files" dialog only shows "Line Art" buttons for completed orders (originals will 404 / be hidden)

**2. Update MyOrders page** (`src/pages/MyOrders.tsx`)

- Hide the "Original" download button when `original_path` is `'deleted'` or missing, so users only see the "Line Art" button for paid orders

### Technical Details

- Storage deletion: `admin.storage.from("order-files").remove(originalPaths)` — batch delete all originals for each order
- DB update: `UPDATE order_photos SET original_path = 'deleted' WHERE order_id = ? AND original_path != 'deleted'`
- No migration needed — `original_path` is `text NOT NULL`, so `'deleted'` is a valid value
- The cleanup runs after PDF generation so the PDF can still use converted paths (it already prefers `converted_path`)

