/**
 * Journey data for the admin dashboard — timestamped, per-visitor and
 * per-build, so drop-off points are visible rather than inferred from
 * aggregate tiles.
 *
 * Sessions come from analytics_events (one row per event, keyed by the
 * browser's _analytics_session id). Builds come from orders + order_photos —
 * the source of truth for how far a book actually got.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const WINDOW_DAYS = 7;

/* Milestones a visitor session can reach, least → furthest. */
export const MILESTONES = [
  "Browsed",
  "Viewed product",
  "Started builder",
  "Uploaded photos",
  "Previewed book",
  "Chose cover",
  "Added to cart",
  "Checkout",
  "Purchased",
] as const;
export type Milestone = (typeof MILESTONES)[number];

const EVENT_MILESTONE: Record<string, Milestone> = {
  product_view: "Viewed product",
  builder_upload: "Uploaded photos",
  builder_approve: "Previewed book",
  builder_cover: "Chose cover",
  add_to_cart: "Added to cart",
  checkout_initiated: "Checkout",
  purchase: "Purchased",
};

export interface SessionJourney {
  sessionId: string;
  firstSeen: string;
  lastSeen: string;
  pageViews: number;
  paths: string[];
  furthest: Milestone;
  /** When the furthest milestone was reached */
  furthestAt: string;
}

export interface BuildJourney {
  orderId: string;
  createdAt: string;
  updatedAt: string;
  step: string;
  status: string;
  customerName: string | null;
  shopifyOrderNumber: string | null;
  photoCount: number;
  firstPhotoAt: string | null;
  lastPhotoAt: string | null;
}

export interface JourneyData {
  sessions: SessionJourney[];
  builds: BuildJourney[];
  /** How many sessions got exactly as far as each milestone */
  dropOff: Partial<Record<Milestone, number>>;
  loading: boolean;
}

interface EventRow {
  event_type: string;
  session_id: string | null;
  path: string | null;
  created_at: string;
}

interface OrderRow {
  id: string;
  created_at: string;
  updated_at: string | null;
  builder_step: string | null;
  status: string;
  customer_name: string | null;
  shopify_order_number: string | null;
}

interface PhotoRow {
  order_id: string;
  created_at: string;
}

const rank = (m: Milestone) => MILESTONES.indexOf(m);

export function useJourneys(enabled: boolean): JourneyData {
  const [sessions, setSessions] = useState<SessionJourney[]>([]);
  const [builds, setBuilds] = useState<BuildJourney[]>([]);
  const [dropOff, setDropOff] = useState<Partial<Record<Milestone, number>>>({});
  const [loading, setLoading] = useState(true);

  const fetchJourneys = useCallback(async () => {
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const [eventsRes, ordersRes, photosRes] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("event_type, session_id, path, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(10000),
      supabase
        .from("orders")
        .select("id, created_at, updated_at, builder_step, status, customer_name, shopify_order_number")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("order_photos")
        .select("order_id, created_at")
        .gte("created_at", since)
        .limit(5000),
    ]);

    if (eventsRes.error || ordersRes.error || photosRes.error) {
      console.warn(
        "[Journeys] fetch failed:",
        eventsRes.error?.message || ordersRes.error?.message || photosRes.error?.message
      );
      setLoading(false);
      return;
    }

    const events = (eventsRes.data ?? []) as unknown as EventRow[];
    const orders = (ordersRes.data ?? []) as unknown as OrderRow[];
    const photos = (photosRes.data ?? []) as unknown as PhotoRow[];

    /* ── Sessions ── */
    const bySession = new Map<string, SessionJourney>();
    for (const ev of events) {
      if (!ev.session_id) continue;
      let s = bySession.get(ev.session_id);
      if (!s) {
        s = {
          sessionId: ev.session_id,
          firstSeen: ev.created_at,
          lastSeen: ev.created_at,
          pageViews: 0,
          paths: [],
          furthest: "Browsed",
          furthestAt: ev.created_at,
        };
        bySession.set(ev.session_id, s);
      }
      s.lastSeen = ev.created_at;
      if (ev.event_type === "page_view") {
        s.pageViews++;
        if (ev.path && !s.paths.includes(ev.path)) s.paths.push(ev.path);
      }
      const milestone = EVENT_MILESTONE[ev.event_type];
      if (milestone && rank(milestone) > rank(s.furthest)) {
        s.furthest = milestone;
        s.furthestAt = ev.created_at;
      }
      // Visiting /builder counts as starting it even before any step event
      if (
        ev.path === "/builder" &&
        rank("Started builder") > rank(s.furthest)
      ) {
        s.furthest = "Started builder";
        s.furthestAt = ev.created_at;
      }
    }
    const sessionList = Array.from(bySession.values()).sort(
      (a, b) => b.lastSeen.localeCompare(a.lastSeen)
    );

    const drop: Partial<Record<Milestone, number>> = {};
    for (const s of sessionList) {
      drop[s.furthest] = (drop[s.furthest] ?? 0) + 1;
    }

    /* ── Builds ── */
    const photosByOrder = new Map<string, { count: number; first: string; last: string }>();
    for (const p of photos) {
      const cur = photosByOrder.get(p.order_id);
      if (!cur) {
        photosByOrder.set(p.order_id, { count: 1, first: p.created_at, last: p.created_at });
      } else {
        cur.count++;
        if (p.created_at < cur.first) cur.first = p.created_at;
        if (p.created_at > cur.last) cur.last = p.created_at;
      }
    }
    const buildList: BuildJourney[] = orders.map((o) => {
      const ph = photosByOrder.get(o.id);
      return {
        orderId: o.id,
        createdAt: o.created_at,
        updatedAt: o.updated_at || o.created_at,
        step: o.builder_step || "upload",
        status: o.status,
        customerName: o.customer_name,
        shopifyOrderNumber: o.shopify_order_number,
        photoCount: ph?.count ?? 0,
        firstPhotoAt: ph?.first ?? null,
        lastPhotoAt: ph?.last ?? null,
      };
    });

    setSessions(sessionList);
    setBuilds(buildList);
    setDropOff(drop);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchJourneys();
    const interval = setInterval(fetchJourneys, 60_000);
    return () => clearInterval(interval);
  }, [enabled, fetchJourneys]);

  return { sessions, builds, dropOff, loading };
}
