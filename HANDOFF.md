# Continuing this on another machine

**Live:** https://scenicprints.github.io/sjvsc-website/
**Repo:** https://github.com/scenicprints/sjvsc-website (public)
**Admin:** https://scenicprints.github.io/sjvsc-website/admin.html — not linked from
the public site, `noindex`, and not behind a sign-in yet.

## Setup

```bash
git clone https://github.com/scenicprints/sjvsc-website.git
cd sjvsc-website
python -m http.server 8000     # then open http://localhost:8000
```

That is the whole setup. No install, no dependencies, no framework, no build step.

### To push

Cloning needs nothing. Pushing needs credentials once.

**This step is for the human, not the agent — it opens a browser and waits for input.**

```bash
gh auth login
```

Choose **GitHub.com → HTTPS → authenticate in browser**, and say **yes** when it asks
to authenticate Git with your GitHub credentials. That configures the credential
helper, and `git push` works from then on.

No `gh`? Make a fine-grained token at github.com/settings/tokens with
**Contents: read and write** on this repository, and use it as the password when git
prompts.

**A push to `main` is a deploy.** GitHub Pages serves the root of `main`; changes are
live in about a minute.

### After changing any CSS or JavaScript

```bash
python tools/stamp-assets.py
```

Pages serves assets with `Cache-Control: max-age=600`. For ten minutes after a push a
visitor can be handed the new HTML with the old script, and when the two disagree the
page throws on load. This already happened once: a script looking for a form field the
new HTML had dropped took the whole events screen down. The tool puts a hash of each
file into its URL so a page can only ask for the version it was built against. Run it
before committing and commit what it changes.

## Where things are

```
index.html + 27 other *.html   the pages, at the repository root
admin.html                     admin home — one row per thing that can be edited
admin-events.html              the events screen: list, and the add/change form
admin-rentals.html             the hall rental screen: the whole rate card
assets/css/site.css            the public design system
assets/css/admin.css           the admin side, deliberately larger and plainer
assets/js/events-data.js       THE event list — admin writes it, public pages read it
assets/js/rates-data.js        THE rate card — admin writes it, rentals.html reads it
assets/js/site.js              nav, scroll-to-top, timeline, public event lists
assets/js/admin.js             the admin home (only the date is live)
assets/js/admin-events.js      the events screen
assets/js/admin-rentals.js     the hall rental screen
assets/js/quote.js             draws the rate card and prices a date from it
assets/img/                    23 photographs of theirs
assets/img/arms/               26 cantonal arms (public domain, Wikimedia)
docs/current-site-audit.md     everything the old site said — the source of truth
tools/stamp-assets.py          run after any CSS/JS change (see above)
tools/make-artifact-index.py   generates a gitignored artifact-shaped index
ROADMAP.md                     plan, decisions, what is left
ARCHITECTURE.md                page map, data model, how the pieces fit
```

## How the client works, which matters more than the code

1. **Do not build anything that was not explicitly asked for.** Brainstorming gets
   words. Questions get answers. Building without being told to has gone badly every
   single time it has happened.
2. **One thing at a time.** When the subject is events, do not touch hall rental,
   even to add a card that mentions it.
3. **Mock up in the chat first.** Visual ideas described in prose get rejected;
   the same idea drawn gets engaged with. Draw it, agree it, then build it.
4. **Prose gets skimmed.** Several paragraphs of options will be read as noise.
   Short, specific, with a recommendation.
5. **Verify on the live site, not locally.** The answer to "it is broken" is usually
   measurement, not argument — but check before saying so.

## Rules the site runs on

1. **Never invent a fact about the club.** Everything verifiable lives in
   `docs/current-site-audit.md`. Earlier drafts invented a capacity, a maple floor, a
   stage, a commercial range, a curfew and a dairy-farming origin story. All removed.
2. **Stay close to their own wording.** An earlier pass rewrote their sentences into
   a different voice and had to be redone against the originals. Some creative liberty
   is fine; a rewrite is not.
3. **Standing pages carry no dates.** The page says what a thing is; the calendar says
   when it next happens. Recurring patterns ("the last Saturday in July") may stay.
   Their current site reads "due 31 July 2021" precisely because pages carry dates.
4. **Write plainly.** No sentence fragments for rhythm, no lists of three for cadence,
   no scene-setting.
5. **Show, do not tell.** Nothing on a public page explains how the site works.
6. **No build step.** No framework, no bundler, no dependencies.
7. **Mobile is a scaled replica of desktop.** Chrome may differ — a hamburger is fine —
   but content layouts should be the same thing, rearranged, not a different thing.
8. **Keep `prefers-reduced-motion` working.**

## The top navigation is fixed

**Calendar, Hall Rental, Membership, Contact.** Four items. Everything else is reached
from the index on the home page. Do not add a fifth.

## Two pieces worth understanding before touching them

**The home page index.** Fifteen destinations in ruled columns, sized by column *width*
rather than count, so the browser fits as many as there is room for — five of three
rows at page width, two columns on a phone. Numbered 01–15. It replaced a grid of photo
cards. It has no readout, no descriptions and no images by explicit instruction.

**The events data.** `assets/js/events-data.js` holds one list. `admin-events.html`
writes it; `index.html` and `events.html` read it. An event shows only while today sits
inside its advertising window (`from`…`until`), and `until` is computed as the day after
the event — that is the mechanism that stops the site going stale. Edits live in
`localStorage`, so they are per-browser; the real version would write to the club's
account behind the same screens. The rows already in the markup are the no-script
fallback.

**Availability.** There is no availability list. An event ties the hall up the day
before, the day of, and the day after — setting up, the event, clearing away — and
`SJVSC.blocks(date)` on the events store is the whole rule. It reads the event's own
day, not its advertising window, so an event that has stopped showing still holds its
dates until it has passed. The refusal says only that the day is not available and
never why, and it offers the nearest open days of the same weekday.

**The rate card.** `assets/js/rates-data.js` holds four lists the club writes itself:
kinds of day, things to rent, extras and rules. The price grid is spaces x days, so
adding a column widens it. Three things carry a meaning the engine reads: a kind of day
carries the weekdays it covers, which is how a date finds its column, and a
weekday belongs to exactly one of them — ticking it on one row takes it off the
others, because otherwise a row can hold prices nothing will ever charge; an extra carries
`when` (the renter ticks it, always, or when alcohol is served); a rule carries `does`
(only printed, hours included, each hour after that, members take off). A rule set to
only printed appears on the rate card and in the estimate and changes no arithmetic,
which is where the two deposits live. Nothing about the card is hardcoded anywhere
else — `rentals.html` has empty tables and an empty space list that `quote.js` fills.

## Implementation notes

- `index.html` is a standalone document because Pages serves it directly.
- Inside the timeline's scroll container, `scroll-snap`, CSS `scroll-behavior` and
  `scrollTo({behavior:'smooth'})` all fail, and `requestAnimationFrame` does not run in
  a minimised window. The timeline eases by hand with a timer that guarantees it lands.
- Dates are formatted from explicit month and weekday arrays, not
  `toLocaleDateString` — one engine returns "Saturday, 7 November" with a comma.
- `site.css` styles `.field label` as a small uppercase caption for the quote form.
  `admin.css` restates every one of those properties; drop one and the admin labels go
  back to shouting.
- Watch CSS specificity when toggling with `display`. `.swmap svg{display:block}` beat
  `.swnarrow{display:none}` and rendered both maps at once; `.abody>span{display:block}`
  beat `.atag{display:inline-block}`. Scope the toggle to match.

## Verified facts worth not re-deriving

- The Venmo handle **@Ripon-Swiss-Club** is real; `assets/img/venmo-qr.svg` encodes
  `https://venmo.com/u/Ripon-Swiss-Club`, decoded independently to confirm.
- Their **membership page renders empty** — 32 KB of shell with no dues.
  `docs/current-site-audit.md` is a better record of their terms than their site is.
- The cookbook is **Chuchichäschtli Chochbuech** — the Innerschweiz spelling, which is
  what their own gloss "Kitchen Kupboard Kookbook" was reaching for. Their site spells
  it four different half-Germanised ways. The index shows "Chuchichäschtli" alone.
- The six West Coast club URLs on `other-swiss-clubs.html` were **given by the client**
  and differ from the links on the club's own page. Use the ones in the file.
- The map's state outlines are US Census boundary data, projected to Mercator and
  simplified to 212 points by a throwaway script, then baked into the page. There is no
  map library and nothing is fetched at runtime.

## Do not reintroduce

All of this was written, shown to the client and explicitly rejected.

| Removed | Why |
|---|---|
| The 2026 building work — new entrance, dance floor, kitchen, playground | Rejected outright, more than once |
| Anything about a security guard at a rental | Cut from the rate card and the quote engine |
| Member count (702), chorus voice count (32) | Would need constant updating |
| "The club in numbers", "At a glance", "Words you'll hear", "Fundraising" | Filler |
| Any note explaining how the site works | See rule 5 |
| The alphorn photograph | Generic alpine stock from the old site |
| Capacity figures, "maple" floor, a stage, a commercial range, a 1am curfew | Invented |
| "Visitors thinking of joining are welcome to come to a meeting" | Never stated by the club |
| Travel-poster illustration as an art direction | Rejected. `docs/image-prompts.md` still argues for it; ignore that |
| A fifth item in the top navigation, including "Get a Quote" | Four items, fixed |
| Photo cards, descriptions or a hover readout in the home page index | Each removed by name |
| "Papers and minutes" as an event field | Meaningless outside the AGM; Attachments covers it |

Two phrasings rejected by name: the hero subline "We hold Swiss wrestling tournaments,
run a chorus, and rent our hall…" and the heading "Three reasons to come up Manley
Road". The calendar heading reads **"What's going on"**.

## Where the work stopped

Done: the public site; the home page index; the West Coast map; the admin home; the
events screen (add, change, remove, custom detail rows with more than one line each,
picture upload, multi-file attachments); the public pages reading the event data; the
hall rental screen and the rate card, quote form and estimate reading it; rental
availability coming off the events.

Next, in the order it was being approached:

1. **The event pages still do not render the data.** `event-agm.html` and its five
   siblings are hand-written pages of grey placeholder blocks. One page reading an id
   from the URL would replace all six and close the loop — the admin collects every
   field those pages have a slot for, and none of it reaches them.
2. **The 2027 calendar on `events.html` is still markup.** Annual dates nobody can
   edit, which will go stale exactly the way the old site did.
3. **No sign-in.** Agreed shape: board members, email and password eventually, a simple
   code for the demo, built so the real thing swaps in behind the same screens. Nothing
   private may sit behind a demo-grade gate.

`ROADMAP.md` has the full backlog and the decision log.

## Context

This is a **concept pitch built on spec**. The club has not asked for it and is not
involved. The audience is their board. The repository is public, which means this file
and `docs/current-site-audit.md` — which contain pitch strategy and a blunt assessment
of their current site — are public too. That was a deliberate trade for free hosting.
