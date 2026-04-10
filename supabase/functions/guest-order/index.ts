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

/** Verify sessionId is a valid UUID */
function validateSession(sessionId: string | null): string {
  if (!sessionId || !UUID_RE.test(sessionId)) {
    throw new Error("Invalid session ID");
  }
  return sessionId;
}

/** Ensure the order belongs to this session and is a draft */
async function verifyOrderOwnership(
  supabase: ReturnType<typeof adminClient>,
  orderId: string,
  sessionId: string,
) {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/guest-order\/?/, "").replace(/^\//, "");
    const supabase = adminClient();

    // ─── POST /create ───
    if (req.method === "POST" && path === "create") {
      const { sessionId, count } = await req.json();
      const sid = validateSession(sessionId);
      const bookCount = Math.min(Math.max(count || 1, 1), 10);

      const orders = [];
      for (let i = 0; i < bookCount; i++) {
        const { data, error } = await supabase
          .from("orders")
          .insert({
            status: "draft",
            builder_session_id: sid,
            builder_step: "upload",
          })
          .select("id")
          .single();
        if (error) throw error;
        orders.push(data);
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

      const fileName = `${crypto.randomUUID()}.jpg`;
      const storagePath = `originals/${orderId}/${fileName}`;

      const arrayBuf = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("order-files")
        .upload(storagePath, arrayBuf, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: photoRecord, error: dbError } = await supabase
        .from("order_photos")
        .insert({
          order_id: orderId,
          original_path: storagePath,
          page_position: position,
          conversion_status: "pending",
          is_landscape: isLandscape,
        })
        .select("id")
        .single();
      if (dbError) throw dbError;

      // Generate signed URL
      const { data: signedData } = await supabase.storage
        .from("order-files")
        .createSignedUrl(storagePath, 3600);

      return json({
        id: photoRecord.id,
        storagePath,
        signedUrl: signedData?.signedUrl || "",
      });
    }

    // ─── POST /delete-photo ───
    if (req.method === "POST" && path === "delete-photo") {
      const { sessionId, orderId, photoId, storagePath } = await req.json();
      const sid = validateSession(sessionId);
      await verifyOrderOwnership(supabase, orderId, sid);

      if (storagePath) {
        await supabase.storage.from("order-files").remove([storagePath]);
      }
      if (photoId) {
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

      const { error } = await supabase
        .from("order_photos")
        .update(allowed)
        .eq("id", photoId);
      if (error) throw error;
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
