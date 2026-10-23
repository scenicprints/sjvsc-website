# Roadmap — SJVSC concept site

**Living document.** Updated as work proceeds. If you are picking this up on another
machine, read this file first, then `ARCHITECTURE.md`, then `docs/current-site-audit.md`.

- **What this is:** an unsolicited **concept website** built on spec, to show the
  San Joaquin Valley Swiss Club (Ripon, CA) what their site could be.
- **Audience:** the SJVSC board. They have not asked for this and are not involved yet.
- **If they say yes:** the concept becomes the basis for their real site.
- **Their current site:** https://sjvscriponswiss.com/
- **Live:** https://scenicprints.github.io/sjvsc-website/
- **Status:** public site built and live. Admin demo not started.
- **Last updated:** 2026-10-22

---

## What success means

**They say yes.** That is the only measure that matters right now.

Everything follows from that. This is a sales artifact, not an operations platform.
It has to be good enough to make a volunteer board want to change something that
currently works well enough for them.

Three things have to land:

1. **It looks like a different class of thing.** Their current site is a builder
   template. The concept should look like it was designed for a 100-year-old Swiss
   cultural club, specifically.
2. **It solves problems they already feel.** Not abstract improvements — the stale
   homepage, the dead rental pages, selling Oktoberfest tickets by phone.
3. **It feels real.** A board member should be able to log into the admin, move an
   event, and watch the homepage change. Slideware does not do that.

---

## What this changes about the plan

Earlier drafts treated the club as a client to collect requirements from. They are
not. Nobody is going to send us rental rates, photography, or DNS records before the
pitch. Everything is built from what can be gathered independently plus realistic
invention, clearly labelled.

| Earlier assumption | Reality |
|---|---|
| Ask the board for rental rates | Invent plausible ones; the point is to demo the engine |
| Ask who maintains it after handover | Irrelevant until they say yes |
| Secure club ownership of accounts | Irrelevant until they say yes |
| Get DNS records for email | No email at all; nothing is sent to anyone |
| Commission a photo shoot | Use the six recovered photos and design around the shortage |
| Build on a real database | A demo needs no database — see `ARCHITECTURE.md` §2 |

Nothing is blocked. There is nobody to wait for.

---

## Deliverables

1. **The live demo.** A shareable link the board can open on any device. This is the
   pitch.
2. **A short leave-behind.** One or two pages they can keep after the meeting: what
   it is, what it does, what happens next. Boards decide between meetings.

### A tone risk worth naming now

The current site was built by volunteers, and somebody in that room is probably proud
of it. A pitch that leads with "here is everything wrong with your website" loses the
room no matter how good the demo is.

Frame everything as **what the club could do next**, never as what they got wrong. The
audit findings are ammunition for building the right thing — they are not slides.

---

## Phases

| Phase | Scope | Why this order |
|---|---|---|
| **0. Planning** | Audit, content recovery, architecture | Done |
| **1. Design direction** | Homepage, fully designed | Fastest signal, and the thing that wins or loses the pitch |
| **2. Public site** | Remaining pages, real content, mobile | The bulk of what they will click through |
| **3. Demo admin** | Login, events, **advertising windows** | First of the two "it actually works" moments |
| **4. Quote system** | Availability, quote builder, enquiry pipeline | The second, and the strongest argument |
| **5. Pitch polish** | Demo reset, seeded story, leave-behind doc | Presenting badly wastes the build |

---

## Backlog

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

### Phase 1 — Design direction
- [x] Palette, typography, and layout system grounded in the club, not a template
- [x] Homepage: hero, next events, rental CTA, membership CTA, centennial
- [x] Mobile layout — most of this audience arrives from Facebook on a phone
- [x] Decide how to carry six photographs across a whole site

### Phase 2 — Public site
- [x] Flat navigation; nothing hidden under "More"
- [x] Events listing and event detail
- [x] **Hall rental page** — the one that earns money
- [x] Membership: four tiers, dues, 31 March deadline, benefits
- [x] About / 100 years
- [x] Schwingen
- [x] Swiss Echoes
- [x] Contact that routes by topic instead of listing 14 phone numbers
- [x] Migrate content and fix the copy errors (audit §6)
- [x] Eleven further pages built from their own content and photographs
- [x] The home page index — fifteen destinations in ruled columns
- [x] The West Coast map on other-swiss-clubs.html

### Phase 3 — Demo admin
- [ ] Login screen (a simple code for the demo; email and password later)
- [x] Admin home — one row per thing that can be edited
- [x] Event editor with **advertising windows** (`from` / `until`)
- [x] Details the club writes itself: its own headings, not a fixed set
- [x] Picture upload, resized in the browser; multi-file attachments
- [x] Changes visibly affect the public site (home page and calendar)
- [ ] Event pages render the data — six hand-written placeholder pages remain
- [ ] The 2027 calendar on events.html is still markup
- [ ] Month calendar: events, holds, bookings
- [x] **Rate card editor** — the proof that prices are not hardcoded

### Phase 4 — Quote system
- [ ] Availability check against the club calendar
- [ ] Guided quote builder → itemised estimate
- [ ] Member discount applied automatically
- [ ] Alcohol toggle drives insurance and bartender requirements
- [ ] Enquiry lands in the admin pipeline
- [x] Realistic placeholder rates, labelled as illustrative

### Phase 5 — Pitch polish
- [ ] One-click demo reset, so every showing starts clean
- [ ] Seeded data that tells a story (a real-looking 2027 calendar)
- [ ] Leave-behind document
- [ ] Check it presents well on a phone and on a projector

### Deliberately out of scope
Payments, real email, member accounts, the shop, Spanish translation, real auth
security. All are Phase 2 conversations that only happen if they say yes.

---

## Decision log

| # | Date | Decision | Reasoning |
|---|---|---|---|
| 1 | 2026-10-22 | Rebuild rather than restyle | The three core features cannot be built on a site builder |
| 2 | 2026-10-22 | Git on GitHub | Work must resume on any machine |
| 3 | 2026-10-22 | `ROADMAP.md` is the living record | One file to read first |
| 4 | 2026-10-22 | **Nothing operational is hardcoded** | Demonstrates the pitch: the board could run this themselves |
| 5 | 2026-10-22 | Rate cards versioned; quotes store their own line items | Correct for production, and costs nothing to build in now |
| 6 | 2026-10-22 | Must run at **$0** | Spec work, unpaid, no client budget |
| 7 | 2026-10-22 | ~~Cloudflare Pages~~ superseded by 12 | Was chosen before the stack simplified to static files |
| 8 | 2026-10-22 | **This is a concept pitch, not a commissioned build** | Reframes everything below |
| 9 | 2026-10-22 | **No backend.** Seeded data, admin state in the browser | A demo needs no database; removes every piece of infrastructure that could fail during a presentation |
| 10 | 2026-10-22 | Realistic invented rates, labelled illustrative | Obviously fake numbers undercut the demo; the engine is the point |
| 11 | 2026-10-22 | Pitch frames everything as opportunity, never as criticism | The current site was built by volunteers who will be in the room |
| 12 | 2026-10-22 | **Public repo, GitHub Pages from the root of `main`** | Pages will not serve a private repo on a free plan, and Pages serves only a branch root or `/docs`. A push is now a deploy |
| 13 | 2026-10-22 | Cantonal arms come from Wikimedia, not hand-drawn SVG | Hand-drawing heraldry silently dropped the 14 cantons with figurative charges |
| 14 | 2026-10-22 | No build step, no dependencies, no framework | The whole site is HTML, CSS and two script files. Nothing to install, nothing to go stale |

---

## Open questions

Only two, and both are ours to answer.

1. **How do we get it in front of them?** Email the President? Catch someone at an
   event? Go through a member? The club meets the **second Wednesday of each month at
   7pm** at the hall, and holds its **Annual General Meeting on 10 December 2026** —
   which is the one meeting of the year where the whole board is present and making
   decisions.

2. **How far do we build before pitching?** A finished homepage is a weak pitch; a
   finished everything is a lot of unpaid work on a maybe. Current plan is through
   Phase 4 — the public site plus both working features — because the features are
   the argument and a static mockup does not make it.

### If they say yes

Parked, not forgotten: real rental rates, photography, who administers it, club
ownership of every account, the `sjvscriponswiss.com` handover, email sending,
payments, and importing any existing member or booking data.

---

## Changelog

### 2026-10-23

- **Top navigation fixed at four items** — Calendar, Hall Rental, Membership, Contact.
  Everything else is reached from the home page index.
- **The home page index.** Fifteen destinations, numbered, in ruled columns sized by
  column width so the count adapts to the space: five columns of three at page width,
  two on a phone, about a fifth of the height of the photo-card grid it replaced.
  Several directions were drawn and rejected first - a shattering Swiss cross, an
  expanding strip, a split-flap departure board, a rotating drum. The brief that
  settled it was Dieter Rams.
- **The West Coast map.** California, Oregon and Washington projected to Mercator from
  US Census data, simplified to 212 points and baked into the page as a static path -
  no map library, no tiles, no key. Seven pins with leader lines out to each club's
  name, six of them linking to that club's own site. A second arrangement for the
  phone keeps the lines and the names rather than dropping them.
- **The cookbook is Chuchichäschtli Chochbuech**, the Innerschweiz spelling, which is
  what their own "Kitchen Kupboard Kookbook" was reaching for.
- **The admin, begun.** Home page, then the events screen: list, add, change, remove,
  with the advertising window that takes an event off the site by itself. Details are
  rows the club writes - its own headings, sixteen common ones suggested. A picture is
  uploaded and resized in the browser; attachments take several files at once.
- **The public pages read the admin's events.** One list in events-data.js, written by
  the admin screen and read by the home page and the calendar.
- **Assets are stamped with a content hash.** Pages caches CSS and JS for ten minutes,
  so new HTML could be served with an old script - which broke the events screen once.
  tools/stamp-assets.py now makes that impossible.

### 2026-10-22 (fifth pass)
- **The site is live and public** at https://scenicprints.github.io/sjvsc-website/
- Repository made public and Pages enabled from the root of `main`; the site moved
  out of `design/` because Pages serves only a branch root or `/docs`
- `index.html` became a standalone document; it had relied on the artifact viewer
  for its doctype and charset, which would have meant quirks mode on any real host
- Rebuilt graphic-led after finding the club's Instagram is flyers rather than
  photographs: poster mastheads, colour bands, a twelve-month calendar grid, a
  horizontal timeline, and all 26 cantonal arms
- Stripped every invented claim from the copy and turned the event pages into
  admin templates

### 2026-10-22 (fourth pass)
- **Reframed as a concept pitch built on spec.** The club is the audience, not the
  client, and is not involved before the pitch
- Dissolved every open question that depended on club input; parked them under
  "if they say yes"
- Dropped the backend: seeded data and browser-held admin state, so nothing can fail
  mid-presentation
- Added the leave-behind document and demo-reset as real deliverables
- Flagged the tone risk of pitching against volunteers' own work

### 2026-10-22 (third pass)
- Dropped the suggestion of buying a domain for email; the club already owns one
- Established that email sending needs DNS records, not a purchase

### 2026-10-22 (later)
- Client constraints received: free, temporary domain
- Established "nothing operational is hardcoded" (`ARCHITECTURE.md` §1b)
- Stack revised to Cloudflare after finding Vercel's free tier forbids commercial use

### 2026-10-22
- Audited all eight pages of the existing site; recorded content, contacts and copy
  errors in `docs/current-site-audit.md`
- Confirmed both hall rental sites are dead (404 and DNS failure)
- Recovered six photographs from the old CDN
- Drafted feature backlog, phases and architecture; repo initialised
