

## Problem

"Convert All" fires all 20 photos concurrently via `Promise.allSettled`. This causes two issues:

1. **Rate limit**: The edge function allows only 10 requests per 60-second window per session — so 10 of 20 immediately get 429'd and show as failed.
2. **AI gateway overload**: Even the 10 that pass are all hitting the AI gateway simultaneously, leading to 429s/502s from the AI service itself, triggering retries with 5-second × attempt backoff delays.

Combined, this makes "Convert All" for 20 photos extremely slow or mostly failing.

## Solution: Client-side concurrency control

Process photos in small batches (3 at a time) with a short stagger, instead of firing all 20 at once. This stays within rate limits and avoids overwhelming the AI gateway.

### Changes

**`src/components/builder/ApproveStep.tsx`** — Replace `convertAll`:

```tsx
const convertAll = async () => {
  const unconverted = photos.filter(
    (p) => p.conversionStatus === "pending" || p.conversionStatus === "failed"
  );
  if (unconverted.length === 0) return;

  const BATCH_SIZE = 3;
  for (let i = 0; i < unconverted.length; i += BATCH_SIZE) {
    const batch = unconverted.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map((photo) => convertPhoto(photo.id)));
  }
};
```

This processes 3 photos concurrently, waits for them to finish, then starts the next 3. Total throughput stays high but avoids rate limit rejections.

**`supabase/functions/convert-to-lineart/index.ts`** — Increase rate limit window:
- Change `MAX_REQUESTS_PER_WINDOW` from 10 → 25 to accommodate legitimate "Convert All" usage within the batched approach.

### Files to change
- `src/components/builder/ApproveStep.tsx` — Batched `convertAll`
- `supabase/functions/convert-to-lineart/index.ts` — Raise rate limit to 25

