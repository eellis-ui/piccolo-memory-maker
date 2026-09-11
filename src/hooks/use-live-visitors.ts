/**
 * Live visitor tracking via Supabase Realtime Presence
 * + today's funnel stats from analytics_events table.
 *
 * useVisitorPresence()  — call on every page to silently track the visitor
 * useLiveDashboard()    — call in Admin to get real-time count + funnel stats
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { isAnalyticsOptedOut } from "@/lib/analytics-tracker";
import type { RealtimeChannel } from "@supabase/supabase-js";

const CHANNEL_NAME = "piccoload-visitors";

interface VisitorPresence {
  path: string;
  entered_at: string;
}

/* ─────────────────────────────────────────────
   useVisitorPresence — silent tracker for all pages
   ───────────────────────────────────────────── */
export function useVisitorPresence() {
  const location = useLocation();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Team browsers / admin pages don't count as live visitors
    if (isAnalyticsOptedOut()) return;
    const tabId =
      sessionStorage.getItem("_visitor_tab_id") ||
      (() => {
        const id = crypto.randomUUID();
        sessionStorage.setItem("_visitor_tab_id", id);
        return id;
      })();

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: tabId } },
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          path: location.pathname,
          entered_at: new Date().toISOString(),
        } satisfies VisitorPresence);
      }
    });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []); // mount once

  // Update path on route change
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel) return;
    channel.track({
      path: location.pathname,
      entered_at: new Date().toISOString(),
    } satisfies VisitorPresence);
  }, [location.pathname]);
}

/* ─────────────────────────────────────────────
   useLiveDashboard — admin live analytics
   ───────────────────────────────────────────── */
export interface FunnelStats {
  sessions: number;
  productViews: number;
  addToCarts: number;
  checkoutsInitiated: number;
  purchases: number;
}

export interface LiveDashboardData {
  visitorsNow: number;
  byPage: Record<string, number>;
  today: FunnelStats;
  loading: boolean;
}

export function useLiveDashboard(): LiveDashboardData {
  const [visitorsNow, setVisitorsNow] = useState(0);
  const [byPage, setByPage] = useState<Record<string, number>>({});
  const [today, setToday] = useState<FunnelStats>({
    sessions: 0,
    productViews: 0,
    addToCarts: 0,
    checkoutsInitiated: 0,
    purchases: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fetch today's funnel stats from analytics_events
  const fetchTodayStats = useCallback(async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Paged past Supabase's 1,000-row cap so a busy day is never undercounted.
    const { data, error } = await fetchAllRows<{ event_type: string; session_id: string | null; path: string | null; metadata: { test?: boolean; orderTotal?: number } | null }>((from, to) =>
      supabase
        .from("analytics_events")
        .select("event_type, session_id, path, metadata")
        .gte("created_at", startOfDay.toISOString())
        .order("created_at", { ascending: true })
        .range(from, to) as unknown as PromiseLike<{ data: { event_type: string; session_id: string | null; path: string | null; metadata: { test?: boolean; orderTotal?: number } | null }[] | null; error: { message: string } | null }>,
    );

    if (error) {
      console.warn("[LiveDashboard] Failed to fetch stats:", error.message);
      setLoading(false);
      return;
    }

    if (data) {
      // Any session that touched the admin belongs to the team — drop all of it
      const adminSessions = new Set(
        data.filter((r) => r.path?.startsWith("/admin") && r.session_id).map((r) => r.session_id as string),
      );
      const sessionIds = new Set<string>();
      let productViews = 0;
      let addToCarts = 0;
      let checkoutsInitiated = 0;
      let purchases = 0;

      for (const row of data) {
        if (row.session_id && adminSessions.has(row.session_id)) continue;
        if (row.session_id) sessionIds.add(row.session_id);
        switch (row.event_type) {
          case "product_view":
            productViews++;
            break;
          case "add_to_cart":
            addToCarts++;
            break;
          case "checkout_initiated":
            checkoutsInitiated++;
            break;
          case "purchase":
            // Team test orders (100%-off) are flagged, or carry a zero total
            if (!(row.metadata?.test || row.metadata?.orderTotal === 0)) purchases++;
            break;
        }
      }

      setToday({
        sessions: sessionIds.size,
        productViews,
        addToCarts,
        checkoutsInitiated,
        purchases,
      });
    }
    setLoading(false);
  }, []);

  // Presence for live visitor count
  useEffect(() => {
    const channel = supabase.channel(`${CHANNEL_NAME}-admin`, {
      config: { presence: { key: `admin-${crypto.randomUUID()}` } },
    });

    function syncPresence() {
      const state = channel.presenceState<VisitorPresence>();
      let total = 0;
      const pages: Record<string, number> = {};

      for (const key of Object.keys(state)) {
        const presences = state[key];
        for (const p of presences) {
          // Don't count admin observers
          if (key.startsWith("admin-")) continue;
          total++;
          const path = p.path || "/";
          pages[path] = (pages[path] || 0) + 1;
        }
      }

      setVisitorsNow(total);
      setByPage(pages);
    }

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch stats on mount + subscribe to new inserts for live updates
  useEffect(() => {
    fetchTodayStats();

    // Re-fetch every 30 seconds for near-real-time funnel updates
    const interval = setInterval(fetchTodayStats, 30_000);

    // Also listen for real-time inserts on analytics_events. Every pageview
    // site-wide inserts a row, so coalesce bursts into at most one refetch
    // every few seconds instead of a full day-rescan per insert.
    let refetchQueued = false;
    const channel = supabase
      .channel("analytics-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analytics_events" },
        () => {
          if (refetchQueued) return;
          refetchQueued = true;
          setTimeout(() => {
            refetchQueued = false;
            fetchTodayStats();
          }, 5_000);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchTodayStats]);

  return { visitorsNow, byPage, today, loading };
}

/* ─────────────────────────────────────────────
   useBuilderFunnel — how far people get building a book
   (last 7 days, from orders + order_photos — the source
   of truth, not analytics events)
   ───────────────────────────────────────────── */
export interface BuilderFunnelStats {
  buildsStarted: number;
  booksWithPhotos: number;
  photosUploaded: number;
  reachedPreview: number;
  purchased: number;
}

export function useBuilderFunnel(enabled: boolean): BuilderFunnelStats & { loading: boolean } {
  const [stats, setStats] = useState<BuilderFunnelStats>({
    buildsStarted: 0,
    booksWithPhotos: 0,
    photosUploaded: 0,
    reachedPreview: 0,
    purchased: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [ordersRes, photosRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, builder_step, status, is_test")
        .gte("created_at", since),
      supabase
        .from("order_photos")
        .select("order_id")
        .gte("created_at", since),
    ]);

    if (ordersRes.error || photosRes.error) {
      console.warn(
        "[BuilderFunnel] Failed to fetch:",
        ordersRes.error?.message || photosRes.error?.message
      );
      setLoading(false);
      return;
    }

    const orders = (ordersRes.data ?? []) as unknown as {
      id: string;
      builder_step: string | null;
      is_test?: boolean | null;
      status: string;
    }[];
    const photos = (photosRes.data ?? []) as unknown as { order_id: string }[];

    setStats({
      buildsStarted: orders.length,
      booksWithPhotos: new Set(photos.map((p) => p.order_id)).size,
      photosUploaded: photos.length,
      reachedPreview: orders.filter(
        (o) => o.status !== "draft" || o.builder_step === "approve" || o.builder_step === "cover"
      ).length,
      purchased: orders.filter((o) => o.status !== "draft" && !o.is_test).length,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchStats();
    const interval = setInterval(fetchStats, 60_000);
    return () => clearInterval(interval);
  }, [enabled, fetchStats]);

  return { ...stats, loading };
}
