

## Plan: Fix Sign Out Button

### Problem
The Sign Out button calls `supabase.auth.signOut()` but the user remains logged in. This is likely because `signOut()` with `global` scope (default) makes a network request to invalidate the server-side session, and if that request fails (network issue, CORS, etc.), the local session is not cleared.

### Fix — 1 file

**`src/components/layout/Navbar.tsx`** — Two changes to the sign out handler (both desktop at line 502 and mobile at line 577):

1. Use `{ scope: 'local' }` to ensure local session is always cleared regardless of server reachability
2. Add a manual `setSession(null)` fallback if signOut somehow doesn't trigger the auth listener
3. Add error handling with a toast so failures are visible

The updated handler:
```typescript
onClick={async () => {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    console.error('Sign out error:', error);
  }
  navigate("/");
}}
```

Using `scope: 'local'` clears the local session immediately (removes tokens from localStorage) without needing a server roundtrip. The `onAuthStateChange` listener will then fire with `SIGNED_OUT`, setting session to `null` in AuthContext, which flips `isLoggedIn` to `false` and shows the Sign In button.

### File Changes
| File | Change |
|------|--------|
| `src/components/layout/Navbar.tsx` | Add `{ scope: 'local' }` to both signOut calls (desktop + mobile) |

