import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE = "https://piccoload.com";
// Internal previews must never compete with the real pages in search
const NOINDEX_PATHS = new Set(["/pricing-v2"]);

/**
 * Per-route head tags an SPA otherwise never sets: a canonical URL for every
 * page, and noindex on internal preview routes.
 */
const RouteMeta = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname === "/" ? "/" : location.pathname.replace(/\/$/, "");

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${SITE}${path === "/" ? "" : path}`;

    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"][data-route-meta]');
    if (NOINDEX_PATHS.has(path)) {
      if (!robots) {
        robots = document.createElement("meta");
        robots.name = "robots";
        robots.dataset.routeMeta = "true";
        document.head.appendChild(robots);
      }
      robots.content = "noindex, nofollow";
    } else if (robots) {
      robots.remove();
    }
  }, [location.pathname]);

  return null;
};

export default RouteMeta;
