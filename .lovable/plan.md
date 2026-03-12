
## Root Cause Found

The bug is in `src/pages/Auth.tsx` line 27-31:

```tsx
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" && session) {  // ← Only handles SIGNED_IN
    navigate(from, { replace: true });
  }
});
```

When `onAuthStateChange` subscribes, it **always** fires synchronously with `INITIAL_SESSION`. If the user already has a valid session (they just signed in), `INITIAL_SESSION` fires with that session — but the code ignores it because it only checks for `"SIGNED_IN"`.

**What happens in practice:**
1. User is on `/my-orders` — `INITIAL_SESSION` fires. But if the session token is mid-refresh, it briefly returns `null` → redirects to `/auth`
2. `/auth` loads, `onAuthStateChange` subscribes, `INITIAL_SESSION` fires with the now-refreshed valid session
3. But the handler **ignores** `INITIAL_SESSION` — only handles `SIGNED_IN`
4. The spinner clears and the user sees the sign-in form even though they're logged in
5. User re-enters credentials, `SIGNED_IN` fires, they get redirected to `/my-orders`
6. Loop can repeat on next token refresh

Additionally, after a successful `signInWithPassword`, Supabase can fire **both** `INITIAL_SESSION` and `SIGNED_IN`. The `SIGNED_IN` fires, redirect works. But on the next page load the same refresh-loop can recur.

## The Fix — Two Changes

### 1. `src/pages/Auth.tsx` — Handle `INITIAL_SESSION` too

Change the `onAuthStateChange` handler to also redirect when `INITIAL_SESSION` fires with an active session (user is already logged in):

```tsx
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
      navigate(from, { replace: true });
    }
    // Always clear the checking spinner once auth state is known
    setCheckingSession(false);
  });

  return () => subscription.unsubscribe();
}, []);
```

This means:
- If already logged in → `INITIAL_SESSION` fires with session → redirect immediately (no form flash)
- If NOT logged in → `INITIAL_SESSION` fires with `null` → spinner clears, form shows
- After form submit + sign in → `SIGNED_IN` fires → redirect

### 2. `src/pages/MyOrders.tsx` — Handle the case where `INITIAL_SESSION` fires null then `TOKEN_REFRESHED` fires

Add `TOKEN_REFRESHED` as a valid event to load orders (in case the token was refreshing when the component mounted):

```tsx
if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
  if (session) {
    setAuthed(true);
    fetchOrders().finally(() => { if (mounted) setLoading(false); });
  } else if (event === "INITIAL_SESSION") {
    // Only redirect to auth on INITIAL_SESSION with no session
    // TOKEN_REFRESHED with no session shouldn't redirect mid-page
    navigate("/auth");
  }
}
```

Also add a safety net: if `INITIAL_SESSION` never fires (edge case), set a timeout to clear the loading state.

## Files to Change

- `src/pages/Auth.tsx` — Add `INITIAL_SESSION` to the auth state handler; move `setCheckingSession(false)` inside the callback so it fires after auth state is known
- `src/pages/MyOrders.tsx` — Add `TOKEN_REFRESHED` event handling; add a loading timeout safety net
