# Herbert & Ellis — website

Single-page marketing site for [herbertandellis.com](https://www.herbertandellis.com). It is a self-contained static
page: one `index.html` with inline CSS and JavaScript, Google Fonts (Fraunces + Archivo) and no build step.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole site: nav, hero, services, lead generation, portfolio, approach, contact form, footer |
| `logo-on-dark.svg` / `logo-on-light.svg` | Full lockup (seal + wordmark + strapline), outlined so it needs no fonts |
| `logo-mark.svg` / `logo-mark-dark-on-light.svg` | The ampersand seal on its own, for favicons, avatars and stamps |

## Identity

- **Palette** — deep green ink `#0c1512`, ivory `#f2ede3`, antique brass `#c9a35a` (deeper `#8f6d2f` on ivory), sage
  grey for secondary text. Defined once as CSS custom properties at the top of `index.html`.
- **Type** — Fraunces (display, italic accents) and Archivo (text and labels). Both load from Google Fonts with
  system fallbacks.
- **Logo** — the Fraunces italic ampersand inside a double ring, paired with a tracked, semi-expanded wordmark.
  The `&` is the mark: it stands for the partnership and reads at favicon size.

## Sections

1. Hero with the founding year, company count, sector count and discipline count
2. Services accordion: Investment, Marketing, Consultancy, Lead Generation (tagged "New")
3. Lead generation: stage-by-stage pipeline, five-step engagement, what's included, and the "built on our own stack"
   panel linking TT Prospecting and TT Commerce
4. Portfolio bento with all six operating companies
5. Approach: four operating principles
6. Contact: enquiry form plus direct email

## The enquiry form

Out of the box the form opens the visitor's email app with the enquiry pre-filled and addressed to
`hello@herbertandellis.com`, so it works with no backend.

To send submissions to a form service instead (Formspree, Basin, a Cloudflare Worker, Zapier webhook), set the
`data-endpoint` attribute on the `<form id="enquiry">` element to the endpoint URL. The page will `POST` JSON with
`name`, `company`, `email`, `interest`, `revenue`, `message` and `source`. The hidden `website` field is a honeypot
and should stay empty.

## Deploying

Any static host works. The simplest options:

- **Cloudflare Pages / Workers static assets** — point the project at this folder and deploy. Match the existing
  `wrangler.jsonc` pattern in the repo root if you want CI to do it.
- **Netlify / Vercel** — drag the folder in, or connect the repo with this folder as the publish directory.
- **Existing host** — upload `index.html` and the four SVGs to the web root.

Before going live, also add an `og-image.svg` (or `.png`, 1200×630) at the web root; the meta tags already point to
`https://www.herbertandellis.com/og-image.svg`.

## Editing

Everything is in `index.html`. Copy is plain HTML, colours and type are CSS variables in the `:root` block, and the
JavaScript at the bottom handles the nav, mobile menu, scroll reveals, services accordion, custom cursor and form.
