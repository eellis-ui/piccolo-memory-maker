
## Root Cause

The infinite loop happens because:
1. `MyOrders` calls `supabase.auth.getSession()` — this can return `null` during a token refresh (which was happening for Tom per network logs)
2. So `MyOrders` redirects to `/auth`
3. `Auth` calls `getSession()` — by now the refresh completes, session exists → redirects back to `/my-orders`
4. Loop repeats

The correct pattern is: **set up `onAuthStateChange` FIRST, then call `getSession()`**, and use the auth state change event to handle the resolved state — not just a one-shot `getSession()`.

Also: there's no Sign Out button anywhere, which is a separate problem.

## Plan

### 1. Fix `MyOrders` auth check
Replace the `getSession()` redirect pattern with a proper `onAuthStateChange` listener. The page will:
- Subscribe to auth state changes first
- Only redirect to `/auth` after auth has fully resolved to "no session"
- Show spinner while checking

```text
onAuthStateChange fires with INITIAL_SESSION event
  └─ session exists → show orders
  └─ session null   → navigate to /auth
```

### 2. Fix `Auth` page redirect loop prevention
The `Auth` page should NOT redirect if the user is navigating TO it intentionally. Only auto-redirect if the user already has a valid session AND did not arrive via a manual navigation. Use the `replace` option correctly and don't redirect if `location.state?.from` is undefined (meaning they typed the URL / came from nav link).

Actually simpler: just check if a session exists synchronously from `getSession` and redirect — but add a short debounce/flag to prevent the loop. The cleanest fix is: **Auth page should only auto-redirect if session exists on mount, not on every re-render.**

### 3. Add Sign Out to Navbar
When `isLoggedIn` is true, show a "Sign Out" button/link next to "My Orders" that calls `supabase.auth.signOut()` and navigates to `/`.

## Files to Change

- `src/pages/MyOrders.tsx` — Replace `getSession()` redirect with `onAuthStateChange` pattern
- `src/pages/Auth.tsx` — Remove the auto-redirect that causes the loop (only redirect on explicit sign-in, not on every mount when already logged in)  
- `src/components/layout/Navbar.tsx` — Add Sign Out button for logged-in users

## Exact Implementation

### MyOrders.tsx
Replace the `useEffect` init logic:
```tsx
useEffect(() => {
  let mounted = true;
  
  // Listen FIRST, then check session
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (!mounted) return;
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
      if (session) {
        setAuthed(true);
        fetchOrders().finally(() => { if (mounted) setLoading(false); });
      } else {
        navigate('/auth');
      }
    } else if (event === 'SIGNED_OUT') {
      navigate('/auth');
    }
  });
  
  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);
```

### Auth.tsx
Remove the `getSession()` auto-redirect on mount entirely. Users who are already logged in clicking "Sign In" in the navbar should just see the sign-in form — they can sign out first. The redirect after form submission via `onAuthStateChange` `SIGNED_IN` event is sufficient.

OR: keep the auto-redirect but add a guard to only do it once using a ref flag, preventing re-entrancy.

Actually the cleanest solution: keep `getSession()` redirect but only navigate if we're NOT already on a redirect loop. We can detect this by checking if `location.state?.from` equals the current path — if so, clear it and don't redirect.

The simplest correct fix: in `Auth.tsx`, only auto-redirect on mount if there's a session AND `location.key !== 'default'` (i.e., user navigated here programmatically, not directly). But this is fragile.

**Best approach**: Remove the `getSession()` auto-redirect from `Auth.tsx` completely. If a logged-in user clicks "Sign In" in the nav, they'll just see the form. The `onAuthStateChange` `SIGNED_IN` will handle redirect after form submit. This breaks the loop entirely.

### Navbar.tsx
Add after the "My Orders" link:
```tsx
{isLoggedIn && (
  <button
    onClick={async () => {
      await supabase.auth.signOut();
      navigate('/');
    }}
    className="text-sm font-medium text-foreground hover:text-foreground/70 transition-colors"
  >
    Sign Out
  </button>
)}
```
Same for mobile nav.
