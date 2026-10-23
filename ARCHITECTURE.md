# Architecture

How the concept site is put together: the stack, every page, the data behind them, and
the one idea that connects it all.

This describes a **concept build** — a demo made to pitch the club, not a production
system. Where the two would differ, that is called out explicitly.

**Live:** https://scenicprints.github.io/sjvsc-website/

---

## 1. Two organising ideas

### 1a. One calendar is the source of truth

> **Everything else reads from it.**

The old site keeps event information in three hand-typed places and rental
availability nowhere at all. That is why the homepage goes stale and why nobody can
tell whether the hall is free.

Instead, a single `CalendarEntry` concept underlies three different things:

```
                        ┌───────────────────────────┐
                        │      THE CALENDAR         │
                        │                           │
                        │  Club events              │
                        │  Rental bookings          │
                        │  Tentative holds          │
                        │  Blackout dates           │
                        └─────────────┬─────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
  ┌───────────────┐          ┌────────────────┐          ┌────────────────┐
  │ PUBLIC EVENTS │          │  QUOTE ENGINE  │          │  ADMIN CALENDAR│
  │               │          │                │          │                │
  │ Shows events  │          │ A date is free │          │ Board sees all │
  │ whose window  │          │ only if NOTHING│          │ three layers in│
  │ is open today │          │ occupies it    │          │ one month view │
  └───────────────┘          └────────────────┘          └────────────────┘
```

Two consequences fall out for free:

- **Events cannot rot.** The homepage asks "what is published *right now*?" rather than
  displaying whatever someone typed last spring.
- **The hall cannot be double-booked.** Scheduling the Championship Schwingfest
  automatically removes that weekend from the rental quote tool.

### 1b. Nothing operational is hardcoded

> **If a board member would ever want it different, it lives in data and has a screen
> in the admin.**

In production this is about the club running the site for years without a developer.
In the pitch it does something else: it is the **demonstration**. A board member
changing a rental rate on screen and watching the quote update is a far better
argument than a promise that it would be editable.

| Lives in data, editable in the admin | Lives in code |
|---|---|
| Rental rates, included hours, overage rate | Page layout and components |
| Add-on list and prices | The calculation *order* |
| Member discount, deposits | Availability rules |
| Alcohol requirements and what they add | Routing |
| Events and their advertising windows | Design system |
| Page copy, FAQ answers, hero text | Data shape |
| Board directory, contact routing | — |

Rate cards carry an `effectiveFrom` date and quotes store their own line items, so
changing a price never rewrites a quote already issued. That is production-correct
behaviour, and it costs nothing to build in from the start.

---

## 2. Stack

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies, no
backend, nothing to install.

| Layer | What it actually is |
|---|---|
| Pages | Fourteen hand-written HTML files at the repository root |
| Styling | One stylesheet, `assets/css/site.css` |
| Behaviour | `assets/js/site.js` — navigation, scroll-to-top, the timeline |
| | `assets/js/quote.js` — the hall rental quote engine |
| Data | In the markup, and in one table at the top of `quote.js`, standing in for the admin screens a real build would have |
| Heraldry | Twenty-six public-domain cantonal arms from Wikimedia Commons |
| Photography | Seven images: six recovered from the old site, one supplied by the client |
| Hosting | **GitHub Pages**, from the root of `main` |

**Running cost: $0.** A push to `main` is a deploy, live in about a minute.

### Why nothing more

An earlier draft of this file specified Next.js, Tailwind, Drizzle and a D1 database
on Cloudflare. None of it was ever needed. The demo has no accounts, stores nothing,
sends nothing and serves one organisation's brochure. Every layer removed is a layer
that cannot break during a presentation, cannot need updating in a year, and cannot
stop someone picking this up on a different machine.

The constraint that settled it: the club's own Instagram is event flyers rather than
photographs, so the library is seven images. A site that cannot lean on imagery has to
be carried by type, colour, flat shape and heraldry — and none of that needs a
framework.

### What changes if they say yes

The public pages carry over. The work is confined to making the data live:

| Now | Production |
|---|---|
| Rates in a table at the top of `quote.js` | An admin screen writing to a database |
| Events written into the markup | Event records with advertising windows |
| Empty labelled blocks on event pages | Fields the board fills in |
| No login | Real authentication |
| Quote shown on screen | Quote emailed, stored, and tracked as an enquiry |

### Why not the alternatives

- **A clickable mockup.** Cannot demonstrate the two features the pitch rests on. A
  publish window that does not publish proves nothing.
- **WordPress.** A real option for their production site, but building the pitch in it
  means fighting a booking plugin instead of writing the quote engine we want.
- **A full production build.** Much more unpaid work on a maybe, and the extra
  machinery is invisible to the audience.

## 3. Public pages

| Route | Purpose | Key elements |
|---|---|---|
| `/` | Convince and direct | Hero; **next 3 events, generated**; rent-the-hall CTA; join CTA; centennial |
| `/events` | What's on | Filterable list, month toggle, past archive |
| `/events/[slug]` | One event | Details, flyer, add-to-calendar |
| `/rentals` | **Sell the venue** | Gallery, capacity, indoor+outdoor, what's included, centennial upgrades |
| `/rentals/quote` | **Smart quote builder** | Guided form → itemised estimate → enquiry |
| `/rentals/availability` | Is my date free? | Month calendar: open / held / booked |
| `/rentals/faq` | Remove friction | Policies, insurance, alcohol, cancellation |
| `/membership` | Why join | Four tiers, dues, 31 March deadline, benefits |
| `/membership/join` | Apply | Application form |
| `/about` | 100 years | 1926–2026, the hall, the centennial weekend |
| `/schwingen` | Swiss wrestling | What it is, practice Thursdays 6pm, WCSWA |
| `/swiss-echoes` | The chorus | Since 1947, videos, practice Tuesdays, join |
| `/contact` | Reach the right person | **Topic router**, then board directory |

**Navigation is flat.** Home · Events · Hall Rental · Membership · Schwingen ·
Swiss Echoes · About · Contact. Nothing hides under "More". `Get a Quote` sits in the
header as the primary button.

### Two pages that need rethinking

**`/contact`** currently lists fourteen names and phone numbers with no hierarchy. It
becomes: *"What do you need?"* → Rent the hall / Join / An event / Swiss Echoes /
Something else → the right person or form. The full board directory stays, below.

**`/rentals`** currently says almost nothing and links to two dead sites. It becomes
the most carefully built page on the site, because it is the one that earns money —
and the easiest win to point at during the pitch.

---

## 4. Admin

Everything under `/admin`, behind the demo login.

| Route | Purpose |
|---|---|
| `/admin` | Dashboard: new enquiries, next events, anything expiring |
| `/admin/calendar` | **Master month view** — events, holds and bookings together |
| `/admin/events` | List, filter, duplicate last year's event |
| `/admin/events/[id]` | Editor — details, images, **advertising window**, `blocksHall` |
| `/admin/rentals` | Enquiry pipeline: New → Quoted → Held → Booked → Complete |
| `/admin/rentals/[id]` | Review and adjust a quote |
| `/admin/pricing` | **Rate card editor** |
| `/admin/pages` | Edit page copy |
| `/admin/reset` | Restore seeded data — demo only |

### The advertising window control

This is the feature that fixes stale content, so it gets explicit treatment. Each
event editor has **two** date ranges:

```
Event runs:        [ 15 Nov 2026 ]  →  [ 15 Nov 2026 ]
Advertise from:    [ 01 Oct 2026 ]  →  [ 16 Nov 2026 ]     ← defaults to day after
Feature on home:   [ 01 Nov 2026 ]  →  [ 16 Nov 2026 ]     ← optional
```

The public site only ever asks: *which events have an open advertising window today?*
A past event disappears by itself. A Christmas party can be entered in August and
start advertising in November without anyone remembering to go back.

**In the demo this is the money shot.** Change the window, return to the homepage,
watch the event appear or vanish. That single interaction makes the argument.

---

## 5. Data model

### What is actually built

One list, in `assets/js/events-data.js`, written by the admin screen and read by the
public pages. Kept in `localStorage` under `sjvsc.events.v1`; it falls back to the seed
in that file when storage is empty or blocked.

```
Event ───── id          'jass-fall', or 'e' + timestamp for a new one
            title       required
            note        the one line shown on the home page and the calendar
            desc        description
            agenda      free text, one item per line
            image       a data URL - resized to 1000px wide, JPEG, in the browser
            date        'YYYY-MM-DD', required
            time        '7pm'; shown beside the date on the calendar
            link        the event's own page, where one exists
            from        advertising window opens
            until       advertising window closes - computed as the day after `date`
            details     [{ label, value }]  the club writes its own headings
            attachments [{ name, size, type, data }]  data URLs, 400KB each at most
```

`details` is deliberately not a fixed set of fields. Sixteen common headings are
offered as suggestions, but Oktoberfest needs "Tickets from", the Schwingfest needs
"Admission" and the AGM needs neither, so no fixed list fits all three.

An event is visible when `from <= today <= until`. That is the whole staleness fix.

### What a production version would add

```
RentalInquiry ── id, ref, contactName, email, phone
                 eventDate, eventType, guestCount, spaces[], hours
                 alcohol, isMember, addOns[]
                 status (new|quoted|held|booked|declined|complete)

Quote ────────── id, inquiryId, version, lineItems[], subtotal, discount,
                 total, bookingDeposit, damageDeposit, expiresAt

QuoteLineItem ── id, quoteId, label, qty, unitPrice, amount, kind

Booking ──────── id, inquiryId, startsAt, endsAt, status
Hold ─────────── id, inquiryId, date, expiresAt

RateCard ─────── id, space, dayType (weekday|friday|saturday|sunday),
                 season, baseRate, includedHours, hourlyOverage,
                 memberDiscountPct, damageDeposit, effectiveFrom

AddOn ────────── id, label, description, price, unit, requiresAlcohol

BoardMember ──── role, name, phone, email, sortOrder
```

Attachments and images are data URLs only because a static demo has nowhere to put a
file. With a backend they become ordinary uploads and the 400KB cap disappears.

---

## 6. Quote engine logic

Calculation order, deliberately explicit:

```
1. Is the date available?
   Reject if any club Event with blocksHall, Booking, or unexpired Hold covers it.
   If taken → offer the nearest open dates instead.

2. Base rate
   rateCard(space, dayType, season).baseRate

3. Hours
   included = rateCard.includedHours
   overage  = max(0, requestedHours − included) × rateCard.hourlyOverage

4. Add-ons
   sum of selected AddOn prices

5. Alcohol
   If serving, add the required line items (licensed bartender, security) and surface
   the insurance-certificate requirement as a condition, not a charge.

6. Subtotal = 2 + 3 + 4 + 5

7. Member discount
   If member → subtract rateCard.memberDiscountPct

8. Total

9. Shown separately, NOT added to the total:
   - Booking deposit (credited against the total)
   - Refundable damage deposit
```

**What makes it smart rather than a calculator:**

- It knows the club's own calendar, so it never quotes a date the Schwingfest owns.
- It knows member status and applies a benefit the club already promises.
- It encodes real policy — alcohol implies insurance and a bartender — so renters
  learn the requirements before they ring up, not after.
- It produces a referenced, dated, shareable estimate.
- It feeds a pipeline, so no enquiry is lost in a volunteer's inbox.
- Prices are data, so the board changes them without a developer.

### About the numbers in the demo

The club publishes no rental pricing anywhere — both of their rental sites are dead.
So the demo invents a rate card.

**Invent realistically.** Obviously fake numbers undercut the demo; a board member who
rents halls knows roughly what a hall like theirs is worth, and round nonsense reads
as unserious. Pitch the figures at what a venue of this size in the Central Valley
plausibly charges, and label them on screen as illustrative.

The engine is the product. The numbers are set dressing — and they are the first thing
the club would replace.

---

## 7. Repository layout

```
/
├── index.html + 27 other *.html   the public pages, plus the two admin screens
├── assets/
│   ├── css/site.css               the public design system
│   ├── css/admin.css              the admin side, larger and plainer
│   ├── js/events-data.js          the event list - admin writes, public pages read
│   ├── js/site.js                 nav, scroll-to-top, timeline, public event lists
│   ├── js/admin.js                admin home
│   ├── js/admin-events.js         the events screen
│   ├── js/quote.js                hall rental quote engine
│   ├── img/                       23 of the club's photographs
│   └── img/arms/                  26 cantonal arms (public domain)
├── tools/
│   ├── stamp-assets.py            run after any CSS or JS change
│   └── make-artifact-index.py     generates a gitignored artifact-shaped index
├── docs/current-site-audit.md     everything the old site said
├── README.md · ROADMAP.md · ARCHITECTURE.md · HANDOFF.md
```

Every stylesheet and script reference carries a hash of the file, because Pages caches
assets for ten minutes and a page served new HTML with an old script throws on load.
`tools/stamp-assets.py` maintains them.
