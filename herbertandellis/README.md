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

## Lead generation page — what's interactive

1. **Targeting radar hero.** Prospects drift across the hero. The cursor is a spotlight; only prospects that fit the
   ideal customer light up. Click and they fly into the diamond and count as booked. Auto-sweeps on touch devices.
2. **Pipeline calculator.** Deal value, win rate and meetings per month give pipeline, revenue and value per meeting,
   plus how many people need reaching at editable reply and conversion assumptions.
3. **Targeting brief builder.** Pick decision makers, sectors, size, region and buying signals. A brief types itself
   out with a focus meter. "Send this brief" drops it and the calculator numbers into the enquiry form.
4. **Sequence player.** A 20-day multichannel sequence. Toggle email, LinkedIn, WhatsApp and SMS, press play, or click a
   touchpoint to read an example message.
5. **Google Ads + Meta funnel.** Six stages from ad to retargeting. Switch between "Ads only", where visitors leak
   out at every unbuilt stage, and "The whole funnel", where a retargeting net catches drop-offs and brings them back.
   Click a stage for what we build and what goes wrong without it.
6. **"Want more leads?"** A full-width coral section pushing visitors to get in touch. Picking "More meetings",
   "More sales" or "Both" pre-fills the form and jumps to it. A sticky "Get leads" button follows visitors down the page,
   and the calculator has its own "Get me these meetings" button that carries the numbers over.
7. **Process cards.** Five stages as the homepage's swipe cards, with drag, arrows and a progress bar.
8. **What's included.** A hover grid of everything in the funnel.
9. **Portfolio.** The homepage's portfolio cards, with TT Prospecting and TT Commerce tagged as the platforms behind the work.
10. FAQ, the "WE DON'T CHASE LEADS." manifesto, and the audit form.

## The audit form

With no configuration it opens the visitor's email app with the enquiry pre-filled to `hello@herbertandellis.com`.
To collect submissions through a form service or Worker, set `data-endpoint` on `<form id="auditForm">`; the page will
POST JSON with `name`, `company`, `email`, `website`, `brief` and `source`.

## Deploying

Upload the folder to the web root so the new page lives at `/lead-generation/`. The nav on both pages uses relative
links (`lead-generation/` and `../`), so it works on any host that serves `index.html` for a folder path.
