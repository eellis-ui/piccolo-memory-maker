# Deployment

## Three independent pipelines

This project does not deploy as one unit. Three separate things ship on three
separate paths, and confusing them wastes a lot of time.

| Layer | Where it runs | How it deploys | Status |
|---|---|---|---|
| **Frontend** (Vite/React static build) | unknown host, behind Cloudflare | **not wired to GitHub** | ⚠️ **stale** |
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

**Update, 24 Aug 2026:** the mid-May backlog has since been deployed —
`npm run verify:deploy` now passes every marker from that era, so production
did catch up. Order flow, checkout and Shopify variant IDs were verified
working throughout.

What has *not* changed is the deploy path: there is still no deploy job in
`.github/workflows/`, so **merging to `main` still does not deploy the
site**. Production caught up because someone triggered a build on the host,
not because anything automated it. Every future change needs that same
manual step until a deploy job exists.

Historical detail: production was serving a build from mid-May — roughly 17
commits behind `main`. Missing: branded OG/social preview image, corrupt
product thumbnail fix, Meta Pixel funnel events (`AddToCart`,
`InitiateCheckout`), legacy Shopify URL redirects, redesigned admin panel,
live analytics dashboard.

### What is known about the host

- Registrar is **GoDaddy**, set to custom nameservers. It holds no records.
- DNS is **Cloudflare** (`kallie.ns.cloudflare.com`, `leif.ns.cloudflare.com`).
- Apex resolves to Cloudflare proxy IPs (`104.21.70.3`, `172.67.217.41`), so
  the origin is masked. Cloudflare flattens root CNAMEs — the real target is
  visible only inside the Cloudflare dashboard.
- No deploy config exists in this repo (no `vercel.json`, `netlify.toml`,
  `wrangler.toml`, `_redirects`, `CNAME`).
- Probed `*.pages.dev`, `*.netlify.app`, `*.vercel.app`, `*.onrender.com` for
  a build matching production's bundle hash — no match.
- Response headers (`cache-control: public, max-age=0, must-revalidate`,
  SPA 404 fallback) are *consistent with* Cloudflare Pages but not conclusive.

### To resolve

1. Cloudflare dashboard → **Workers & Pages** in the sidebar. If a project is
   listed, that is the host; its **Deployments** tab has a redeploy button.
2. Otherwise → **DNS → Records**, and read the `Content` of the apex
   (`piccoload.com` / `@`) record.

Once identified, add a deploy job to `.github/workflows/ci.yml` so pushes to
`main` deploy automatically.

## Known issue

**`www.piccoload.com` does not resolve** — no `A`, no `CNAME`, `NXDOMAIN`.
Anyone typing the `www` prefix gets a browser error. Fix by adding a proxied
`CNAME` for `www` → `piccoload.com` in Cloudflare DNS.

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
