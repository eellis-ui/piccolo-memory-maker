

# Fix: Multi-Book Builder Not Showing All Books

## Problem
When you add multiple books (across bundles) to the cart and proceed to the builder, it looks like only 1 book exists. The book tabs ("Book 1", "Book 2", etc.) and the "Book X of Y" progress text are **hidden** because they are gated behind the `uniquePhotos` upsell flag. If unique photos isn't active (or gets lost on session resume), the multi-book UI disappears entirely -- even though the builder *is* tracking all books behind the scenes.

There's also a secondary bug: when resuming a session from the database, the `uniquePhotos` flag from the cart isn't restored.

## Changes

### 1. Always show multi-book tabs when there are multiple books
**File:** `src/pages/Builder.tsx` (lines 271, 346)

Remove the `&& uniquePhotos` condition from both places:
- Line 271: `bookCount > 1 && uniquePhotos` becomes `bookCount > 1`
- Line 346: `bookCount > 1 && uniquePhotos` becomes `bookCount > 1`

This ensures users always see the book tabs and "Customising Book X of Y" text whenever there are 2+ books, regardless of whether unique photos is enabled.

### 2. Restore `uniquePhotos` from database on session resume
**File:** `src/pages/Builder.tsx` (around line 94)

When resuming a session from the database, read the `unique_photos` field from each order and set the basket items' `uniquePhotos` flags accordingly. Currently `setQuantity(existingOrders.length)` creates items with `uniquePhotos: false` by default, losing the user's selection.

### 3. Show UniquePhotosUpsellBanner for all multi-book orders
**File:** `src/pages/Builder.tsx` (line 362)

The upsell banner condition `bookCount > 1` is already correct, but verify it renders properly now that the tabs are always visible.

## What This Fixes
- Book tabs ("Book 1", "Book 2", ...) will always be visible for multi-book orders
- "Customising Book X of Y" progress text will always show
- The unique photos selection will persist across session resumes
- Users will clearly see and navigate between all their books in the builder

