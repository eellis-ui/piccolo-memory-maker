

## Remove Login Requirement from Purchase Flow

Currently, the Builder page redirects unauthenticated users to `/auth`. Since Shopify handles payment and identity, we can remove this requirement entirely by switching to a **guest session** model.

### How it works today
- Builder checks for a logged-in user on load; redirects to `/auth` if not found
- Orders are created with `user_id` tied to the authenticated user
- RLS policies restrict all order/photo access to `auth.uid() = user_id`
- Storage uploads require authentication

### Proposed approach: Guest sessions via Edge Function

Instead of requiring login, use a **random session ID** (stored in localStorage) to identify the guest. An edge function handles all database writes using the service role, bypassing RLS for guest users.

### Changes

**1. New edge function: `guest-order`**
- Accepts a `sessionId` (from localStorage) and performs order/photo operations on behalf of the guest
- Uses the Supabase service role key to bypass RLS
- Endpoints:
  - `POST /create` -- create a draft order with `builder_session_id` but no `user_id`
  - `POST /upload` -- upload a photo to storage and insert into `order_photos`
  - `POST /delete-photo` -- remove a photo
  - `GET /session/:sessionId` -- retrieve orders + photos for a session

**2. Update `Builder.tsx`**
- Remove the auth check and `/auth` redirect (lines 83-87)
- Remove `userId` state entirely
- Generate a guest `sessionId` in localStorage on first visit
- Replace direct Supabase client calls with fetch calls to the `guest-order` edge function

**3. Update `UploadStep.tsx`**
- Replace direct `supabase.storage.from("order-files").upload(...)` calls with the edge function upload endpoint
- The edge function handles storage writes using the service role

**4. Update RLS policies**
- Add a policy on `orders` allowing SELECT for rows matching a `builder_session_id` (for the edge function's service role, this is already bypassed, but we keep it clean)
- No changes needed for authenticated users -- their existing policies remain intact

**5. Keep auth optional for "My Orders" page**
- Auth remains available for users who want to track orders post-purchase
- The Shopify webhook (order/paid) can link orders to an email address for later retrieval
- The `/auth` page and login flow stay in place but are never forced during the purchase flow

**6. Update Navbar**
- Remove any "Sign in to start" messaging
- Keep the auth link available but non-blocking

### What stays the same
- Shopify handles all payment processing (no change)
- Conversion happens after payment via webhook (no change)
- Admin panel and admin RLS policies (no change)
- Authenticated users who do log in still get the full experience with order history

### Security considerations
- The edge function validates that the `sessionId` is a valid UUID format
- Guest orders have no `user_id`, so they can't be accessed via the authenticated RLS policies
- The edge function only allows operations on draft orders matching the provided session ID
- Storage paths include the session ID for isolation (e.g., `guest/{sessionId}/photo.jpg`)

