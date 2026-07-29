#!/usr/bin/env node
/**
 * Verify what is actually deployed at piccoload.com.
 *
 * The frontend is a static build served by a host that is NOT wired to
 * GitHub — pushing to main does not deploy. This script answers the question
 * "is it actually live?" with evidence instead of assumption.
 *
 *   npm run verify:deploy
 *
 * Exits 1 if production is behind main, so CI can flag drift.
 *
 * ── Why the checks look the way they do ──
 * Only STRING LITERALS survive minification. Identifiers (function names,
 * hook names, variables) are renamed by the minifier, so their absence from
 * the bundle proves nothing. Every marker below is a string literal, an HTML
 * meta tag, or a static asset path. Do not add identifier-based checks.
 */

const SITE = process.env.VERIFY_SITE ?? "https://piccoload.com";

// Static assets: [path, expected content-type prefix, what it tells us]
const ASSETS = [
  ["/images/og-image.jpg", "image/", "branded social preview image (15 Jul)"],
  ["/images/product-thumb.webp", "image/", "corrupt-thumbnail fix (14 Jul)"],
];

// HTML <head> assertions: [label, predicate, meaning]
const HTML_CHECKS = [
  [
    "og:image is Piccoload's, not Lovable's",
    (h) => /og:image"\s+content="https:\/\/piccoload\.com/.test(h) && !h.includes("lovable.dev"),
    "link previews in iMessage/WhatsApp/Instagram",
  ],
  [
    "twitter:site is not @Lovable",
    (h) => !/twitter:site"\s+content="@Lovable"/.test(h),
    "Twitter/X card attribution",
  ],
  [
    "Meta Pixel present",
    (h) => h.includes("1809702712963152"),
    "base pixel tracking",
  ],
];

// Bundle assertions: [label, predicate, meaning]
const BUNDLE_CHECKS = [
  [
    "Meta Pixel funnel events wired",
    (b) => b.includes("InitiateCheckout") && b.includes("AddToCart"),
    "ad optimisation + conversion attribution",
  ],
  [
    "legacy Shopify URL redirects",
    (b) => b.includes("/collections/"),
    "old /products/ and /collections/ links resolve",
  ],
  [
    "old lovable-uploads asset path gone",
    (b) => !b.includes("lovable-uploads"),
    "cart thumbnails use current images",
  ],
  [
    "current Shopify bundle variant IDs",
    (b) =>
      b.includes("57146362364277") &&
      b.includes("57146362397045") &&
      b.includes("57146362429813") &&
      !b.includes("55768994742645"),
    "checkout sends variants that still exist in Shopify",
  ],
  [
    "correct Supabase project",
    (b) => b.includes("msvcchcmxyghvpfscsmy.supabase.co"),
    "frontend talks to the piccoload backend",
  ],
];

const ok = (s) => `\x1b[32m✓\x1b[0m ${s}`;
const bad = (s) => `\x1b[31m✗\x1b[0m ${s}`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

async function main() {
  console.log(`\nVerifying deployment at ${SITE}\n${"─".repeat(60)}`);

  const res = await fetch(`${SITE}/?verify=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  if (!res.ok) {
    console.error(bad(`Site unreachable: HTTP ${res.status}`));
    process.exit(1);
  }
  const html = await res.text();

  // A build emits several index-*.js chunks. Only the one loaded by the
  // module script tag is the entry bundle — match that specifically rather
  // than the first path that happens to appear in the HTML.
  const bundlePath =
    html.match(
      /<script[^>]+type="module"[^>]+src="(\/assets\/index-[A-Za-z0-9_-]+\.js)"/,
    )?.[1] ?? html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
  if (!bundlePath) {
    console.error(bad("Could not find JS bundle in HTML — unexpected page shape"));
    process.exit(1);
  }
  const bundle = await (await fetch(`${SITE}${bundlePath}`)).text();

  console.log(dim(`bundle: ${bundlePath}  (${bundle.length.toLocaleString()} bytes)\n`));

  const failures = [];

  console.log("HTML");
  for (const [label, fn, meaning] of HTML_CHECKS) {
    const pass = fn(html);
    console.log(`  ${pass ? ok(label) : bad(label)}`);
    if (!pass) failures.push(`${label} — affects ${meaning}`);
  }

  console.log("\nStatic assets");
  for (const [path, expect, meaning] of ASSETS) {
    let type = "";
    try {
      type = (await fetch(`${SITE}${path}`, { method: "HEAD" })).headers.get("content-type") ?? "";
    } catch { /* treated as missing below */ }
    const pass = type.startsWith(expect);
    console.log(`  ${pass ? ok(path) : bad(`${path} ${dim(`→ ${type || "unreachable"}`)}`)}`);
    if (!pass) failures.push(`${path} missing — ${meaning}`);
  }

  console.log("\nBundle");
  for (const [label, fn, meaning] of BUNDLE_CHECKS) {
    const pass = fn(bundle);
    console.log(`  ${pass ? ok(label) : bad(label)}`);
    if (!pass) failures.push(`${label} — affects ${meaning}`);
  }

  console.log("─".repeat(60));
  if (failures.length === 0) {
    console.log(ok("Production matches main. Everything is live.\n"));
    process.exit(0);
  }

  console.log(bad(`Production is BEHIND main — ${failures.length} check(s) failed:\n`));
  for (const f of failures) console.log(`   • ${f}`);
  console.log(
    `\n${dim("The frontend host is not wired to GitHub, so merging to main does")}`,
  );
  console.log(`${dim("not deploy. A build must be triggered on the host.")}\n`);
  process.exit(1);
}

main().catch((e) => {
  console.error(bad(`verify-deploy failed: ${e.message}`));
  process.exit(1);
});
