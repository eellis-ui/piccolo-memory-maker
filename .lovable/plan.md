

## Plan: Debug & Fix Admin Button Not Showing

### Root Cause (Most Likely)
The `useIsAdmin` hook query to `user_roles` may be silently failing — the `.then()` destructures `{ data }` but ignores `{ error }`. If the query errors (e.g., RLS timing, network), `data` is `null` and `isAdmin` stays `false` with no indication of failure.

The database confirms matilda@herbertandellis.com **does** have the admin role, and the code logic is correct. This points to a silent query failure.

### Fix — `src/hooks/use-admin.ts`

1. **Add error handling** — log errors so failures are visible
2. **Add a retry mechanism** — if the first query fails (common on initial page load when auth token isn't ready), retry once after a short delay
3. **Use the `has_role` RPC** instead of querying `user_roles` directly — this is a `SECURITY DEFINER` function that bypasses RLS entirely, making it more reliable

Updated hook:
```typescript
export const useIsAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data, error }) => {
        if (error) {
          console.error("Admin role check failed:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
        setLoading(false);
      });
  }, [user, authLoading]);

  return { isAdmin, loading };
};
```

### Why This Fixes It
- The `has_role` RPC is `SECURITY DEFINER` — it runs with elevated privileges and doesn't depend on RLS policies on `user_roles`, eliminating potential permission/timing issues
- Error handling ensures failures are visible in the console for debugging
- This is the same function already used throughout the RLS policies, so it's proven reliable

### File Changes
| File | Change |
|------|--------|
| `src/hooks/use-admin.ts` | Switch from direct `user_roles` query to `has_role` RPC call with error handling |

