# Deployment

## Three independent pipelines

This project does not deploy as one unit. Three separate things ship on three
separate paths, and confusing them wastes a lot of time.

| Layer | Where it runs | How it deploys | Status |
|---|---|---|---|
| **Frontend** (Vite/React static build) | Cloudflare Worker `piccoload` (static assets) | CI deploys on push to `main` once Cloudflare secrets are set | ⚠️ see below |
| **Backend** (edge functions) | Supabase `msvcchcmxyghvpfscsmy` | pushed directly to Supabase | ✅ current |
| **Checkout** | Shopify `piccaload.myshopify.com` | configured in Shopify admin | ✅ current |

The important consequence: **merging to `main` does not deploy the website.**
Nothing in this repo builds or ships the frontend. Backend edge functions, by
contrast, deploy straight to Supabase and have been kept current — which is
why order tracking works perfectly while the site itself is months behind.

## Check what is actually live

```bash
npm run verify:deploy
```

Probes production and reports, per marker, what is and is not deployed.
Exits non-zero when production is behind `main`. The
`Verify production is live` GitHub workflow runs it daily and on demand.

A failure means *the code is correct but has not been deployed*. It does not
mean the code is broken.

## The unresolved problem

As of July 2026, production was serving a build from mid-May — roughly 17
commits behind `main`. Missing: branded OG/social preview image, corrupt
product thumbnail fix, Meta Pixel funnel events (`AddToCart`,
`InitiateCheckout`), legacy Shopify URL redirects, redesigned admin panel,
live analytics dashboard.

Order flow, checkout, and Shopify variant IDs were verified working
throughout — the stale build does not break commerce.

### RESOLVED (25 Aug 2026): the host is a Cloudflare Worker

The Cloudflare account contains a Worker named **`piccoload`** (static
assets, no server script) — that is what serves piccoload.com. `wrangler.jsonc`
in the repo root now targets it, and `.github/workflows/ci.yml` has a deploy
job that uploads the build on every push to `main`.

The deploy job skips (with a warning) until two repo secrets are added:
`CLOUDFLARE_API_TOKEN` (Cloudflare dashboard → My Profile → API Tokens,
"Edit Cloudflare Workers" template) and `CLOUDFLARE_ACCOUNT_ID`.

**Before the first CI deploy, reconcile with Lovable.** Production is
currently serving a build *newer than this repo* — published from Lovable
around 24 Aug 2026 evening, containing at least a staff "Order desk" page
(`AdminDashboard`), builder-step analytics events, and AI-placeholder
Instagram images, none of which were ever committed to git (the Lovable →
GitHub sync appears broken). Deploying from this repo will overwrite that
build; port anything worth keeping into the repo first, or accept losing it.

## Known issue

~~`www.piccoload.com` does not resolve~~ — fixed; `www` returns 200 as of
25 Aug 2026.

## Gotchas when investigating a build

Learned the hard way; ignoring these produces confidently wrong conclusions.

- **Only string literals survive minification.** Identifiers — hook names,
  function names, variables — are renamed by the minifier, so their absence
  from a bundle proves nothing. Fingerprint builds using string literals,
  HTML meta tags, or static asset paths only.
- **A build emits several `index-*.js` chunks.** Only the one loaded by the
  `<script type="module">` tag is the entry bundle. Globbing `index-*.js` and
  taking the first match picks the wrong file.
- **Cloudflare caches HTML aggressively** and its cache key here ignores query
  strings, so `?cachebust=123` still returns `cf-cache-status: HIT`. To test
  the origin rather than the cache, probe static asset paths — a file added in
  a recent commit returning `text/html` (the SPA fallback) means that build is
  not deployed.
- **Edge functions are not part of the frontend build.** Check them with
  Supabase tooling, not by inspecting the site.
