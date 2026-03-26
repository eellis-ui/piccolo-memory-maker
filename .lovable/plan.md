

## Plan: Tighten spacing between navbar and book tabs

**Single file change: `src/pages/Builder.tsx`**

1. **Line 420** — Reduce mobile top padding from `pt-[60px]` to `pt-[48px]` (keep `sm:pt-24`)
2. **Line 456** — Reduce tabs container bottom margin from `mb-8` to `mb-4`

These two changes bring the book selector bar closer to the navbar, matching the screenshot reference.

