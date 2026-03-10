

## Problem

The Customer Reviews section on `/pricing` shows the summary card correctly (using baseline constants) but the individual reviews list below it is stuck on an infinite loading spinner. The database RLS policies are correctly set to PERMISSIVE and the data is accessible (5 approved reviews exist). However, the Supabase client request from the browser appears to never resolve — no Supabase network request shows up in browser logs, no error is logged, and the `loading` state stays `true` forever.

## Root Cause

The `fetchReviews` async call in the `useEffect` hook hangs without resolving or rejecting. This could be due to the Supabase client connection timing out silently in the preview environment. Regardless of the underlying cause, the component lacks any timeout or fallback, resulting in a permanent spinner.

## Plan

### 1. Add timeout and defensive error handling to `CustomerReviewsSection.tsx`

- Wrap the Supabase fetch in a `Promise.race` with a 5-second timeout so the spinner never persists indefinitely.
- If the fetch fails or times out, set `loading` to `false` and show an empty state message ("No reviews yet — be the first!") instead of an infinite spinner.
- Add a console log before the fetch to verify the function is being called.

### 2. Show empty state when no reviews are loaded

- When `loading` is `false` and `reviews.length === 0`, display a friendly empty state instead of nothing — this ensures the page always looks complete even if the database is unreachable.

### 3. Keep the total count reflecting baseline only when DB reviews fail to load

- No change needed — the component already handles this via `BASELINE_TOTAL + reviews.length`.

