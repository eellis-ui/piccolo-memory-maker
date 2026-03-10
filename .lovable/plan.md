

## Plan: Sync personalized cover text to shared-photo books

### Problem
When a customer personalizes the cover wording for one book in a shared-photo bundle, the `bookAddOns` (containing `bottomTitle`, `dedicationPageText`) is not copied to sibling books — only the `coverData` and DB fields are synced.

### Changes

**`src/pages/Builder.tsx`** — `handleCoverComplete` function (lines 354-374)

Two fixes in the shared-photo sync block:

1. **Line 360-366**: Change the DB update to use the active book's `bookAddOns` instead of the basket-level `addOns`:
   - Use `prev[activeBookIndex].bookAddOns` for `title_page_text`, `dedication_page_enabled`, `dedication_page_text`

2. **Line 369**: Copy `bookAddOns` from the active book to all sibling books in local state:
   - Change `return { ...b, coverData: data, completed: true, step: "cover" as const };`
   - To `return { ...b, coverData: data, bookAddOns: prev[activeBookIndex].bookAddOns, completed: true, step: "cover" as const };`

