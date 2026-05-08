import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

type Supa = ReturnType<typeof adminClient>;

function validateSession(sessionId: string | null): string {
  if (!sessionId || !UUID_RE.test(sessionId)) {
    throw new Error("Invalid session ID");
  }
  return sessionId;
}

async function verifyOrderOwnership(supabase: Supa, orderId: string, sessionId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("builder_session_id", sessionId)
    .eq("status", "draft")
    .single();
  if (error || !data) throw new Error("Order not found or not owned by session");
  return data;
}

/**
 * Returns the set of order_ids that should mirror photo state with this one.
 * - If `unique_photos: true` (each book has its own photos): just [orderId]
 * - If `unique_photos: false` (shared-photos bundle): all orders in the same
 *   bundle (same `bundle_id`) with `unique_photos: false`. This isolates each
 *   bundle from other bundles in the same builder session.
 * Falls back to session-wide grouping if `bundle_id` is missing (legacy data).
 */
async function getMirrorOrderIds(supabase: Supa, orderId: string): Promise<string[]> {
  const { data: src } = await supabase
    .from("orders")
    .select("builder_session_id, bundle_id, unique_photos, status")
    .eq("id", orderId)
    .single();
  if (!src) return [orderId];
  if (src.unique_photos) return [orderId];
  const q = supabase
    .from("orders")
    .select("id")
    .eq("unique_photos", false)
    .eq("status", src.status);
  const scopedQuery = src.bundle_id
    ? q.eq("bundle_id", src.bundle_id)
    : q.eq("builder_session_id", src.builder_session_id);
  const { data: siblings } = await scopedQuery;
  const ids = (siblings || []).map((s: { id: string }) => s.id);
  return ids.length ? ids : [orderId];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/guest-order\/?/, "").replace(/^\//, "");
    const supabase = adminClient();

    // ─── POST /create ───
    // Accepts EITHER:
    //   { sessionId, count }              — legacy: one bundle, N books
    //   { sessionId, bundles: [{ count, uniquePhotos }] } — N bundles, each
    //     gets its own bundle_id (and own unique_photos value).
    if (req.method === "POST" && path === "create") {
      const body = await req.json();
      const sid = validateSession(body.sessionId);

      type BundleSpec = { count: number; uniquePhotos?: boolean };
      const bundles: BundleSpec[] = Array.isArray(body.bundles) && body.bundles.length > 0
        ? body.bundles.map((b: BundleSpec) => ({
            count: Math.min(Math.max(b.count || 1, 1), 10),
            uniquePhotos: !!b.uniquePhotos,
          }))
        : [{ count: Math.min(Math.max(body.count || 1, 1), 10), uniquePhotos: false }];

      const orders: { id: string; bundle_id: string }[] = [];
      for (const bundle of bundles) {
        const bundleId = crypto.randomUUID();
        for (let i = 0; i < bundle.count; i++) {
          const { data, error } = await supabase
            .from("orders")
            .insert({
              status: "draft",
              builder_session_id: sid,
              builder_step: "upload",
              bundle_id: bundleId,
              unique_photos: bundle.uniquePhotos,
            })
            .select("id, bundle_id")
            .single();
          if (error) throw error;
          orders.push(data);
        }
      }
      return json({ orders });
    }

    // ─── POST /upload ───
    if (req.method === "POST" && path === "upload") {
      const formData = await req.formData();
      const sessionId = validateSession(formData.get("sessionId") as string);
      const orderId = formData.get("orderId") as string;
      const position = parseInt(formData.get("position") as string, 10);
      const isLandscape = formData.get("isLandscape") === "true";
      const file = formData.get("file") as File;

      if (!orderId || !file) throw new Error("Missing orderId or file");
      await verifyOrderOwnership(supabase, orderId, sessionId);

      // Determine which orders should receive a row for this photo. In shared-photos
      // mode this includes every sibling book in the bundle, so the admin sees the
      // photo under each book's order_id.
      const targetOrderIds = await getMirrorOrderIds(supabase, orderId);

      // Upload the original file ONCE; all target rows reference the same path.
      const fileName = `${crypto.randomUUID()}.jpg`;
      const storagePath = `originals/${orderId}/${fileName}`;

      const arrayBuf = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("order-files")
        .upload(storagePath, arrayBuf, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      // Drop any existing rows at this (order_id, page_position) for every target
      // order — prevents stale "pending" rows piling up when a customer re-uploads.
      // Also collect their original_path values so we can purge orphan storage files.
      const { data: stale } = await supabase
        .from("order_photos")
        .select("id, original_path")
        .in("order_id", targetOrderIds)
        .eq("page_position", position);

      if (stale && stale.length > 0) {
        const stalePaths = Array.from(
          new Set(
            (stale as { original_path: string | null }[])
              .map((r) => r.original_path)
              .filter((p): p is string => !!p && p !== storagePath),
          ),
        );
        if (stalePaths.length > 0) {
          await supabase.storage.from("order-files").remove(stalePaths);
        }
        await supabase
          .from("order_photos")
          .delete()
          .in("id", (stale as { id: string }[]).map((r) => r.id));
      }

      // Insert one row per target order, all pointing at the same storage path.
      const insertRows = targetOrderIds.map((oid) => ({
        order_id: oid,
        original_path: storagePath,
        page_position: position,
        conversion_status: "pending",
        is_landscape: isLandscape,
      }));

      const { data: photoRecords, error: dbError } = await supabase
        .from("order_photos")
        .insert(insertRows)
        .select("id, order_id");
      if (dbError) throw dbError;

      const sourceRow =
        (photoRecords || []).find((r: { order_id: string }) => r.order_id === orderId) ??
        (photoRecords || [])[0];

      // Generate signed URL
      const { data: signedData } = await supabase.storage
        .from("order-files")
        .createSignedUrl(storagePath, 3600);

      return json({
        id: sourceRow.id,
        storagePath,
        signedUrl: signedData?.signedUrl || "",
      });
    }

    // ─── POST /delete-photo ───
    if (req.method === "POST" && path === "delete-photo") {
      const { sessionId, orderId, photoId, storagePath } = await req.json();
      const sid = validateSession(sessionId);
      await verifyOrderOwnership(supabase, orderId, sid);

      // Look up the row so we know its page_position (needed to delete mirrors).
      const { data: photoRow } = await supabase
        .from("order_photos")
        .select("page_position, original_path")
        .eq("id", photoId)
        .single();

      const pathToRemove = storagePath || photoRow?.original_path;
      if (pathToRemove) {
        await supabase.storage.from("order-files").remove([pathToRemove]);
      }

      if (photoRow) {
        const targetOrderIds = await getMirrorOrderIds(supabase, orderId);
        await supabase
          .from("order_photos")
          .delete()
          .in("order_id", targetOrderIds)
          .eq("page_position", photoRow.page_position);
      } else if (photoId) {
        await supabase.from("order_photos").delete().eq("id", photoId);
      }
      return json({ success: true });
    }

    // ─── POST /update-photo ───
    if (req.method === "POST" && path === "update-photo") {
      const { sessionId, orderId, photoId, updates } = await req.json();
      const sid = validateSession(sessionId);
      await verifyOrderOwnership(supabase, orderId, sid);

      const allowed: Record<string, unknown> = {};
      if (updates.is_approved !== undefined) allowed.is_approved = updates.is_approved;
      if (updates.page_position !== undefined) allowed.page_position = updates.page_position;

      // Find the row first so we can mirror by (order_id-set, page_position).
      const { data: photoRow } = await supabase
        .from("order_photos")
        .select("page_position")
        .eq("id", photoId)
        .single();

      if (photoRow) {
        const targetOrderIds = await getMirrorOrderIds(supabase, orderId);
        const { error } = await supabase
          .from("order_photos")
          .update(allowed)
          .in("order_id", targetOrderIds)
          .eq("page_position", photoRow.page_position);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("order_photos")
          .update(allowed)
          .eq("id", photoId);
        if (error) throw error;
      }
      return json({ success: true });
    }

    // ─── POST /update-order ───
    if (req.method === "POST" && path === "update-order") {
      const { sessionId, orderId, updates } = await req.json();
      const sid = validateSession(sessionId);
      await verifyOrderOwnership(supabase, orderId, sid);

      const allowed: Record<string, unknown> = {};
      const fields = [
        "builder_step", "cover_image_id", "title_page_enabled",
        "title_page_text", "dedication_page_enabled", "dedication_page_text",
        "extra_pages", "unique_photos",
      ];
      for (const f of fields) {
        if (updates[f] !== undefined) allowed[f] = updates[f];
      }

      const { error } = await supabase
        .from("orders")
        .update(allowed)
        .eq("id", orderId);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── GET /session?sessionId=xxx ───
    if (req.method === "GET" && path === "session") {
      const sessionId = validateSession(url.searchParams.get("sessionId"));

      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("builder_session_id", sessionId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // For each order, load photos and generate signed URLs
      const result = await Promise.all(
        (orders || []).map(async (order) => {
          const { data: photos } = await supabase
            .from("order_photos")
            .select("*")
            .eq("order_id", order.id)
            .order("page_position", { ascending: true });

          const photosWithUrls = await Promise.all(
            (photos || []).map(async (row) => {
              const { data: origSigned } = await supabase.storage
                .from("order-files")
                .createSignedUrl(row.original_path, 3600);
              let convertedUrl: string | null = null;
              if (row.converted_path) {
                const { data: convSigned } = await supabase.storage
                  .from("order-files")
                  .createSignedUrl(row.converted_path, 3600);
                convertedUrl = convSigned?.signedUrl || null;
              }
              return { ...row, originalUrl: origSigned?.signedUrl || "", convertedUrl };
            }),
          );

          return { ...order, photos: photosWithUrls };
        }),
      );

      return json({ orders: result });
    }

    // ─── POST /signed-urls ───
    if (req.method === "POST" && path === "signed-urls") {
      const { sessionId, orderId, paths } = await req.json();
      const sid = validateSession(sessionId);
      await verifyOrderOwnership(supabase, orderId, sid);

      const urls = await Promise.all(
        (paths as string[]).map(async (p: string) => {
          const { data } = await supabase.storage
            .from("order-files")
            .createSignedUrl(p, 3600);
          return { path: p, signedUrl: data?.signedUrl || "" };
        }),
      );
      return json({ urls });
    }

    // ─── POST /upload-cover ───
    if (req.method === "POST" && path === "upload-cover") {
      const formData = await req.formData();
      const sessionId = validateSession(formData.get("sessionId") as string);
      const orderId = formData.get("orderId") as string;
      const coverType = formData.get("coverType") as string; // "front" or "back"
      const file = formData.get("file") as File;

      if (!orderId || !file || !coverType) throw new Error("Missing orderId, coverType, or file");
      await verifyOrderOwnership(supabase, orderId, sessionId);

      const storagePath = coverType === "back"
        ? `covers/shared/back-cover.png`
        : `covers/${orderId}/front-cover.png`;

      const arrayBuf = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("order-files")
        .upload(storagePath, arrayBuf, { contentType: "image/png", upsert: true });
      if (uploadError) throw uploadError;

      return json({ success: true, storagePath });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message }, 400);
  }
});
