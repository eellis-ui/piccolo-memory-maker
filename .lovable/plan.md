
## Root Cause

The Sign Out button calls `supabase.auth.signOut({ scope: "global" })`. The `scope: "global"` option makes a server-side API call to invalidate all sessions across all devices. If this call fails (network error, permissions, etc.), the `await` throws and `navigate("/")` never runs — silently breaking the button.

The simple fix: use `scope: "local"` (default) which only clears the local session in localStorage without a server round-trip. This is instant and cannot fail. The `onAuthStateChange` in `AuthContext` then fires with `SIGNED_OUT`, sets `session = null`, `user` becomes `null`, and the Navbar reactively hides the Sign Out button and shows Sign In — all correctly.

Additionally, `navigate("/")` should happen regardless of whether signOut succeeded, so it should be wrapped in a try/catch or done unconditionally.

## The Fix — One Change, Two Locations

In `src/components/layout/Navbar.tsx`, update both the desktop and mobile Sign Out handlers:

**From:**
```tsx
await supabase.auth.signOut({ scope: "global" });
navigate("/");
```

**To:**
```tsx
await supabase.auth.signOut();
navigate("/");
```

Remove `{ scope: "global" }` from both the desktop (line 479) and mobile (line 555) sign out buttons. The default local scope is reliable and instant.

## Files to Change

- `src/components/layout/Navbar.tsx` — Remove `{ scope: "global" }` from both sign out calls (desktop + mobile)
