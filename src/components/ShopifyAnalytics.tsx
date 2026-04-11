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

export default function ShopifyAnalytics() {
  // Set _shopify_y (permanent visitor ID) and _shopify_s (session ID) cookies
  // These are required for Shopify to recognise unique visitors and sessions
  useShopifyCookies({ hasUserConsent: true });

  const location = useLocation();
  const prevPath = useRef(location.pathname);

  // Send page view on every route change
  useEffect(() => {
    // Small delay to let the page title update before we capture it
    const timer = setTimeout(() => {
      trackPageView();
    }, 100);
    prevPath.current = location.pathname;
    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null; // Invisible — only side effects
}
