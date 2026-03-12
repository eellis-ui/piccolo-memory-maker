
Goal: fix the affiliate page loading loop and make sure the form reliably appears.

What’s likely broken now
- The page starts with `checkingAuth = true` and only exits that state if auth/session checks complete successfully.
- In `src/pages/BecomeAffiliate.tsx`, both `getSession()` and `checkAffiliate()` lack robust error handling/finally fallbacks.
- If either promise rejects (stale/corrupt local session, transient auth failure, network error), `setCheckingAuth(false)` is never guaranteed, so the spinner can stay forever.
- The warnings in console about refs are noisy but not the root cause of the spinner loop.

Implementation plan

1) Harden auth bootstrap on `BecomeAffiliate` page
- Refactor auth init into a single safe flow:
  - `initAuth()` calls `supabase.auth.getSession()` inside `try/catch/finally`.
  - Always resolve loading state in `finally` (unless redirecting).
- Keep `onAuthStateChange` for updates, but make callback defensive:
  - If no session/user → set `user = null` and `checkingAuth = false`.
  - If user exists → call a guarded `checkAffiliateSafe(user.id)`.
- Add a timeout safeguard (e.g. 2–3s) so spinner cannot persist indefinitely if auth hangs.

2) Make affiliate lookup failure-safe
- Wrap `checkAffiliate` in `try/catch`.
- Handle both `error` responses and thrown exceptions.
- On any failure, do not keep spinner active:
  - set `checkingAuth(false)`
  - fall back to showing auth/affiliate form
  - optionally toast a friendly message like “Couldn’t verify account right now, please continue.”

3) Implement the full affiliate form on this page
- Extend hero “affiliate details” form to include optional social fields already used elsewhere:
  - Instagram handle
  - TikTok handle
- Send these fields in the existing `affiliate-signup` request payload.
- Keep existing required fields (`full_name`, `discount_code`) and validation.

4) Prevent state race issues
- Add mounted guard (`isMounted` ref/flag) to avoid late async updates after unmount.
- Avoid duplicated state transitions between auth listener and session fetch.
- Ensure only one path controls `checkingAuth` resolution.

5) Keep behavior consistent with current flow
- Logged out: show email/password auth form (no infinite spinner).
- Logged in + no affiliate: show affiliate signup form immediately.
- Logged in + existing affiliate: redirect to `/affiliates`.

Files to update
- `src/pages/BecomeAffiliate.tsx` (primary, all fixes)
- No database migration needed.
- No backend function changes required (existing `affiliate-signup` already supports optional handles).

Technical notes
- This is a resilience/state-management fix, not a schema issue.
- We’ll keep the backend integration as-is and only make the frontend auth gating robust so UI can’t get stuck in loading.
- We will not touch auto-generated integration files.

Validation checklist after implementation
- Open `/become-an-affiliate` while logged out → form appears without spinner loop.
- Open while logged in without affiliate record → affiliate details form appears.
- Submit form successfully → redirected to `/affiliates`.
- Simulate auth/session failure (expired or bad local session) → spinner still clears and form is usable.
