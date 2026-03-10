

## Fix: "Finish Your Books" button not showing on CoverStep

### Problem
The CoverStep button should show "Finish Your Books" for shared-photo multi-book orders, but it's showing "Continue to Checkout". The logic checks `sharedBookCount` which is derived from `bookCount` (`item?.quantity`), but there may be a mismatch between the basket state and the actual number of books in the builder.

### Root Cause
The condition `!uniquePhotos && bookCount > 1` relies on the basket's `item?.quantity` value. When resuming a session, the basket is reconstructed by calling `addToCart(1, ...)` per order. If only one order exists in the DB (possible for a shared-photo session that was set up incorrectly), or if the basket state reset, `bookCount` would be 1.

### Plan

**File: `src/pages/Builder.tsx`** — Make `sharedBookCount` also consider `books.length` as a fallback, so it doesn't solely depend on the basket state:

```tsx
// Line 617: Change from:
sharedBookCount={!uniquePhotos && bookCount > 1 ? bookCount : undefined}

// To:
sharedBookCount={!uniquePhotos && (bookCount > 1 || books.length > 1) ? Math.max(bookCount, books.length) : undefined}
```

This ensures that even if the basket state is out of sync (e.g., after a session resume edge case), the builder's own `books` array is used as a fallback to correctly determine whether this is a multi-book shared order.

The same fix should be applied to the `hasMoreBooks` prop and anywhere else `bookCount` is used for the same purpose on this render (line 618 is fine since it's for `uniquePhotos` mode).

