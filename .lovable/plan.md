

## Problem

The conversion was working fine earlier but is now stuck. The root cause is that `convertAll` (line 115) fires **all 20 photos simultaneously** with `Promise.allSettled`. This floods the AI gateway with 20 concurrent heavy image-generation requests. When the gateway was less loaded, this worked; now it's causing timeouts/429s, and each failed request retries up to 5 times with 5-second delays — creating a cascading backlog that makes everything appear stuck indefinitely.

The edge function logs are empty, which typically means requests are timing out before logging completes.

## Solution

Two changes to fix this:

### 1. Batch conversions in `ApproveStep.tsx`

Replace the `Promise.allSettled(all20)` with sequential batches of 2, adding a progress counter so users see movement:

```tsx
const convertAll = async () => {
  const unconverted = photos.filter(
    (p) => p.conversionStatus === "pending" || p.conversionStatus === "failed"
  );
  if (unconverted.length === 0) return;
  
  const BATCH_SIZE = 2;
  for (let i = 0; i < unconverted.length; i += BATCH_SIZE) {
    const batch = unconverted.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map((photo) => convertPhoto(photo.id)));
  }
};
```

### 2. Increase rate limit in edge function

In `convert-to-lineart/index.ts`, raise `MAX_REQUESTS_PER_WINDOW` from 10 to 25 so a full book's conversions don't get artificially blocked.

### Files to change
- `src/components/builder/ApproveStep.tsx` — batch `convertAll` to 2 at a time
- `supabase/functions/convert-to-lineart/index.ts` — raise rate limit to 25

