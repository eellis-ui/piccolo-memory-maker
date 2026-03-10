

## Plan: Review Request Email (30 Days Post-Purchase)

### Overview
Create an edge function that finds orders paid 30+ days ago that haven't had a review request sent, then emails the customer a branded review request. A cron job triggers this daily.

### Changes

**1. Create edge function `supabase/functions/send-review-requests/index.ts`**
- Query `orders` table for rows where `payment_status = 'paid'`, `review_request_sent = false`, `customer_email IS NOT NULL`, and `created_at <= now() - 30 days`
- For each matching order, send a branded email using the Lovable transactional email API (`LOVABLE_API_KEY` already exists)
- The email HTML template will be defined inline in the function — this is the file you edit to control the look and content
- Mark `review_request_sent = true` after sending
- Use service role client to bypass RLS

**2. Register in `supabase/config.toml`**
- Add `[functions.send-review-requests]` with `verify_jwt = false`

**3. Set up daily cron job**
- Enable `pg_cron` and `pg_net` extensions
- Schedule a daily cron job (e.g. 10:00 UTC) that calls the edge function

### Where to find & edit the template
The email template lives directly in `supabase/functions/send-review-requests/index.ts` as an HTML string. You can edit the subject line, body copy, button text, colors, and layout there. After editing, it deploys automatically.

### Technical notes
- The `review_request_sent` column already exists on the `orders` table
- `LOVABLE_API_KEY` secret is already configured
- The cron job will run daily and process any orders that crossed the 30-day threshold

