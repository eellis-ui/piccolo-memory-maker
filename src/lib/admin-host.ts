/**
 * Which hostname the app is being served from.
 *
 * One build serves both the shop and the staff dashboard. Cloudflare points
 * piccoload.com, www.piccoload.com and admin.piccoload.com at the same Worker;
 * the host decides which route tree App renders.
 *
 * This is routing, not a security boundary. Serving the dashboard at the admin
 * host does not by itself grant anything — access is still gated on the admin
 * role, enforced by RLS in Postgres, so a customer who edits their hosts file
 * gains nothing but an empty page.
 */

/** Hosts that serve the staff dashboard instead of the shop. */
const ADMIN_HOSTS = new Set(["admin.piccoload.com", "admin.localhost"]);

export function isAdminHost(hostname: string = window.location.hostname): boolean {
  const host = hostname.toLowerCase().split(":")[0];
  if (ADMIN_HOSTS.has(host)) return true;
  // Covers preview deployments such as admin.piccoload.pages.dev without
  // matching a customer-facing host that merely contains the word.
  return host.startsWith("admin.");
}
