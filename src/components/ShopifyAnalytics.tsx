/**
 * ShopifyAnalytics component
 *
 * Drop into the app tree inside <BrowserRouter> to automatically:
 * 1. Set Shopify visitor/session cookies (_shopify_y, _shopify_s)
 * 2. Send PAGE_VIEW events to Shopify on every route change
 *
 * This feeds the Shopify Admin Analytics dashboard with:
 * - Total sessions & visitors
 * - Returning customer rate
 * - Live visitors on store
 * - Top pages by session
 * - Conversion funnel (sessions → add-to-cart → checkout → orders)
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useShopifyCookies } from "@shopify/hydrogen-react";
import { trackPageView } from "@/lib/shopify-analytics";
import { trackEvent } from "@/lib/analytics-tracker";
import { metaPageView } from "@/lib/meta-pixel";
import { useVisitorPresence } from "@/hooks/use-live-visitors";

export default function ShopifyAnalytics() {
  // Set _shopify_y (permanent visitor ID) and _shopify_s (session ID) cookies
  useShopifyCookies({ hasUserConsent: true });

  // Track presence for live visitor counter in Admin
  useVisitorPresence();

  const location = useLocation();
  const prevPath = useRef(location.pathname);
  const isInitialLoad = useRef(true);

  // Send page view on every route change
  useEffect(() => {
    const timer = setTimeout(() => {
      trackPageView(); // Shopify Monorail
      trackEvent("page_view", location.pathname); // Our analytics
      // Meta Pixel: index.html already fired PageView for the initial load,
      // so only fire on subsequent SPA route changes
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
      } else {
        metaPageView();
      }
    }, 100);
    prevPath.current = location.pathname;
    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
}
