

## Plan: Fix Admin Page Loading + Photo Deletion Safety

### Problem 1: Admin page stuck on spinner
Line 317 in `Admin.tsx`:
```typescript
if (roleLoading || (!isAdmin && !roleLoading))
```
The condition `(!isAdmin && !roleLoading)` is always true when `isAdmin` is false, so the page never renders — it shows the spinner forever even for an authenticated admin (because there's a brief moment where `isAdmin` is false before the role query completes, and the `useEffect` redirect on line 113 races with the render guard).

**Fix**: Replace with a simple sequential guard:
```typescript
if (roleLoading) {
  return <Loader2 spinner />;
}
if (!isAdmin) {
  return <Navigate to="/auth" replace />;
}
```
Remove the `useEffect` redirect on lines 112-114 since the render guard handles it.

### Problem 2: Photos deleted before PDF exists
In `MyOrders.tsx`, the cleanup action fires after `generateAndUploadPdf` succeeds. This is correct in the current code. However, if the PDF generation fails or the user never visits My Orders, photos sit around but are never deleted prematurely — this is safe.

The real issue is that PDF generation only triggers when someone visits My Orders. For the admin, it should also auto-trigger from the Admin page.

**Fix**: Add the same auto-trigger logic to `Admin.tsx` — when the admin page loads and detects paid orders without `production_pdf_path`, generate PDFs client-side one at a time. Only call cleanup after successful generation.

### File Changes
| File | Change |
|------|--------|
| `src/pages/Admin.tsx` | Fix auth guard (line 317), remove useEffect redirect, add auto-trigger PDF generation for orders missing production_pdf_path |

