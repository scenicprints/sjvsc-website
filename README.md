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
index.html, *.html        the public pages
admin.html                admin home
admin-events.html         the events screen
assets/css/site.css       the public design system
assets/css/admin.css      the admin side, larger and plainer
assets/js/events-data.js  the event list: admin writes it, public pages read it
assets/js/site.js         navigation, scroll, timeline, public event lists
assets/js/admin*.js       the admin screens
assets/js/quote.js        the hall rental quote engine
assets/img/               23 of the club's photographs, and 26 cantonal arms
tools/stamp-assets.py     run after any CSS or JS change
docs/                     research and notes
```

Events live in one list that the admin screen writes and the public pages read, so a
change in the admin is the change a visitor sees. Rental rates are written as data at
the top of `quote.js`, standing in for the rate card editor a real build would have.
Figures on the rentals page are placeholders; the club sets the real ones.

The admin is at [/admin.html](https://scenicprints.github.io/sjvsc-website/admin.html).
It is not linked from the public site and has no sign-in yet.

## Running it locally

```bash
git clone https://github.com/scenicprints/sjvsc-website.git
cd sjvsc-website
python -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` straight from disk mostly works,
but a server is closer to how it is hosted.

## After changing any CSS or JavaScript

```bash
python tools/stamp-assets.py
```

GitHub Pages serves assets with `Cache-Control: max-age=600`, so for ten minutes after a
push a visitor can be handed the new HTML with the old script. When the two disagree the
page breaks on load. The tool puts a hash of each file into its URL, so a page can only
ask for the file it was built against. Run it before committing, and commit what it
changes.
