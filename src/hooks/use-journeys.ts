/**
 * Journey data for the admin dashboard — timestamped, per-visitor and
 * per-build, so drop-off points are visible rather than inferred from
 * aggregate tiles.
 *
 * Events come from analytics_events. Each row carries the per-tab session id
 * and (since Sep 2026) a persistent visitor id, so one person's sessions
 * across tabs and days stitch into a single journey. Identity (name/email)
 * is resolved from the orders that carry the same analytics ids: a paid
 * order names the visitor outright, a draft with a captured email names
 * them by email.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all-rows";

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

export interface VisitorIdentity {
  name: string | null;
  email: string | null;
  /** Shopify order reference when this visitor has bought */
  orderRef: string | null;
}

export interface JourneyEvent {
  type: string;
  path: string | null;
  at: string;
  sessionId: string;
  orderRef: string | null;
}

export interface SessionJourney {
  sessionId: string;
  /** Groups sessions of the same person: "v:<visitor_id>" or, for events
   *  logged before visitor ids existed, "s:<session_id>". */
  visitorKey: string;
  identity: VisitorIdentity | null;
  firstSeen: string;
  lastSeen: string;
  pageViews: number;
  paths: string[];
  furthest: Milestone;
  /** When the furthest milestone was reached */
  furthestAt: string;
}

export interface VisitorJourney {
  visitorKey: string;
  identity: VisitorIdentity | null;
  sessionIds: string[];
  events: JourneyEvent[];
  firstSeen: string;
  lastSeen: string;
  furthest: Milestone;
  furthestAt: string;
  /** First time this person opened the builder (null if never) */
  builderStartedAt: string | null;
  /** First purchase (null if none) */
  purchasedAt: string | null;
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
  visitors: Map<string, VisitorJourney>;
  builds: BuildJourney[];
  /** How many sessions got exactly as far as each milestone */
  dropOff: Partial<Record<Milestone, number>>;
  loading: boolean;
}

interface EventRow {
  event_type: string;
  session_id: string | null;
  visitor_id: string | null;
  path: string | null;
  created_at: string;
  metadata: { shopifyOrderNumber?: string | null } | null;
}

interface OrderRow {
  id: string;
  created_at: string;
  updated_at: string | null;
  builder_step: string | null;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  builder_email: string | null;
  shopify_order_number: string | null;
  order_name: string | null;
  analytics_session_id: string | null;
  analytics_visitor_id: string | null;
}

interface PhotoRow {
  order_id: string;
  created_at: string;
}

type PageOf<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

const rank = (m: Milestone) => MILESTONES.indexOf(m);

/** The more we know, the better: an order ref beats an email beats nothing. */
const mergeIdentity = (a: VisitorIdentity | null, b: VisitorIdentity | null): VisitorIdentity | null => {
  if (!a) return b;
  if (!b) return a;
  return {
    name: a.name || b.name,
    email: a.email || b.email,
    orderRef: a.orderRef || b.orderRef,
  };
};

export function useJourneys(enabled: boolean): JourneyData {
  const [sessions, setSessions] = useState<SessionJourney[]>([]);
  const [visitors, setVisitors] = useState<Map<string, VisitorJourney>>(new Map());
  const [builds, setBuilds] = useState<BuildJourney[]>([]);
  const [dropOff, setDropOff] = useState<Partial<Record<Milestone, number>>>({});
  const [loading, setLoading] = useState(true);

  const fetchJourneys = useCallback(async () => {
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const [eventsRes, ordersRes, identityOrdersRes, photosRes] = await Promise.all([
      // Paged: a week of events exceeds Supabase's 1,000-row cap, which used
      // to drop the newest days from the journeys view entirely.
      fetchAllRows<EventRow>((from, to) =>
        supabase
          .from("analytics_events")
          .select("event_type, session_id, visitor_id, path, created_at, metadata")
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .range(from, to) as unknown as PageOf<EventRow>,
      ),
      supabase
        .from("orders")
        .select("id, created_at, updated_at, builder_step, status, customer_name, customer_email, builder_email, shopify_order_number, order_name, analytics_session_id, analytics_visitor_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200),
      // Identity can come from an older order by the same visitor (a
      // returning customer), so look further back than the event window.
      supabase
        .from("orders")
        .select("id, created_at, updated_at, builder_step, status, customer_name, customer_email, builder_email, shopify_order_number, order_name, analytics_session_id, analytics_visitor_id")
        .or("analytics_visitor_id.not.is.null,analytics_session_id.not.is.null")
        .order("created_at", { ascending: false })
        .limit(1000),
      fetchAllRows<PhotoRow>((from, to) =>
        supabase
          .from("order_photos")
          .select("order_id, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .range(from, to) as unknown as PageOf<PhotoRow>,
      ),
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
    const identityOrders = ((identityOrdersRes.data ?? []) as unknown as OrderRow[]).concat(orders);
    const photos = (photosRes.data ?? []) as unknown as PhotoRow[];

    /* ── Identity: which visitor / session belongs to which person ── */
    const identityByVisitor = new Map<string, VisitorIdentity>();
    const identityBySession = new Map<string, VisitorIdentity>();
    for (const o of identityOrders) {
      const paid = o.status !== "draft";
      const identity: VisitorIdentity = {
        name: o.customer_name,
        email: o.customer_email || o.builder_email,
        orderRef: paid ? o.shopify_order_number || o.order_name : null,
      };
      if (!identity.name && !identity.email && !identity.orderRef) continue;
      if (o.analytics_visitor_id) {
        const k = `v:${o.analytics_visitor_id}`;
        identityByVisitor.set(k, mergeIdentity(identityByVisitor.get(k) ?? null, identity)!);
      }
      if (o.analytics_session_id) {
        identityBySession.set(
          o.analytics_session_id,
          mergeIdentity(identityBySession.get(o.analytics_session_id) ?? null, identity)!,
        );
      }
    }

    /* ── Sessions ── */
    const bySession = new Map<string, SessionJourney>();
    const sessionEvents = new Map<string, JourneyEvent[]>();
    for (const ev of events) {
      if (!ev.session_id) continue;
      let s = bySession.get(ev.session_id);
      if (!s) {
        s = {
          sessionId: ev.session_id,
          visitorKey: `s:${ev.session_id}`,
          identity: null,
          firstSeen: ev.created_at,
          lastSeen: ev.created_at,
          pageViews: 0,
          paths: [],
          furthest: "Browsed",
          furthestAt: ev.created_at,
        };
        bySession.set(ev.session_id, s);
        sessionEvents.set(ev.session_id, []);
      }
      if (ev.visitor_id) s.visitorKey = `v:${ev.visitor_id}`;
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
      if (ev.path === "/builder" && rank("Started builder") > rank(s.furthest)) {
        s.furthest = "Started builder";
        s.furthestAt = ev.created_at;
      }
      sessionEvents.get(ev.session_id)!.push({
        type: ev.event_type,
        path: ev.path,
        at: ev.created_at,
        sessionId: ev.session_id,
        orderRef: ev.metadata?.shopifyOrderNumber ?? null,
      });
    }

    /* ── Visitors: stitch sessions of the same person ── */
    const byVisitor = new Map<string, VisitorJourney>();
    for (const s of bySession.values()) {
      let v = byVisitor.get(s.visitorKey);
      if (!v) {
        v = {
          visitorKey: s.visitorKey,
          identity: null,
          sessionIds: [],
          events: [],
          firstSeen: s.firstSeen,
          lastSeen: s.lastSeen,
          furthest: s.furthest,
          furthestAt: s.furthestAt,
          builderStartedAt: null,
          purchasedAt: null,
        };
        byVisitor.set(s.visitorKey, v);
      }
      v.sessionIds.push(s.sessionId);
      v.events.push(...(sessionEvents.get(s.sessionId) ?? []));
      if (s.firstSeen < v.firstSeen) v.firstSeen = s.firstSeen;
      if (s.lastSeen > v.lastSeen) v.lastSeen = s.lastSeen;
      if (rank(s.furthest) > rank(v.furthest)) {
        v.furthest = s.furthest;
        v.furthestAt = s.furthestAt;
      }
      // Identity: a direct hit on this session, else anything known for the visitor
      const sessionIdentity = identityBySession.get(s.sessionId) ?? null;
      const visitorIdentity = identityByVisitor.get(s.visitorKey) ?? null;
      v.identity = mergeIdentity(mergeIdentity(v.identity, sessionIdentity), visitorIdentity);
    }
    for (const v of byVisitor.values()) {
      v.events.sort((a, b) => a.at.localeCompare(b.at));
      v.builderStartedAt =
        v.events.find((e) => e.path === "/builder" || e.type.startsWith("builder_"))?.at ?? null;
      v.purchasedAt = v.events.find((e) => e.type === "purchase")?.at ?? null;
      // A purchase without a captured identity still tells us the order
      if (!v.identity?.orderRef) {
        const ref = v.events.find((e) => e.type === "purchase")?.orderRef ?? null;
        if (ref) v.identity = mergeIdentity(v.identity, { name: null, email: null, orderRef: ref });
      }
      for (const sid of v.sessionIds) {
        const s = bySession.get(sid);
        if (s) s.identity = v.identity;
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
    setVisitors(byVisitor);
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

  return { sessions, visitors, builds, dropOff, loading };
}
