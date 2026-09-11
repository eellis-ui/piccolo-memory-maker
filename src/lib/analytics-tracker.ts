/**
 * Analytics event tracker — fires lightweight events to Supabase
 * for the admin live dashboard (funnel: views → cart → checkout → purchase).
 *
 * Events are insert-only into analytics_events table.
 * The session_id links events from the same browser session.
 */
import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEvent =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "checkout_initiated"
  | "purchase"
  // Builder progress — one event per step the visitor reaches
  | "builder_upload"
  | "builder_approve"
  | "builder_cover"
  | "builder_convert"
  // Visitor saved their email in the builder ("save your book")
  | "email_saved";

const OPT_OUT_KEY = "_analytics_optout";

/**
 * Team browsers are never analytics subjects. The flag is set the first time
 * a browser opens the admin as an admin, and from then on nothing that
 * browser does on the storefront is tracked (events, Shopify analytics,
 * Meta pixel, live presence). Admin routes themselves are never tracked.
 */
export function setAnalyticsOptOut(): void {
  try { localStorage.setItem(OPT_OUT_KEY, "1"); } catch { /* storage unavailable */ }
}

export function isAnalyticsOptedOut(): boolean {
  try {
    if (localStorage.getItem(OPT_OUT_KEY)) return true;
  } catch { /* storage unavailable */ }
  return typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
}

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch { /* fall through */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Per-tab session: a new one for every tab/visit. */
export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem("_analytics_session");
    if (!id) {
      id = newId();
      sessionStorage.setItem("_analytics_session", id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

/**
 * Persistent visitor: survives tabs and return visits on the same browser,
 * so the admin can stitch every session of one person into a single journey.
 */
export function getVisitorId(): string {
  try {
    let id = localStorage.getItem("_analytics_visitor");
    if (!id) {
      id = newId();
      localStorage.setItem("_analytics_visitor", id);
    }
    return id;
  } catch {
    return getSessionId();
  }
}

/**
 * Fire an analytics event. Non-blocking — errors are silently swallowed
 * so analytics never breaks the user experience.
 */
export function trackEvent(
  eventType: AnalyticsEvent,
  path?: string,
  metadata?: Record<string, unknown>
) {
  if (isAnalyticsOptedOut()) return;
  try {
    supabase
      .from("analytics_events")
      .insert({
        event_type: eventType,
        session_id: getSessionId(),
        visitor_id: getVisitorId(),
        path: path || window.location.pathname,
        metadata: metadata || {},
      })
      .then(({ error }) => {
        if (error) console.warn("[Analytics]", error.message);
      });
  } catch {
    // Never break the app for analytics
  }
}
