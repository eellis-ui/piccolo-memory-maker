

## Admin Dashboard — Already Exists, Needs Enhancements

The admin dashboard at `/admin` already exists with core functionality (order list, edit, delete, PDF download, photo viewer, affiliate payouts). However, it's missing several important order details. Here's what I'll improve:

### Changes to `src/pages/Admin.tsx`

**1. Show more order details in the table**
- Add **Customer Email** column
- Add **Shopify Order** column (order_name like #1042)
- Add **Line Items** summary (e.g. "1x Colouring Book, 1x Digital Download")
- Add **Digital Download** and **Unique Photos** badges

**2. Update the `OrderRow` interface** to include the missing fields:
- `customer_email`, `shopify_order_number`, `order_name`, `line_items`, `digital_download`, `production_pdf_path`

**3. Add Production PDF download button**
- For orders that have a `production_pdf_path`, show a direct download button to fetch the pre-generated PDF from storage
- Keep the existing on-demand PDF generation button as a fallback

**4. Add order detail expansion or detail view**
- Clicking an order row opens a detail panel/dialog showing all fields: customer email, line items breakdown, all status info, dates, tracking, and links to download each book's PDF

### No database changes needed
All the data already exists in the `orders` table — just needs to be displayed.

### File Changes
| File | Change |
|------|--------|
| `src/pages/Admin.tsx` | Expand OrderRow interface, add customer/order columns, production PDF download, detail view |

