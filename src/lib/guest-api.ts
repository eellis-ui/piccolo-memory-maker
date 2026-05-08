const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const BASE = `${SUPABASE_URL}/functions/v1/guest-order`;

function headers(extra?: Record<string, string>) {
  return {
    apikey: SUPABASE_ANON_KEY,
    ...extra,
  };
}

export function getOrCreateSessionId(): string {
  const key = "guest_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export async function createGuestOrders(sessionId: string, count: number) {
  const res = await fetch(`${BASE}/create`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ sessionId, count }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).orders as { id: string; bundle_id?: string }[];
}

/**
 * Create one batch of orders per bundle. Each bundle gets its own bundle_id
 * (assigned server-side) so books from different bundles don't share photos
 * with each other, even when they're in the same builder session.
 */
export async function createGuestOrderBundles(
  sessionId: string,
  bundles: { count: number; uniquePhotos?: boolean }[],
) {
  const res = await fetch(`${BASE}/create`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ sessionId, bundles }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).orders as { id: string; bundle_id?: string }[];
}

export async function getSessionOrders(sessionId: string) {
  const res = await fetch(`${BASE}/session?sessionId=${sessionId}`, {
    method: "GET",
    headers: headers(),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).orders;
}

export async function uploadGuestPhoto(
  sessionId: string,
  orderId: string,
  file: Blob,
  position: number,
  isLandscape: boolean,
) {
  const formData = new FormData();
  formData.append("sessionId", sessionId);
  formData.append("orderId", orderId);
  formData.append("position", String(position));
  formData.append("isLandscape", String(isLandscape));
  formData.append("file", file, "photo.jpg");

  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: headers(),
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { id: string; storagePath: string; signedUrl: string };
}

export async function deleteGuestPhoto(
  sessionId: string,
  orderId: string,
  photoId?: string,
  storagePath?: string,
) {
  const res = await fetch(`${BASE}/delete-photo`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ sessionId, orderId, photoId, storagePath }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function updateGuestPhoto(
  sessionId: string,
  orderId: string,
  photoId: string,
  updates: { is_approved?: boolean; page_position?: number },
) {
  const res = await fetch(`${BASE}/update-photo`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ sessionId, orderId, photoId, updates }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function updateGuestOrder(
  sessionId: string,
  orderId: string,
  updates: Record<string, unknown>,
) {
  const res = await fetch(`${BASE}/update-order`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ sessionId, orderId, updates }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function getSignedUrls(
  sessionId: string,
  orderId: string,
  paths: string[],
) {
  const res = await fetch(`${BASE}/signed-urls`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ sessionId, orderId, paths }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).urls as { path: string; signedUrl: string }[];
}

export async function uploadCover(
  sessionId: string,
  orderId: string,
  coverType: "front" | "back",
  blob: Blob,
) {
  const formData = new FormData();
  formData.append("sessionId", sessionId);
  formData.append("orderId", orderId);
  formData.append("coverType", coverType);
  formData.append("file", blob, `${coverType}-cover.png`);

  const res = await fetch(`${BASE}/upload-cover`, {
    method: "POST",
    headers: headers(),
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { success: boolean; storagePath: string };
}
