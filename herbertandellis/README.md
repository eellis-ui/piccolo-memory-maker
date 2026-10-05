# Herbert & Ellis — website

Static site for [herbertandellis.com](https://www.herbertandellis.com). No build step: plain HTML, one shared
stylesheet and one shared script.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Homepage |
| `lead-generation/index.html` | Lead generation page, served at `/lead-generation/` |
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
the portfolio, FAQ, and the "Hello!" form. Goal picks and the calculator pre-fill the form.

## The form

With no configuration it opens the visitor's email app pre-filled to `hello@herbertandellis.com`. To collect
submissions through a form service or Worker, set `data-endpoint` on `<form id="auditForm">`; the page POSTs JSON
with `name`, `company`, `email`, `website`, `brief` and `source`.

## Deploying

Upload the whole folder to the web root, keeping `assets/` and `lead-generation/` as folders.
