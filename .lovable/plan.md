
# Make Unique Photos Toggle State More Visually Distinct in Cart

## Problem
The "Unique photos per book" toggle in the cart drawer looks too similar in its enabled vs disabled states. The only difference is a subtle border/background tint and a tiny checkmark vs plus sign, making it hard to tell at a glance whether it's been added.

## Changes

### `src/components/layout/Navbar.tsx` (lines 148-164)

Enhance the visual contrast between the two states:

**When ENABLED (uniquePhotos = true):**
- Solid green/primary background with white or dark text
- Checkmark icon (from lucide-react `Check`) instead of a text checkmark
- Bolder styling: `bg-primary text-white border-primary` or `bg-green-50 border-green-500 text-green-700`
- "Added" label or clearly visible check badge

**When DISABLED (uniquePhotos = false):**
- Light/muted dashed or dotted border
- Grayed-out text with a prominent "+ Add" style
- Plus icon (from lucide-react `Plus`)
- Price shown in muted tone

Specifically:
- Replace the text `'✓'` / `'+'` with `<Check />` and `<Plus />` lucide icons for clarity
- Enabled state: `border-green-500 bg-green-50` with `text-green-700` for the label and a small green `Check` icon
- Disabled state: `border-dashed border-muted-foreground/30 bg-transparent` with `text-muted-foreground`
- Add a small pill/badge saying "Added" next to the checkmark when enabled

This makes the two states unmistakably different at a glance, matching the reference screenshot's style where enabled shows `✓ $4.99` prominently vs `+ $4.99` in a muted style.
