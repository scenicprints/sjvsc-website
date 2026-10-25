# Continuing this on another machine

**Live:** https://scenicprints.github.io/sjvsc-website/
**Repo:** https://github.com/scenicprints/sjvsc-website (public)
**Admin:** https://scenicprints.github.io/sjvsc-website/admin.html, `noindex`. One way in
from the public site: a quiet **Website admin** link in the home page footer, beside the
concept-design note, on `index.html` only. The top navigation stays at four items.

**The admin reads. It does not write.** There is no sign-in, no code and no key, and
there is nothing to protect: the screens fetch `data/*.json` and lay out what is in them.
Every field is fixed and there is no Save.

That is not a missing feature. Pages is files on a branch, so a page can only commit by
carrying a credential that anyone who opens the page can read. A key was tried and
rejected, file-download was rejected, and the answer was to drop saving altogether. The
data is edited in the repository and committed, which is where it has always really
lived.

## Where the data lives

**In this repository, in `data/*.json`. Nothing is kept in a browser.**

`events.json`, `saved.json`, `rates.json` and `gallery.json` are the club's data.
Every page fetches them and draws itself, the admin included.

`assets/js/store.js` is the whole of it: `read(name, fallback)` and `path(name)`. The
`SEED` constants in each store are the fallback for when a file cannot be fetched, not
the source.

To change what the website says, edit the file and commit. The admin screens are how you
see what is in them, and the public pages are how a visitor does.

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

### A push is live, but a refresh may not show it

Pages serves HTML with `Cache-Control: max-age=600` and there is no way to change
that header on Pages. For up to ten minutes after a push, a plain refresh can hand
somebody the old page, which then asks for the old stamped script and looks exactly
like the change did not deploy. Ctrl+Shift+R is the answer in the moment. The three
four admin pages carry a `no-cache` meta so they always revalidate; the public pages do
not, because they are the ones that benefit from being cached.

Before saying something is not live, check what the server is actually sending:

```bash
curl -sS https://scenicprints.github.io/sjvsc-website/admin-rentals.html | grep -o 'admin-rentals.js[^"]*'
```

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
index.html + 24 other *.html   the pages, at the repository root
admin.html                     admin home — one row per thing that can be edited
admin-events.html              the events screen: the list, the month, and one event
admin-rentals.html             the hall rental screen: the whole rate card
admin-gallery.html             the pictures screen: one page's band at a time
assets/css/site.css            the public design system
assets/css/admin.css           the admin side, deliberately larger and plainer
assets/js/events-data.js       THE event list, and the details boxes on the tied pages
assets/js/rates-data.js        THE rate card, read by rentals.html and the quote
assets/js/gallery-data.js      THE pictures: the bands and the viewer
assets/js/site.js              nav, scroll-to-top, timeline, public event lists
assets/js/admin.js             the admin home (only the date is live)
assets/js/admin-events.js      the events screen
assets/js/admin-rentals.js     the hall rental screen
assets/js/admin-gallery.js     the pictures screen
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

**The header bar is full width.** `.hdr .wrap` overrides the 1180px column so the
brand sits near the left edge and the navigation near the right at any screen size.
Pinned to the page column, both were stranded in the middle of a wide monitor.

## The top navigation is fixed

**Calendar, Hall Rental, Membership, Contact.** Four items. Everything else is reached
from the index on the home page. Do not add a fifth.

## Two pieces worth understanding before touching them

**The home page index.** Fifteen destinations in ruled columns, sized by column *width*
rather than count, so the browser fits as many as there is room for — five of three
rows at page width, two columns on a phone. Numbered 01–15. It replaced a grid of photo
cards. It has no readout, no descriptions and no images by explicit instruction.

**Every event opens something.** An event is tied to a page, and a page it ties to is
either a standing page the club already has (Jass, Oktoberfest, Swiss Echoes) or a page
of its own (Children's Christmas Party, the AGM). There is no third case: a row on the
calendar that opens nothing is a fault, not a state. `TIED` in events-data.js is the
whole list, and a new page of its own means a page, a line in `TIED`, a line in
gallery-data.js `PAGES`, and an option in the admin's picker.

**The Calendar page.** `calendar.html`, which until today was `events.html` and titled
Events, though the navigation has always called it Calendar. It carries the year drawn
from `data/events.json`: twelve months, each listing what is on in it, because the
club's year is a dozen events and a grid of empty squares says less about it than a
list of what is on. Everything planned is there, advertised or not. An event being
advertised is a link to wherever it opens; one that is not is a button that says
details to come, because there is nothing to read yet. A month with nothing in it carries its
name and nothing else: the page already says club meetings are the second Wednesday of
every month, and repeating it ten times down the year says nothing. The year steps with the arrows. The list underneath
still shows only what is being advertised.

A day-by-day month was built first and thrown away: twelve months at a glance is what
he asked for, and seven columns on a phone leave about forty pixels a day, which breaks
a title into pieces of two letters.

**The events data.** `data/events.json` holds one list. `index.html`, `calendar.html`, the
eleven tied pages and `admin-events.html` all read it. An event shows only while today sits
inside its advertising window (`from`…`until`), and `until` is computed as the day after
the event, which is the mechanism that stops the site going stale. The rows already in
the markup are the no-script fallback.

**The galleries.** `assets/js/gallery-data.js` holds the store, the bands and the
viewer; `admin-gallery.html` shows them, one page at a time. The eleven tied pages each
carry `<div class="gbands" data-gallery="...">` in a `.gsec` section at the foot, which
stays `hidden` while that page has no pictures.

A page with no photographs carries no gallery at all: the whole `.gsec` section,
heading included, is `hidden` in the markup and revealed only when there is something
to show.

`gallery-data.js` ships a `SEED` with the club's own photographs, under
`assets/img/gallery/<tie>/`, so the galleries are not empty before anybody touches the
admin: three on Jass, four on Almond Blossom, one on Swiss Echoes. The files keep the
names they arrived with. Captions say what is in the picture and nothing more.

One photograph is not a band. It is shown at its own proportions, in the middle, and
holds still, because there is nothing for it to travel past and copying it across the
window reads as a fault. From two upward the band travels: a set narrower than the
window is repeated until there is a full window of pictures beyond the wrap point,
which is what makes the loop join invisibly. Two at 1200px wide is three copies, six
tiles. An earlier version only doubled the set and only travelled when the set was
already wider than the window, so two pictures sat as still as one.

A band holds six photographs and runs the full width of the window, which nothing else
on the site does. Band one travels one way as the page scrolls past it and band two the
other, so the rows weave; a ninth picture puts out a second band and a thirteenth a
third. Eighteen is the ceiling. No photograph is ever shown twice on screen.
A tile is `clamp(250px,34vw,480px)` wide and cover-cropped rather than sized by its own
shape, which is what makes three photographs already run past the edge and so gives the
band somewhere to travel; the whole frame is in the viewer. A band whose pictures still
do not reach the edge takes `.gb-fit`, spreads them across the full width and holds
still, because a row of four repeated to make something move is worse than a row of
four. A band that does travel has its set doubled so the loop joins without a seam, and
since one set is wider than the window the copy is never on screen beside its original.

The drift is a `setInterval`, not `requestAnimationFrame`, which does not run in a
minimised window; the timeline has the same note. Touching a band stops it for two and
a half seconds so a swipe is not fought, and `prefers-reduced-motion` stops it entirely
and leaves the bands scrollable by hand.

Clicking a photograph opens the viewer: the picture large, `n of m` and the caption
beneath, every other photograph in a rail along the bottom with the current one marked,
arrow keys, Escape, and the focus handed back to the picture that was clicked.

Pictures are shrunk to 1100px wide at quality 0.7 before being kept, because eight
galleries of them have to share the browser's few megabytes with the events and the
rate card. That is the only reason for the eighteen cap.

**Kept for later: the Kids Swiss Camp Details card.** Removed from the page on the
owner's instruction, and wanted again at some point. It read:

| Heading | What it said |
|---|---|
| Hours | 9:00am to 4:00pm |
| Who | Completed Kindergarten to 8th grade |
| Places | 60 children |
| Cost | $15, scholarships available |
| Pay | Venmo @Ripon-Swiss-Club, or by check |
| Ask | Katharina or Regina Beeler, RiponKSC@gmail.com |

The hours and the cost also came out of that page's prose in the same pass.

**Saved events.** A second store, `sjvsc.saved.v1`, holds events the club runs again.
Nothing on it reaches a reader. **Keep for re-use** on a dated event copies the form
onto the shelf with the day and the advertising window stripped. The **Saved events**
list on the events screen opens one: the form then says *A saved event*, Save updates
the saved copy, **Put it on the calendar** makes a real event from it and leaves the
saved one alone, and Remove takes it off the shelf. A saved event needs only a name,
since the day is what it is waiting for.

**Where an event goes.** The page tie is the only thing that says where a calendar row
leads: `href(e)` is `TIED[e.page]` first and the old seed `link` only after, for the two
seed events whose page is not one of the eight. The admin has never had a link field, so
an event retied to another page used to keep whatever `link` the seed gave it, and a new
event had none at all and was not a link. An untied event is still not a link, because
there is nowhere for it to go, and the admin now says so on the row rather than leaving
somebody to wonder why one event opens and the next does not.

**Agenda and Picture are gone**, both collected and rendered nowhere. **Description**
prints on the details card under the day, with `white-space:pre-line` so paragraphing
survives. **Attachments** are rows of `{name, link}` or `{name, data, size, type}`: a
name, then either a file or a web address, never both. They print on the card as named
links; a file downloads under its given name, an address opens in a new tab. A file
over 400KB is refused and the message says to paste an address instead.

**Page ties.** An event can name one of eight standing pages in `Show it on a page`,
and that page carries it while it is inside its advertising window. A page carries
every tied event at once, so three in their windows means three cards.

The card runs the full width, straight under the page header and above all the content:
`<div class="wrap"><div class="eslot" data-eventslot="..."></div></div>` sits between
the `.phead` and the first `.sec`, and `events-data.js` fills it with one `.ecard` per
tied event. It was down the right-hand column to begin with, which was the wrong place
for the only thing on those pages that changes, and too narrow for a description.

A card is the name and the day on one line, then a body that uses the width rather than
leaving half of it empty: with both a description and headings, `.ecard-body.both` is
two columns, the prose on the left and the headings down the right, ruled off it. Under
860px they stack and the headings take the top rule back and spread across; under 620px
they go to one column. With only one of the two it takes the whole width. The date is
`flex:0 1 auto` so a long one wraps inside the card instead of spilling past it. `.erows` is its own class so the `.rows` cards still on
`wcswa.html` and `kochbuch.html` are untouched. An empty slot adds no height at all.

| Value | Page |
|---|---|
| `schwingers` | `schwingers-club.html` |
| `echoes` | `swiss-echoes.html` |
| `camp` | `kids-swiss-camp.html` |
| `schwingfests` | `event-schwingfest.html` |
| `bbq` | `members-bbq.html` |
| `oktoberfest` | `event-oktoberfest.html` |
| `jass` | `event-jass.html` |
| `almond` | `almond-blossom.html` |

**Tickets.** An event carries `tickfrom`, `tickto`, `tickprice` and `ticksellers`,
a list of `{kind:'entry'}` and `{kind:'person', who, contact}`, because a ticket can
be had in more than one way at once. An event saved before the list existed carried
a single `ticksource`/`tickwho`/`tickcontact`, and `sellers()` still reads it.

`priceText()` puts a dollar sign on a price typed as a bare number, and pads a single
decimal, so `15` reads `$15` and `15.5` reads `$15.50`. Anything that is not a plain
number is left as typed, so `Free` and `$5 members, $8 otherwise` both survive. The
listing tag reads `Tickets $15`, because a number alone in a box says nothing.

`contactText()` writes ten digits, or eleven starting with a 1, as `(209) 555-0143`.
Anything holding an `@`, and anything that is not a ten digit number, is left exactly
as it was typed. It runs on the admin box losing focus, on save, and again at render,
so older rows tidy up too.

The details card shows a `Tickets` row and a `Where from` row with one line per way,
and the home page and calendar listings show the price beside the date. All of it only
between the two sale days: before `tickfrom` and after `tickto` nothing about tickets
appears, and nothing appears at all without a price or a seller.

Two seed events carry a `page` so the demo shows something out of the box: the Fall
Jass Party is tied to `jass`, the Swiss Echoes Christmas Party to `echoes`. An event
with no tie still shows its price on the listings; it just has no page to carry a
details card.

**The month.** The events screen draws a month under the list: the event days in green,
the day either side in amber because the hall is tied up then, today outlined. Clicking
a day with an event opens it. It is the same `events` array as the list, so nothing can
disagree.

**Availability.** There is no availability list. Today and every day before it are gone,
and the quote says *has passed* rather than *is not available*. The form opens on the
first day that can be booked rather than a date typed into the markup. An event ties the hall up the day
before, the day of, and the day after — setting up, the event, clearing away — and
`SJVSC.blocks(date)` on the events store is the whole rule. It reads the event's own
day, not its advertising window, so an event that has stopped showing still holds its
dates until it has passed. The refusal says only that the day is not available and
never why, and it offers the nearest open days of the same weekday. The month
calendar above the quote form is the same rule drawn out: green is free, red is
not, cream is past, and clicking a free day fills the date in. It opens on the
month the form is set to and will not go back past the current one.

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
- `.cal` is the twelve-month 2027 grid that used to sit on the calendar page. It was
  removed in 3ab27fe along with the hardcoded 2027 dates, and the month that replaced
  it on `calendar.html` is `.mcal`, drawn from `data/events.json`. The rental calendar
  is `.rcal`. Grep `site.css` for a class name before adding one: `.cal` has now
  collided with two different calendars, the first rendering as a four-column card with
  the legend on top of it and the second as three columns of squashed weekdays.
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
- The club map is nine pins across two SVGs, wide and narrow. The projection is
  `x = 49.0847*lon + 6121.888`, `y = -2818.219*ln(tan(pi/4 + lat/2)) + 2772.706` for the
  wide one and `x = 38.2922*lon + 4775.803`, `y = -2198.027*merc + 2212.572` for the
  narrow, which reproduces every original pin within about a pixel. The narrow labels
  need 120 apart or they collide; nine of them is why its viewBox is 1090 tall.
- The Portland, Oregon club has no name and no website yet, so it carries a pin, a plain
  city label and a list line with no link. Nothing is invented for it.
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

3. **Sign-in is one GitHub key, shared.** What is left is board members with their own
   accounts. The key cannot be given to a board that is not going to hold a GitHub
   token, so this is the piece that has to change before anybody but the owner uses it.

`ROADMAP.md` has the full backlog and the decision log.

**`sjvalleyswisshall.com`** is the club's hall rental page, the one the printed
yard sign and its QR code point at. This site replaces it. It is not a competing
site to work around and does not need raising again.

**Nothing carries a date it cannot change.** The 2027 year-ahead block is off
`calendar.html`, the three Schwingfest dates are off `schwingen.html`, the quote form no
longer opens on a typed date, and the events heading no longer names a year. `about.html`
is deleted; it was reachable from nowhere and went over the same ground as
`club-history.html`.

**A quote carries itself to the contact form.** *Request this date* links to
`contact.html?about=Hall%20rental&msg=...` with the day, the space, the guests, the
hours, the estimate and the reference already written into the message, and `site.js`
fills the form in from the query.

## Context

This is a **concept pitch built on spec**. The club has not asked for it and is not
involved. The audience is their board. The repository is public, which means this file
and `docs/current-site-audit.md` — which contain pitch strategy and a blunt assessment
of their current site — are public too. That was a deliberate trade for free hosting.
