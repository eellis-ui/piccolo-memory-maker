# Herbert & Ellis — website

Static site for [herbertandellis.com](https://www.herbertandellis.com). No build step: plain HTML, one shared
stylesheet and one shared script.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Homepage |
| `lead-generation/index.html` | Lead generation page, served at `/lead-generation/` |
| `finance-form/index.html` | Property finance client form, served at `/finance-form/` |
| `finance-form/thanks/index.html` | Where the finance form lands after sending |
| `assets/site.css` | Shared design system: colours, type, buttons, stickers, phone carousel, cards, panels |
| `assets/site.js` | Shared behaviour: nav, giant-word letters, phone carousel, reveals, sticky "Get leads" button |

## Look and feel

Bold and warm, but grown-up. Inspired by Bandi's phones, Writ Large's cards, twoplusone's "Hello!" panel and the
Wade & Leta palette.

- **Colours:** cream `#F5EFE6` ground, ink `#16151F`, orange `#FF5B1F` as the lead colour, cobalt `#2D3BD6` as the
  one strong second colour, with sand `#E6DCCB`, dusty sky `#C3DAE6` and clay `#E4B8A3` in support. All are CSS
  variables at the top of `assets/site.css`. (The variable names `--lilac`, `--lime` and `--pink` now hold cobalt,
  sand and clay.)
- **Type:** Bricolage Grotesque throughout. The giant words use it at its heaviest and most condensed.
- **Shapes:** rounded corners, pill buttons, straight outline tags, colour cards with a notched arrow corner.
  Motion is limited to letters rising in, cards lifting on hover, and the phone carousel.

## Company logos

The "H&E family" cards on both pages swap the company name for its logo when one exists at `assets/logos/<name>.png`:
`the-lounge.png`, `knock-and-snitch.png`, `piccoload.png`, `tt-massive-marketing.png`, `musefile.png`.
Until a file is there, the card simply shows the name.

## The phone carousel

Both heroes have a giant word with three phones in front, each showing a different service. The giant word changes
with the phone, sliding in from the side the visitor moved towards and pushing the old word out the other side.
Both pages use the same six, in order: LEADS, AUTOMATIONS, INVEST, CONSULT, BUILD, GROWTH. Each phone sets its word with `data-word`; long words shrink to fit on one line.
Under the phones, a row of slim progress lines shows which phone is up and fills while it waits to turn. They rotate on their
own every few seconds and pause on hover. Visitors can click the side phones, use the arrows, tap a progress line,
swipe or drag, scroll sideways on a trackpad, or use the arrow keys.

The phones are built in HTML and CSS, so there are no images to manage. To change what a phone shows, edit the
screens in the page: each phone is a `.phone` element with `data-title` (its accessible name) and `data-word` (the giant word).

## Lead generation page

Hero carousel, the quote band, the meetings calculator, the Google and Meta funnel, the "MORE LEADS?" contact push,
the portfolio and the "Hello!" form. Goal picks and the calculator pre-fill the form.

## Going live (Cloudflare Pages)

Upload the whole `herbertandellis/` folder (or the zip of it) as the Pages project for www.herbertandellis.com.
Everything is static: no build step. Alongside the two pages it ships `404.html`, `robots.txt`, `sitemap.xml`,
`og-image.png` (the 1200x630 link-share image) and `logo.png` (used in the structured data).

After the first deploy, submit the sitemap in Google Search Console: `https://www.herbertandellis.com/sitemap.xml`.

## Enquiries

The lead-generation form posts to FormSubmit (`https://formsubmit.co/ajax/hello@herbertandellis.com`), which
emails each enquiry to hello@herbertandellis.com with the visitor's email as the reply-to address. The first
submission after going live sends an activation email to that inbox; click the link in it once and every
enquiry after that is delivered. If the service is ever unreachable, the form opens the visitor's own email
app with the enquiry filled in, addressed to hello@herbertandellis.com, so nothing is lost. To use a different
service, change `data-endpoint` on the form in `lead-generation/index.html`.

## Property finance form

`/finance-form/` is the web version of the client information form, covering bridging (residential and
commercial), refurbishment (light, medium or heavy; residential, HMO or commercial-to-residential conversion),
development and part-complete development (pre or post wind and watertight). Only the follow-up answers for the
chosen type are sent. It is
kept out of search results (`noindex`) and out of the sitemap, since it is sent to clients by link. It posts
straight to FormSubmit (`https://formsubmit.co/hello@herbertandellis.com`) as a normal form post, which lets
clients attach their documents, up to 10 MB in total; the email's reply-to is the client's address. Before
sending, the page turns the construction team, unit breakdown and document checklist into a few tidy lines
and leaves empty boxes out. FormSubmit then returns the client to `/finance-form/thanks/`. What a client types
is kept in their own browser until they send, so they can come back to it; attached files are not kept.
