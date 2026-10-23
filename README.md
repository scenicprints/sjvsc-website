# San Joaquin Valley Swiss Club — concept site

**Live: https://scenicprints.github.io/sjvsc-website/**

A concept website for the San Joaquin Valley Swiss Club of Ripon, California,
founded 1926, built on spec to show the club what their site could be.

Their current site: https://sjvscriponswiss.com/

> **This is a pitch, not a commissioned build.** The club has not asked for it and is
> not involved yet. If they like it, the concept becomes the basis for their real site.

## Start here

| File | What's in it |
|---|---|
| **[HANDOFF.md](HANDOFF.md)** | **Picking this up on another machine: setup, push credentials, and the rules this project runs on. Start here.** |
| [ROADMAP.md](ROADMAP.md) | The living plan: what success means, phases, backlog, decisions. **Read this first.** |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Page map, data model, how the quote engine works |
| [docs/current-site-audit.md](docs/current-site-audit.md) | Everything on the old site: content, contacts, copy errors, what's broken |
| [docs/image-prompts.md](docs/image-prompts.md) | Prompts for generated artwork |

## What the demo has to prove

1. **It looks like a different class of thing.** Theirs is a builder template.
2. **Events can't go stale.** Each event carries an advertising window and removes
   itself. Their homepage led with a September event in late October.
3. **The hall can be quoted online.** The quote builder on
   [the rentals page](https://scenicprints.github.io/sjvsc-website/rentals.html)
   checks the club's own calendar, prices from an editable rate card and applies the
   member discount. Try `2027-09-04` — it refuses the date, because the Championship
   Schwingfest has the hall.

## How it is built

Plain HTML, CSS and JavaScript. No build step, no dependencies, no backend. Served by
GitHub Pages from the root of `main`, so a push is a deploy.

```
index.html, *.html     the fourteen pages
assets/css/site.css    the whole design system
assets/js/site.js      navigation, scroll, timeline
assets/js/quote.js     the hall rental quote engine
assets/img/            seven photographs: six from the old site, one supplied
docs/                  research and notes
```

Rates, events and page copy are written as data rather than baked into the markup,
standing in for the admin screens a real build would have. Figures on the rentals page
are placeholders; the club sets the real ones.

## Running it locally

```bash
git clone https://github.com/scenicprints/sjvsc-website.git
cd sjvsc-website
python -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` straight from disk mostly works,
but a server is closer to how it is hosted.
