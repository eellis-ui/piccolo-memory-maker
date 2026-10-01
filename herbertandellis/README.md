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

Bold, warm and playful. Inspired by Bandi, Writ Large and twoplusone.

- **Colours:** cream `#FFF5EA` ground, orange `#FF6A33` lead, with lilac `#BBA9FF`, lime `#D9F26B`, sky `#A6D6F2`
  and pink `#FFAFCB` accents, and a soft deep navy `#1F1D36` instead of black. All set as CSS variables at the top
  of `assets/site.css`.
- **Type:** Bagel Fat One for the giant chunky words (HERBERT & ELLIS, LEADS, MORE LEADS?, Hello!), Bricolage
  Grotesque for everything else. Both from Google Fonts.
- **Shapes:** big rounded corners, pill buttons, tilted stickers, colour cards with a notched arrow corner.

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
