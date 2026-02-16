
# Piccolo'd: Line Art Conversion + Book Structure Implementation

## Status: ✅ Implemented

### Completed
1. ✅ Database tables: `orders` + `order_photos` with RLS (open for now, no auth yet)
2. ✅ Storage bucket: `order-files` (public, with full CRUD policies)
3. ✅ `REPLICATE_API_TOKEN` secret added
4. ✅ `convert-to-lineart` edge function deployed (Replicate ControlNet Lineart)
5. ✅ `UploadStep` updated: uploads to storage, creates DB records, enforces 20-photo max
6. ✅ `BookOptionsPanel` component: title/dedication page toggles with text editing
7. ✅ `ApproveStep` updated: real AI conversion, per-photo convert/approve, Convert All
8. ✅ `Builder.tsx` updated: order state management, book options, DB persistence

### Pending (Future)
- Payment-gated conversion (move conversion to post-Shopify-payment webhook)
- Shopify integration (checkout, webhooks, order sync)
- PDF generation (300 DPI print-ready output)
- Admin dashboard
- User authentication + scoped RLS policies
