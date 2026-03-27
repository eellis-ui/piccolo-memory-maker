

## Plan: Fix Auth State Reliability

### Problem
Two related bugs:
1. **False "signed in" state**: A stale/expired session token in localStorage causes `user` to appear truthy, showing "Sign Out" instead of "Sign In" — but the session is actually dead.
2. **Pages get stuck loading**: If the `INITIAL_SESSION` event from Supabase never fires (or is delayed), `loading` stays `true` forever, causing the Auth page and My Orders page to show infinite spinners.

### Root Cause
`AuthContext` relies solely on the `INITIAL_SESSION` event to clear `loading`. There's no fallback. And when Supabase restores an expired session from localStorage, it briefly sets `user` before eventually clearing it — but if the token refresh fails silently, the stale user persists.

### Fix — Single file: `src/contexts/AuthContext.tsx`

1. **Add a safety timeout** (3 seconds) that forces `loading: false` if `INITIAL_SESSION` hasn't fired yet
2. **Add an explicit `getSession()` call** after setting up the listener as a fallback to ensure session state is resolved — if no valid session exists, it will return `null` and clear the stale state
3. **Handle `SIGNED_OUT` event** explicitly to ensure `session` is set to `null` immediately

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
    setSession(newSession);
    if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
      setLoading(false);
    }
  });

  // Fallback: if INITIAL_SESSION never fires, resolve after 3s
  const timeout = setTimeout(() => setLoading(false), 3000);

  return () => {
    subscription.unsubscribe();
    clearTimeout(timeout);
  };
}, []);
```

No other files need changes — the Navbar logic (`!!user`) is correct once the auth state is reliable.

