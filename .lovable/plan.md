

## Plan: Ensure Sign In / Sign Out Buttons Always Appear

### Problem
The Sign In and Sign Out buttons are conditionally rendered with `!authLoading && ...`, but there's a potential race condition where `loading` could stay `true` if both the `onAuthStateChange` listener and `getSession()` encounter issues. Also, the `onAuthStateChange` callback only sets `loading = false` for `INITIAL_SESSION` and `SIGNED_OUT` events — other events like `TOKEN_REFRESHED` or `SIGNED_IN` don't clear loading.

### Fix — 2 files

**1. `src/contexts/AuthContext.tsx` — Guarantee loading resolves**
- Set `loading = false` on ALL auth state change events, not just `INITIAL_SESSION` and `SIGNED_OUT`
- Keep the `getSession()` fallback
- Add a safety timeout (3 seconds) as a last resort if both mechanisms fail

**2. `src/components/layout/Navbar.tsx` — Show Sign In as default when not loading**
- No logic changes needed — the current conditionals are correct. The fix is entirely in AuthContext resolving `loading` reliably.

### File Changes
| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Set `loading = false` on every `onAuthStateChange` event + add 3s safety timeout |

### What this fixes
- Sign In button appears immediately for unauthenticated visitors (no more hidden state)
- Sign Out button appears for logged-in users
- My Orders link appears for logged-in users
- Admin link appears for admin users
- No more stuck loading states

