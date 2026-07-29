# Deployment

## Three independent pipelines

This project does not deploy as one unit. Three separate things ship on three
separate paths, and confusing them wastes a lot of time.

| Layer | Where it runs | How it deploys | Status |
|---|---|---|---|
| **Frontend** (Vite/React static build) | Cloudflare Worker `piccoload` | `wrangler deploy`, run by hand | ✅ current |
| **Backend** (edge functions) | Supabase `msvcchcmxyghvpfscsmy` | pushed directly to Supabase | ✅ current |
| **Checkout** | Shopify `piccaload.myshopify.com` | configured in Shopify admin | ✅ current |

The important consequence: **merging to `main` does not deploy the website.**
No CI job builds or ships the frontend — a human has to run `wrangler deploy`.
Backend edge functions, by contrast, deploy straight to Supabase and have been
kept current, which is why order tracking kept working through the long
stretch when the site itself was months behind.

## Check what is actually live

```bash
npm run verify:deploy
```

Probes production and reports, per marker, what is and is not deployed.
Exits non-zero when production is behind `main`. The
`Verify production is live` GitHub workflow runs it daily and on demand.

A failure means *the code is correct but has not been deployed*. It does not
mean the code is broken.

## The host

Resolved July 2026. The frontend is a **Cloudflare Worker named `piccoload`**
(account `95c25679…`, zone `piccoload.com` / `f2e8a33f…`). Not Pages — which
is why probing `*.pages.dev` never found a match.

It is a static-assets-only Worker: no `main` entrypoint, no bindings, assets
served directly with `not_found_handling = "single-page-application"`. That
SPA fallback is what makes a missing file return `text/html` instead of 404.

`piccoload.com` and `www.piccoload.com` are both attached as **Workers custom
domains**, which is the mechanism that creates and manages their proxied DNS
records. There is no separate `A`/`CNAME` to hand-maintain for either.

`wrangler.toml` in the repo root reproduces this configuration. To deploy:

```bash
npm ci && npm run build
npx wrangler deploy
npm run verify:deploy
```

### History

Production spent Jun–Jul 2026 serving version 169, deployed 2026-05-12 —
roughly 18 commits behind `main`. Missing: branded OG/social preview image,
corrupt product thumbnail fix, Meta Pixel funnel events (`AddToCart`,
`InitiateCheckout`), legacy Shopify URL redirects, redesigned admin panel.

The cause was mundane: deploys were manual `wrangler` runs from a local
machine, so the site drifted whenever nobody ran one. Order flow, checkout,
and Shopify variant IDs were verified working throughout — the stale build
never broke commerce.

### Automatic deploys

The `deploy` job in `.github/workflows/ci.yml` ships the frontend on every
push to `main`: it builds, runs `wrangler deploy`, then re-runs
`verify:deploy` (retrying briefly, since the edge takes a few seconds to
serve a new version) so a silent no-op deploy cannot pass unnoticed.

It requires two repository secrets:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token with **Account → Workers Scripts → Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | The account owning the `piccoload` Worker |

**Without them the job warns and skips rather than failing**, so CI stays
green — but nothing deploys, and the site will drift again. If you see that
warning on a push to `main`, the secrets are missing.

Deploying by hand still works and is unchanged: `npx wrangler deploy`.

## Resolved: `www.piccoload.com`

`www` used to `NXDOMAIN` — no `A`, no `CNAME` — so anyone typing the prefix
got a browser error. Fixed by attaching `www.piccoload.com` as a second
Workers custom domain on the `piccoload` service, matching how the apex is
wired (and how `internationalconnexions.eu` handles its own `www`).

A plain proxied `CNAME` to the apex is *not* the right fix here. Worker
custom domains bind a specific hostname; a CNAME would resolve but no route
would match `www`, so requests fall through instead of reaching the Worker.
During the ~1 minute the custom domain took to provision, `www` did exactly
that and 301'd to `piccaload.myshopify.com`. That stopped once the binding
went live — but if you ever see `www` redirecting to Shopify again, a broken
hostname binding is the first thing to check.

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
