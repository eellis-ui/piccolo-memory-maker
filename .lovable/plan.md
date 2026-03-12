
## Root Cause: Competing Auth Listeners + No Shared State

Every page that needs auth (`Auth`, `MyOrders`, `Navbar`) each creates its own `onAuthStateChange` listener independently. This causes:

1. **Race conditions** — Multiple listeners fire at the same time with different state
2. **Infinite spinner on MyOrders** — The `!authed || loading` guard shows spinner; if `INITIAL_SESSION` fires but `setAuthed(true)` + `fetchOrders()` runs async, any hiccup keeps the spinner forever
3. **Sign out not working visually** — `signOut` fires but the `isLoggedIn` state in Navbar only updates via its own listener, which may lag
4. **The actual broken flow**: After `signInWithPassword`, Supabase fires `SIGNED_IN` in the `Auth` page listener → `navigate("/my-orders")` → `Auth` unmounts → `MyOrders` mounts and creates a NEW listener → `INITIAL_SESSION` fires on that new listener → loads orders correctly... BUT if there's any timing issue between the unmount and remount, the session can appear to not exist yet

## The Fix: Single Global Auth Context

Replace all individual auth listeners with **one `AuthContext`** at the app level. Every component reads from this context — no more competing listeners, no race conditions.

```text
App.tsx
  └─ AuthProvider (single onAuthStateChange listener)
       ├─ Navbar — reads user from context
       ├─ Auth page — reads session from context, redirects if already logged in
       └─ MyOrders — reads user from context, redirects if null
```

## Files to Change

### 1. NEW: `src/contexts/AuthContext.tsx`
A single provider that:
- Sets up ONE `onAuthStateChange` listener for the entire app
- Exposes `{ user, session, loading }` via context
- Handles the `INITIAL_SESSION` event once globally
- No spinner races, no competing listeners

```tsx
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'INITIAL_SESSION') setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user: session?.user ?? null, session, loading }}>{children}</AuthContext.Provider>;
};
```

### 2. EDIT: `src/App.tsx`
Wrap the app with `<AuthProvider>` — placed INSIDE `BrowserRouter` so `navigate` works in context if needed.

### 3. REWRITE: `src/pages/Auth.tsx`
- Remove all `supabase.auth.onAuthStateChange` and `getSession` calls
- Use `useAuth()` context hook
- If `loading` → show spinner
- If `user` exists → redirect to `from`
- Otherwise → show form (form submit still calls `signInWithPassword` directly)

### 4. REWRITE: `src/pages/MyOrders.tsx`
- Remove the `onAuthStateChange` listener entirely
- Use `useAuth()` context hook
- If `loading` → show spinner
- If `!user` → redirect to `/auth`
- If `user` → fetch orders once on mount with a simple `useEffect`

### 5. EDIT: `src/components/layout/Navbar.tsx`
- Replace the local `supabase.auth.getUser()` + `onAuthStateChange` with `useAuth()` context
- Sign Out button already exists — just ensure it calls `signOut()` and the context updates globally

### 6. EDIT: `src/hooks/use-admin.ts`
- Replace local `supabase.auth.getUser()` + `onAuthStateChange` with `useAuth()` context for the user check

## Why This Definitively Fixes It

- **One listener** — no race conditions between multiple `onAuthStateChange` callbacks
- **Synchronous state** — all components read the same `loading`/`user` state simultaneously
- **No redirect loops** — `Auth` page checks context: if `loading` → wait, if `user` → redirect, if `!user` → show form. Simple, deterministic
- **Sign out works immediately** — one `signOut()` call updates the single context, all components re-render at the same time
