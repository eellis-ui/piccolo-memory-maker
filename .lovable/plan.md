
## Root Cause — Identified

The spinner never goes away in certain states. Here's exactly why:

In `MyOrders.tsx`:
```tsx
const [ordersLoading, setOrdersLoading] = useState(true); // starts TRUE

useEffect(() => {
  if (!user) return;  // ← exits without setting ordersLoading = false
  ...
}, [user]);

if (loading || ordersLoading) { return <Spinner /> }  // ← stuck forever
```

**The sequence that breaks it:**

1. Component mounts. `loading = true`, `ordersLoading = true` → spinner shows
2. `INITIAL_SESSION` fires. `loading = false`, `user = null` (not logged in)
3. The redirect `useEffect` fires → `navigate("/auth")`
4. BUT the spinner `if (loading || ordersLoading)` renders BEFORE the redirect `useEffect` runs
5. React renders the spinner first, then the effect runs and navigates away

This causes a flash of spinner, and in some timing scenarios the navigate doesn't fire cleanly.

**For logged-in users:** When `user` is finally set after auth loads, `ordersLoading` is still `true` (set in initial state). The fetch `useEffect` fires, but there's a moment where `loading = false`, `user = set`, but `ordersLoading = true` — rendering spinner correctly. This should work... unless `user` is set synchronously from context while `ordersLoading` is already `false`.

Actually the **real** issue found in the session replay: the user was logged in, a spinner appeared, then they navigated home. This means the spinner showed but orders never loaded. The `ordersLoading` fetch query might have failed silently, or the `user` check in the effect ran with `user = null` on first render (before auth resolved), returned early, and `ordersLoading` stayed `true`. Then when `user` resolved, the effect ran again and fetched — but wait, it should work...

**The definitive fix:** Initialize `ordersLoading` to `false` and only set it to `true` when a fetch actually starts. Also guard the spinner so it only shows while auth is loading OR while fetch is actively running for an authenticated user.

The current guard `if (loading || ordersLoading)` means:
- `ordersLoading = true` (initial) + `loading = false` + `user = null` = spinner instead of redirect

**Fix:** Change initial state to `false`, set to `true` only when fetch begins:

```tsx
const [ordersLoading, setOrdersLoading] = useState(false); // ← false by default

useEffect(() => {
  if (!user) return;
  setOrdersLoading(true);  // only set true when we're actually fetching
  supabase.from("orders")...then(() => setOrdersLoading(false));
}, [user]);
```

This way when `user = null`, `ordersLoading = false`, and the auth redirect effect fires correctly without spinner interference.

## Files to Change

Only **one file** needs changing: `src/pages/MyOrders.tsx`

Change `ordersLoading` initial state from `true` to `false`.

That's it. The rest of the auth architecture is correct.
