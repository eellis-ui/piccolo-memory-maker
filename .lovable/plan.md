

## Plan: Fix Admin Page Stuck on Loading Spinner

### Root Cause Analysis
The guard code at line 315 looks correct, but there's a potential issue in `useIsAdmin` hook: if the `onAuthStateChange` `INITIAL_SESSION` event fires with `SIGNED_IN` instead (which can happen on some Supabase versions), `loading` in AuthContext stays `true` until the 3s fallback timeout. Combined with no error handling on the role query, `roleLoading` could stay `true` indefinitely if something unexpected happens.

### Fix (2 files)

**1. `src/contexts/AuthContext.tsx`** — Set `loading=false` on ALL auth events, not just `INITIAL_SESSION` and `SIGNED_OUT`:
```typescript
supabase.auth.onAuthStateChange((_event, newSession) => {
  setSession(newSession);
  setLoading(false);  // Always resolve loading on any auth event
});
```

**2. `src/hooks/use-admin.ts`** — Add error handling so `loading` always resolves, even if the query fails:
```typescript
supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id)
  .eq("role", "admin")
  .maybeSingle()
  .then(({ data, error }) => {
    if (error) console.error("Role check failed:", error);
    setIsAdmin(!!data);
    setLoading(false);
  });
```

These two changes ensure the auth loading state always resolves promptly, and the role check always completes — preventing the spinner from getting stuck.

