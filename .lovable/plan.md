
Goal: remove the endless loading state on affiliate signup and ensure successful submissions create an active Shopify discount + redirect to the affiliate dashboard.

1) Diagnosis confirmed from runtime
- The form button stays in loading state for 20+ seconds.
- During that period, no XHR/fetch request is sent from the page and no new `affiliate-signup` function logs appear.
- This means the frontend is hanging before the network call (most likely on `supabase.auth.getSession()` inside submit).
- Separate backend check shows `affiliate-signup` is deployed and reachable, but Shopify returns: `Invalid API key or access token`.

2) Frontend fixes (primary loop fix)
- Refactor `handleAffiliateSignup` in `src/pages/BecomeAffiliate.tsx` to avoid blocking on `getSession()`:
  - Use `supabase.functions.invoke("affiliate-signup", { body })` instead of manual `fetch + getSession`.
  - Add a hard timeout wrapper (`Promise.race`, e.g. 15s) around the entire invoke call.
  - Keep a submit watchdog fallback (e.g. 20s) that always clears `submitting` even if a promise stalls.
- Improve failure UX:
  - Show specific toast for timeout (“Request timed out, please retry”).
  - Show backend error text when available.
  - If response indicates user already has affiliate account, redirect to `/affiliates` immediately.
- Apply the same submit hardening in `src/pages/Affiliates.tsx` (it has the same signup logic and same hang risk).

3) Backend function hardening (`supabase/functions/affiliate-signup/index.ts`)
- Add timeout + abort protection for each Shopify API call (price rule and discount code creation), so function never hangs indefinitely.
- Return clearer errors for:
  - invalid Shopify token/scope
  - duplicate discount code
  - upstream timeout
- Keep behavior strict: only create affiliate row after Shopify discount is successfully created/active.
- Keep existing redirect expectation unchanged: frontend navigates to `/affiliates` on success.

4) Shopify activation issue (required for “code created and active”)
- Current function logs confirm the configured Shopify admin token is invalid.
- Rotate/update `SHOPIFY_ACCESS_TOKEN` to a valid Admin API token with discount/price rule write scope.
- After token update, run one live signup verification to confirm:
  - affiliate row inserted
  - `shopify_price_rule_id` populated
  - dashboard redirect works
  - created discount is active in Shopify

5) Validation checklist
- `/become-an-affiliate`: click “Join Affiliate Program” should never spin forever.
- Failed request path: spinner stops, clear toast shown.
- Success path: redirect to `/affiliates`.
- Backend logs show successful price rule + discount code creation.
- Database `affiliates` table contains the new affiliate with uppercase discount code and Shopify price rule id.

Technical details
- Files to update:
  - `src/pages/BecomeAffiliate.tsx`
  - `src/pages/Affiliates.tsx`
  - `supabase/functions/affiliate-signup/index.ts`
- No database schema or RLS migration required for this fix.
