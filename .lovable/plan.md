

## Fix: Affiliate Signup Button Stuck + Function Not Deployed

### Problem
1. **The `affiliate-signup` edge function is not registered in `supabase/config.toml`**, so it was never deployed. When the form calls it, the request hangs indefinitely with no response.
2. The auth form doesn't handle "user already exists" gracefully — it should suggest signing in instead.

### Changes

**1. Register `affiliate-signup` in `supabase/config.toml`**
Add the function entry so it gets deployed. It needs `verify_jwt = false` since the function handles auth internally via the Authorization header.

**2. Deploy the edge function**
Use the deploy tool to push `affiliate-signup` to production.

**3. Improve error handling in `src/pages/BecomeAffiliate.tsx`**
- In the auth form handler, detect "user already exists" errors and auto-switch to the login view with a helpful toast ("Account already exists — please sign in").
- Add a fetch timeout (e.g. 15s) on the affiliate-signup call so the button can't spin forever if the function is unreachable.

### Result
- The "Join Affiliate Program" button will actually call the deployed function, create the Shopify discount code, insert the affiliate record, and redirect to `/affiliates`.
- Users who already have accounts get a clear message to sign in instead.

