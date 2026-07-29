/**
 * Order data for the staff dashboard.
 *
 * Everything here reads through RLS as the signed-in admin — there is no
 * service-role key in the browser, so a non-admin session simply sees nothing.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OrderStatus = "draft" | "paid" | "shipped";

export interface AdminPhoto {
  id: string;
  page_position: number;
  conversion_status: string;
  is_approved: boolean;
  is_landscape: boolean;
  original_path: string | null;
  converted_path: string | null;
}

export interface AdminOrder {
  id: string;
  created_at: string;
  status: string | null;
  payment_status: string | null;
  order_name: string | null;
  shopify_order_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  builder_step: string | null;
  digital_download: boolean | null;
  production_pdf_path: string | null;
  digital_pdf_path: string | null;
  photos: AdminPhoto[];
}

/**
 * Why an order needs a human. Ordered most urgent first — `unconverted_paid` is
 * the case that went unnoticed for nine days on order PIC16781964: paid for,
 * with not one photo converted, and nothing in the system retrying it.
 */
export type AttentionReason =
  | "unconverted_paid"
  | "failed_conversions"
  | "paid_awaiting_shipment"
  | "stalled_draft";

export interface Attention {
  reason: AttentionReason;
  label: string;
  detail: string;
}

/** Drafts untouched for this long are treated as abandoned, not in progress. */
const STALLED_DRAFT_DAYS = 7;

export function attentionFor(order: AdminOrder, now = Date.now()): Attention | null {
  const pending = order.photos.filter((p) => p.conversion_status === "pending").length;
  const failed = order.photos.filter((p) => p.conversion_status === "failed").length;
  const isPaid = order.status === "paid" || order.payment_status === "paid";

  if (isPaid && pending > 0) {
    return {
      reason: "unconverted_paid",
      label: "Paid, art not generated",
      detail: `${pending} of ${order.photos.length} photos never converted`,
    };
  }
  if (failed > 0) {
    return {
      reason: "failed_conversions",
      label: "Conversions failed",
      detail: `${failed} photo${failed === 1 ? "" : "s"} failed to convert`,
    };
  }
  if (isPaid && order.status !== "shipped") {
    return {
      reason: "paid_awaiting_shipment",
      label: "Awaiting shipment",
      detail: order.tracking_number ? "Tracking added" : "No tracking yet",
    };
  }

  const ageDays = (now - new Date(order.created_at).getTime()) / 86_400_000;
  if (order.status === "draft" && order.photos.length > 0 && ageDays > STALLED_DRAFT_DAYS) {
    return {
      reason: "stalled_draft",
      label: "Abandoned build",
      detail: `${order.photos.length} photos uploaded, stopped at "${order.builder_step ?? "upload"}"`,
    };
  }
  return null;
}

/** Free-text match across the fields staff actually search by on a support call. */
export function matchesQuery(order: AdminOrder, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    order.order_name,
    order.shopify_order_number,
    order.customer_name,
    order.customer_email,
    order.customer_phone,
    order.id,
  ].some((field) => field?.toLowerCase().includes(q));
}

export interface UseAdminOrdersResult {
  orders: AdminOrder[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdminOrders(enabled: boolean): UseAdminOrdersResult {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    // One nested select rather than a query per order — the dashboard lists
    // hundreds of rows and a per-row round trip is what makes admin panels feel
    // broken.
    const { data, error: err } = await supabase
      .from("orders")
      .select(
        `id, created_at, status, payment_status, order_name, shopify_order_number,
         customer_name, customer_email, customer_phone, tracking_number, shipped_at,
         builder_step, digital_download, production_pdf_path, digital_pdf_path,
         order_photos ( id, page_position, conversion_status, is_approved, is_landscape,
                        original_path, converted_path )`,
      )
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setOrders(
      (data ?? []).map((row) => {
        const { order_photos, ...rest } = row as Record<string, unknown> & {
          order_photos?: AdminPhoto[];
        };
        return {
          ...(rest as Omit<AdminOrder, "photos">),
          photos: [...(order_photos ?? [])].sort((a, b) => a.page_position - b.page_position),
        };
      }),
    );
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { orders, loading, error, refresh };
}

export interface OrderCounts {
  total: number;
  draft: number;
  paid: number;
  shipped: number;
  needsAttention: number;
}

export function useOrderCounts(orders: AdminOrder[]): OrderCounts {
  return useMemo(() => {
    const counts: OrderCounts = { total: orders.length, draft: 0, paid: 0, shipped: 0, needsAttention: 0 };
    for (const order of orders) {
      if (order.status === "draft") counts.draft += 1;
      else if (order.status === "paid") counts.paid += 1;
      else if (order.status === "shipped") counts.shipped += 1;
      if (attentionFor(order)) counts.needsAttention += 1;
    }
    return counts;
  }, [orders]);
}
