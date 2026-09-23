# Herbert & Ellis — website

Static site for [herbertandellis.com](https://www.herbertandellis.com), in the live brand: white, black `#1a1a1a`,
coral `#e8501e` and orange `#d4461a`, heavy uppercase system type, film grain, crosshair cursor with coral trail.

No build step. Every page is one self-contained HTML file with inline CSS and JavaScript.

## Pages

| Path | What it is |
| --- | --- |
| `index.html` | The live homepage, unchanged except for two additions: a fixed nav, and a fourth "Lead Generation" swipe card linking to the new page |
| `lead-generation/index.html` | New lead generation page, served at `/lead-generation/` |
| `concepts/green-brass-redesign/` | An earlier full redesign concept in a different identity. Not linked from anywhere; kept for reference only |

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
6. **Process cards.** Five stages as the homepage's swipe cards, with drag, arrows and a progress bar.
7. **Stack.** TT Prospecting and TT Commerce cards with 3D tilt, plus a hover grid of what's included.
8. FAQ, the "WE DON'T CHASE LEADS." manifesto, and the audit form.

## The audit form

With no configuration it opens the visitor's email app with the enquiry pre-filled to `hello@herbertandellis.com`.
To collect submissions through a form service or Worker, set `data-endpoint` on `<form id="auditForm">`; the page will
POST JSON with `name`, `company`, `email`, `website`, `brief` and `source`.

## Deploying

Upload the folder to the web root so the new page lives at `/lead-generation/`. The nav on both pages uses relative
links (`lead-generation/` and `../`), so it works on any host that serves `index.html` for a folder path.
