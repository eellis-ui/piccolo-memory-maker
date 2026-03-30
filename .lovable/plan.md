

## Plan: Fix Sign In/Out Flow and Improve Auth UX

### Current State
The code already has Sign In / Sign Out buttons in the navbar, admin gating via `has_role` RPC, and order access on My Orders. The main issues are:

1. **Admin page stuck on spinner** — already fixed in the latest commit (you're viewing an older preview). Restore to latest or refresh the live preview.
2. **Login failure doesn't guide to sign-up** — when someone enters an unrecognized email, Supabase returns a generic "Invalid login credentials" error. The user wants a prompt to create an account instead.
3. **Visitors should always start signed out** — this already works (no auto-login without credentials), but we should ensure the Auth page defaults to the login view.

### Changes

**File: `src/pages/Auth.tsx`**
- In the `catch` block for login errors, detect the "Invalid login credentials" message and show a friendlier toast: "No account found with that email. Would you like to create one?" and auto-switch to the Sign Up form (`setIsLogin(false)`).
- Keep all other error messages as-is.

### What Already Works (No Changes Needed)
- **Sign In button** in navbar (desktop + mobile) when logged out → links to `/auth`
- **Sign Out button** in navbar when logged in → calls `supabase.auth.signOut()` and redirects to home
- **My Orders** link appears only when logged in → shows past orders and digital PDFs
- **Admin link** appears only for admin-role users → full order dashboard
- **Auth guard on Admin page** → redirects non-admins to `/auth`
- **Visitors start signed out** → session only exists if user explicitly signs in

### Summary
This is a single-file change to `Auth.tsx` that improves the login error UX by detecting unrecognized emails and prompting the user to sign up instead.

