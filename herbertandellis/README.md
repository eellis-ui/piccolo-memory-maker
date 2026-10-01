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

## The phone carousel

Both heroes have a giant word with three phones in front, each showing a different service. They rotate on their
own every few seconds and pause on hover. Visitors can click the side phones, use the arrows, tap a service pill,
swipe or drag, scroll sideways on a trackpad, or use the arrow keys.

The phones are built in HTML and CSS, so there are no images to manage. To change what a phone shows, edit the
screens in the page: each phone is a `.phone` element with `data-title` and `data-line` for its caption.

## Lead generation page

Hero carousel, the meetings calculator, the targeting brief builder, the outreach sequence cards, the Google and
Meta funnel, the "MORE LEADS?" contact push, five steps, what's included, the portfolio, FAQ, and the "Hello!" form.
Goal picks, the brief builder and the calculator all pre-fill the form.

## The form

With no configuration it opens the visitor's email app pre-filled to `hello@herbertandellis.com`. To collect
submissions through a form service or Worker, set `data-endpoint` on `<form id="auditForm">`; the page POSTs JSON
with `name`, `company`, `email`, `website`, `brief` and `source`.

## Deploying

Upload the whole folder to the web root, keeping `assets/` and `lead-generation/` as folders.
