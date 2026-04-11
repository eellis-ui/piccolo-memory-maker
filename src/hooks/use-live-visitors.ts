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

    const { data, error } = await supabase
      .from("analytics_events")
      .select("event_type, session_id")
      .gte("created_at", startOfDay.toISOString());

    if (error) {
      console.warn("[LiveDashboard] Failed to fetch stats:", error.message);
      setLoading(false);
      return;
    }

    if (data) {
      const sessionIds = new Set<string>();
      let productViews = 0;
      let addToCarts = 0;
      let checkoutsInitiated = 0;
      let purchases = 0;

      for (const row of data) {
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
            purchases++;
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

    // Also listen for real-time inserts on analytics_events
    const channel = supabase
      .channel("analytics-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analytics_events" },
        () => {
          // Refresh stats when a new event comes in
          fetchTodayStats();
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
