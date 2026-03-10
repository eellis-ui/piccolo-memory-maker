

## Plan: Email Digital PDF to Customer After Shopify Payment

### Problem
When a customer selects the Digital Download add-on and pays via Shopify, they need to receive the generated PDF via email. Currently there's no mechanism to:
1. Capture the customer's email from Shopify checkout
2. Detect payment completion
3. Generate and email the PDF automatically

### Architecture

```text
Customer pays on Shopify
        │
        ▼
Shopify "orders/paid" webhook
        │
        ▼
New Edge Function: "shopify-order-webhook"
  1. Verify webhook signature (SHOPIFY_WEBHOOK_SECRET)
  2. Extract customer email + line items from payload
  3. Check if Digital Download variant is in the order
  4. Match order to internal session via cart line attributes
  5. Update order status to "paid" in DB
  6. If digital download purchased:
     a. Trigger PDF generation (reuse generate-pdf logic)
     b. Email PDF to customer
```

### Implementation Steps

1. **Add `customer_email` and `digital_download` columns to `orders` table**
   - `customer_email text` — stores the email from Shopify checkout
   - `digital_download boolean default false` — whether customer purchased the add-on

2. **Create `shopify-order-webhook` Edge Function**
   - Receives Shopify `orders/paid` webhook POST
   - Verifies HMAC signature using `SHOPIFY_WEBHOOK_SECRET`
   - Extracts customer email, line items, and cart attributes
   - Identifies the internal order via `builder_session_id` sent as a cart line attribute
   - Updates `orders` row: `payment_status = 'paid'`, `customer_email`, `digital_download`
   - If digital download is present: generates PDF and emails it

3. **Add cart line attribute for session tracking**
   - In `CheckoutStep.tsx` and `Navbar.tsx` checkout flows, attach `builder_session_id` as a cart attribute so the webhook can link back to the internal order

4. **PDF generation + email sending**
   - Reuse the existing `generate-pdf` logic (extract into shared code within the webhook)
   - Use the transactional email approach (Lovable's `send-transactional-email` pattern) to email the PDF as an attachment or a signed download link

5. **Register the webhook with Shopify**
   - Use the Shopify Admin API (via `SHOPIFY_ACCESS_TOKEN`) to register `orders/paid` webhook pointing to the edge function URL

6. **Update `supabase/config.toml`**
   - Add `[functions.shopify-order-webhook]` with `verify_jwt = false` (webhook calls come from Shopify, not authenticated users)

### Key Decisions Needed

Before implementing, I need to clarify:

- **Email delivery method**: Should we use Lovable's transactional email system (requires custom email domain setup) or a third-party service? Lovable's built-in approach would need a verified sender domain.
- **PDF delivery**: Should the PDF be attached directly to the email, or should we send a secure download link (signed URL with expiry)?

### Files to Create/Modify
- **Create**: `supabase/functions/shopify-order-webhook/index.ts`
- **Modify**: `supabase/config.toml` — add function config
- **Modify**: `src/components/builder/CheckoutStep.tsx` — add session ID as cart attribute
- **Modify**: `src/components/layout/Navbar.tsx` — add session ID as cart attribute  
- **Migration**: Add `customer_email` and `digital_download` columns to `orders` table

