

## Plan: Fix Sign In / Sign Out Flow

### Current State
The Navbar and Auth page code is structurally correct — Sign In shows when not logged in, Sign Out when logged in. The root cause of the "stuck" state is the AuthContext loading issue (already fixed with the 3-second timeout). Two additional improvements are needed:

### Changes

**1. `src/contexts/AuthContext.tsx` — Add explicit `getSession()` fallback**
The current fix has a 3-second timeout, but we should also add an explicit `getSession()` call after the listener is set up. This ensures that if a stale token exists in localStorage, it gets validated immediately rather than waiting 3 seconds. If the session is expired/invalid, Supabase returns `null`, clearing the false "signed in" state.

**2. `src/pages/Auth.tsx` — Auto-detect unrecognized email on login failure**
When a user tries to sign in and gets "Invalid login credentials", automatically switch to the sign-up form and show a helpful message like "No account found with that email — create one below." This replaces the current generic error toast.

**3. `src/components/layout/Navbar.tsx` — Hide auth-dependent links while loading**
Currently the Navbar reads `user` from AuthContext but doesn't check `loading`. During the loading period, `user` is null so "Sign In" briefly flashes even for logged-in users (and vice versa with stale tokens). Add `loading` check: while auth is loading, hide both Sign In and Sign Out to prevent flicker.

### File Changes
| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add `getSession()` call after listener setup as immediate fallback |
| `src/pages/Auth.tsx` | Catch "Invalid login credentials" error → switch to signup mode with message |
| `src/components/layout/Navbar.tsx` | Use `loading` from `useAuth()` to hide auth buttons until resolved |

