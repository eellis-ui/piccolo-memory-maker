# Herbert & Ellis — website

Static site for [herbertandellis.com](https://www.herbertandellis.com), in the live brand: white, black `#1a1a1a`,
coral `#e8501e` and orange `#d4461a`, heavy uppercase system type, film grain, crosshair cursor with coral trail.

No build step. Every page is one self-contained HTML file with inline CSS and JavaScript.

## Pages

| Path | What it is |
| --- | --- |
| `index.html` | The live homepage, unchanged except for three additions: a fixed nav, a fourth "Lead Generation" swipe card, and a coral "Want more leads?" band before the manifesto |
| `lead-generation/index.html` | New lead generation page, served at `/lead-generation/` |

The lead generation page includes the live site's stylesheet verbatim and adds its own rules after it, so shared
elements (hero diagonal, marquee, swipe cards, manifesto, contact heading, cursor) match the homepage exactly.

## Lead generation page — what's on it

Bold and kinetic, in the homepage's own language: big type, solid colour blocks, marquees. Short copy throughout.

1. **Hero.** "PIPELINE, ENGINEERED." Letters lift and turn coral under the cursor; a slot on the coral diagonal
   rotates through "More meetings. More sales. Full calendars…".
2. **The maths.** Deal value, win rate and meetings a month give pipeline, revenue and value per meeting.
3. **Targeting.** Tap who you sell to; a brief types itself out. "Send this brief" carries it into the form.
4. **Outreach.** A row of colour-block message cards (email, LinkedIn, WhatsApp, SMS). Press play and they deal out
   one by one; click any card to read the example message.
5. **Google + Meta.** Six solid colour bars that build themselves into a funnel ending in "Booked or sold". Click a
   stage for what we build.
6. **"Want more leads?"** Full-width coral push to get in touch. Goal picks pre-fill the form. A sticky "Get leads"
   button follows visitors down the page.
7. **Process.** Five swipe cards, one line each.
8. **What's included.** Nine colour tiles.
9. **Portfolio.** The homepage's portfolio cards: "We build and back businesses…".
10. FAQ (four questions), the manifesto, and the audit form.

## The audit form

With no configuration it opens the visitor's email app with the enquiry pre-filled to `hello@herbertandellis.com`.
To collect submissions through a form service or Worker, set `data-endpoint` on `<form id="auditForm">`; the page will
POST JSON with `name`, `company`, `email`, `website`, `brief` and `source`.

## Deploying

Upload the folder to the web root so the new page lives at `/lead-generation/`. The nav on both pages uses relative
links (`lead-generation/` and `../`), so it works on any host that serves `index.html` for a folder path.
