/**
 * Background line-art conversion queue.
 *
 * Conversion used to start only when the customer reached the Approve step and
 * pressed "Convert All". Nothing happened while they were uploading, so the
 * common experience was: add sixteen photos, watch nothing happen, leave. The
 * data agreed — of 113 builds started after 1 June, 66 died on the upload step
 * and 73% of uploaded photos were never converted at all.
 *
 * Photos are now queued the moment they finish uploading, so by the time the
 * customer reaches Approve most of the work is already done.
 *
 * Conversions are charged per image, so the queue is careful never to run the
 * same photo twice: `seen` covers the lifetime of the page, and the edge
 * function is itself idempotent (it returns `alreadyDone` for a photo that is
 * already converted) as a second line of defence.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ConversionOutcome {
  photoId: string;
  ok: boolean;
  convertedUrl?: string;
  convertedPath?: string;
  error?: string;
}

/**
 * Four at a time. The Approve step used batches of ten, which is fine as a
 * foreground action the customer is waiting on, but this now runs while they
 * are still uploading — a narrower pipe keeps us clear of OpenAI rate limits
 * and keeps upload responsive on a phone.
 */
const MAX_CONCURRENT = 4;

/** Matches the abort in ApproveStep; quality "high" at A4 300 DPI is not fast. */
const TIMEOUT_MS = 180_000;

interface QueueItem {
  photoId: string;
  sessionId: string;
}

const waiting: QueueItem[] = [];
const seen = new Set<string>();
const active = new Set<string>();
const listeners = new Set<(outcome: ConversionOutcome) => void>();

/** Subscribe to conversion results. Returns an unsubscribe function. */
export function onConversion(cb: (outcome: ConversionOutcome) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(outcome: ConversionOutcome) {
  seen.add(outcome.photoId);
  for (const cb of listeners) {
    try {
      cb(outcome);
    } catch {
      // A broken subscriber must not stall the queue.
    }
  }
}

/** True while a photo is queued or converting. */
export function isQueued(photoId: string): boolean {
  return active.has(photoId) || waiting.some((i) => i.photoId === photoId);
}

/** How many photos are still waiting or in flight. */
export function queueDepth(): number {
  return waiting.length + active.size;
}

/**
 * Queue a photo for conversion. Safe to call repeatedly for the same photo —
 * duplicates are dropped rather than paid for twice.
 */
export function enqueueConversion(photoId: string, sessionId: string): void {
  if (!photoId || !sessionId) return;
  if (seen.has(photoId) || isQueued(photoId)) return;
  waiting.push({ photoId, sessionId });
  void pump();
}

/** Forget a photo so it can be retried after a failure. */
export function allowRetry(photoId: string): void {
  seen.delete(photoId);
}

async function pump(): Promise<void> {
  while (active.size < MAX_CONCURRENT && waiting.length > 0) {
    const item = waiting.shift()!;
    if (seen.has(item.photoId) || active.has(item.photoId)) continue;
    active.add(item.photoId);
    void runOne(item).finally(() => {
      active.delete(item.photoId);
      void pump();
    });
  }
}

async function runOne({ photoId, sessionId }: QueueItem): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const { data, error } = await supabase.functions.invoke("convert-to-lineart", {
      body: { photoId, sessionId },
      signal: controller.signal,
    });
    if (error) throw new Error(error.message || "Conversion failed");
    if (!data?.success) throw new Error(data?.error || "Conversion failed");
    emit({
      photoId,
      ok: true,
      convertedUrl: data.convertedUrl,
      convertedPath: data.convertedPath,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Leave it out of `seen` so the Approve step can retry it.
    emit({
      photoId,
      ok: false,
      error: message === "The user aborted a request." ? "Conversion timed out" : message,
    });
    seen.delete(photoId);
  } finally {
    clearTimeout(timer);
  }
}
