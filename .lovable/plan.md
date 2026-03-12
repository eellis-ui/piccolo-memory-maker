

## Plan: Integrate Elfsight Instagram Feed

### Change: `src/components/landing/InstagramSection.tsx`

Replace the static image carousel with the Elfsight embed. The component will:

1. Keep the heading and tagline text
2. Use a `useEffect` to inject the Elfsight platform script (`https://elfsightcdn.com/platform.js`) once
3. Render the widget div (`elfsight-app-5df81938-ae16-4b59-ba46-f347e3e8f625`) in place of the current image grid
4. Remove all the static image array, carousel state, and navigation button logic

The static images will serve as a fallback — if Elfsight ever needs to be removed, we can revert easily.

