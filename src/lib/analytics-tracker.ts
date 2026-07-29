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
  // Builder funnel. These stopped being fired in the 12 May 2026 build and the
  // gap made the highest-intent part of the funnel invisible: the only way to
  // see where people dropped out was to read orders.builder_step directly.
  | "builder_upload"
  | "builder_convert"
  | "builder_approve"
  | "builder_cover"
  | "builder_checkout";

function getSessionId(): string {
  let id = sessionStorage.getItem("_analytics_session");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("_analytics_session", id);
  }
  return id;
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
  try {
    supabase
      .from("analytics_events")
      .insert({
        event_type: eventType,
        session_id: getSessionId(),
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
