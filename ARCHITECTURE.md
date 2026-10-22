# Architecture

How the site is put together: the stack, every page, the data behind them, and the
one idea that connects it all.

**Status:** proposed, pending sign-off. Stack is Open Question 1 in `ROADMAP.md`.

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
                        │   THE CALENDAR (one DB)   │
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
  │ Shows events  │          │ A date is free │          │ Board sees all  │
  │ whose window  │          │ only if NOTHING│          │ three layers in │
  │ is open today │          │ occupies it    │          │ one month view  │
  └───────────────┘          └────────────────┘          └────────────────┘
```

Two consequences fall out of this for free:

- **Events cannot rot.** The homepage asks "what is published *right now*?" rather than
  displaying whatever someone typed last spring.
- **The hall cannot be double-booked.** Scheduling the Championship Schwingfest
  automatically removes that weekend from the rental quote tool. No one has to remember.

### 1b. Nothing operational is hardcoded

> **If a board member would ever want it different, it lives in the database and has
> a screen in the admin.**

Changing a price, a date, a phone number or a paragraph must never require a developer,
a deploy, or a text editor. The club has to run this by itself for years after handover.

What that covers:

| Lives in the database, editable in the admin | Lives in code |
|---|---|
| Rental rates, included hours, overage rate | Page layout and components |
| Add-on list and prices | The calculation *order* |
| Member discount, deposits | Availability rules |
| Alcohol requirements and what they add | Authentication |
| Events and their advertising windows | Routing |
| Page copy, FAQ answers, hero text | Design system |
| Board directory, contact routing | Database schema |
| Club address, phone, email, social links | Email templates (structure) |

We ship with **clearly marked placeholder values** so every screen works from day one.
The board replaces them with real figures before launch — that is data entry, not
development, and it is not on the critical path.

One consequence worth stating: because rates change over time, every rate card carries
an `effectiveFrom` date and quotes store their own line items. **Raising prices never
retroactively alters a quote already sent to a renter.**

---

## 2. Stack

**Constraint: this has to run at $0 for now**, on a temporary domain, and migrate to
`sjvscriponswiss.com` once the club hands over the registrar.

### Recommendation

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Public pages and admin in one codebase; server-rendered for SEO |
| Styling | **Tailwind CSS** | Fast, consistent, no stylesheet archaeology later |
| Hosting | **Cloudflare Workers / Pages** | Free tier permits commercial use; free `*.pages.dev` subdomain now, free custom domain later; deploys from GitHub on push |
| Database | **Cloudflare D1** (SQLite) | Free, 5 GB, and **does not sleep** |
| ORM | **Drizzle** | Typed queries, versioned migrations, first-class D1 support |
| Auth | **Auth.js** | Email + password or magic link; roles |
| Email | **Deferred** — see below | Needs a sending domain |
| Payments | **Stripe** (Phase 4 only) | Defer until the board decides |

**Running cost: $0, permanently.** The club already owns and renews
`sjvscriponswiss.com`, so the eventual custom domain costs this project nothing — we
inherit a domain that is already paid for. Stripe adds per-transaction fees in Phase 4,
but no fixed cost. **We should not be buying anything.**

### Two corrections to the earlier draft

**Vercel is out, and the reason matters.** Vercel's free Hobby plan is restricted to
non-commercial use. A site that quotes and takes hall rentals is commercial by any
reasonable reading, which would eventually mean a forced upgrade to Pro at $20/month.
Cloudflare's and Netlify's free tiers carry no such restriction. Better to start
somewhere the club can stay.

**Database sleep is a real constraint at this traffic level.** Supabase pauses free
projects after seven days of inactivity, and a club site will have quiet weeks — a
renter hitting a cold or paused database is a lost enquiry. D1 does not pause. If we
move off Cloudflare, Turso is the equivalent choice; Neon is acceptable but suspends
after five minutes idle and pays a cold-start penalty.

### Outbound email — solved by DNS, not by money

Transactional providers will not send to arbitrary recipients from a shared sandbox
address; they need a verified sending domain. The club already has one.

**Verifying a domain for sending does not require taking over the website.** It needs
two or three DNS records, and they can be put on a subdomain — `mail.sjvscriponswiss.com`
— which touches none of the records pointing at the current live site. Zero risk to
what is running today, and it can happen long before the handover.

Using a subdomain is also the correct practice regardless: it keeps transactional
sending reputation separate from the club's main domain.

**The ask to whoever manages their DNS is small and specific:** *"Please add these
three TXT records for `mail.sjvscriponswiss.com`."* That is a very different
conversation from *"please transfer the domain."*

Sequencing:

| Stage | Renter gets emailed quote? | Board notified? |
|---|---|---|
| Now, free subdomain, no DNS access | No — quote is a shareable link instead | Yes, at their Gmail |
| DNS records added (can be early) | **Yes** | Yes |
| Full domain handover | Yes | Yes |

The middle stage is the one to aim for, and it costs nothing. Until then enquiries
still land in the admin, which is the system of record anyway, and the renter gets a
referenced link to their quote rather than an attachment.

**One thing to check:** the current site runs on a website builder, which sometimes
manages DNS itself and restricts which records can be added. Worth confirming early —
it determines whether the middle stage is actually available.

### Why not the alternatives

- **Static site + a CMS (Astro + Sanity/Decap).** Cheaper and simpler, but scheduled
  publishing needs scheduled rebuilds, and the quote engine needs a server anyway.
  We would end up bolting one on.
- **WordPress.** Familiar to volunteers and plugin-rich, but it is a security and
  update burden for an organisation with no IT staff, and the smart quote system
  becomes a fight with a booking plugin rather than ~300 lines of our own code.
- **Another site builder.** Cannot do any of the three requested features. This is
  what they have.

### The real risk, stated plainly

A hand-built app needs occasional dependency maintenance; a site builder does not.
If the maintainer disappears, the club is worse off than before. Mitigations:
pin dependency versions, keep the stack boring, document the admin for non-technical
users, and make sure the board owns every account (domain, host, database, Stripe) —
not a volunteer's personal login. **This is why Open Question 3 matters.**

---

## 3. Public pages

| Route | Purpose | Key elements | Data source |
|---|---|---|---|
| `/` | Convince and direct | Hero; **next 3 events, auto**; rent-the-hall CTA; join CTA; centennial note | `Event` |
| `/events` | What's on | Filterable list, month toggle, past-events archive | `Event` |
| `/events/[slug]` | One event | Details, flyer, add-to-calendar, tickets | `Event` |
| `/rentals` | **Sell the venue** | Photo gallery, capacity, indoor+outdoor, what's included, centennial upgrades, member rate | `Page`, `MediaAsset` |
| `/rentals/quote` | **Smart quote builder** | Guided form → itemised estimate → enquiry | `RateCard`, calendar |
| `/rentals/availability` | Is my date free? | Month calendar: open / held / booked | calendar |
| `/rentals/faq` | Remove friction | Policies, insurance, alcohol rules, cancellation, downloads | `Page` |
| `/membership` | Why join | Four tiers, dues, 31 March deadline, benefits | `Page` |
| `/membership/join` | Apply | Online application, Venmo and (later) card | `MembershipApplication` |
| `/about` | 100 years | 1926–2026 story, the hall, the centennial weekend | `Page` |
| `/schwingen` | Swiss wrestling | What it is, practice Thursdays 6pm, WCSWA, results | `Page`, `Event` |
| `/swiss-echoes` | The chorus | Since 1947, video gallery, practice Tuesdays, join | `Page` |
| `/contact` | Reach the right person | **Topic router**, then board directory | `Page`, `BoardMember` |
| `/shop` | Fundraising *(Phase 5)* | Cookbook $35, engraved bricks $150 | `Product` |

**Navigation is flat.** Home · Events · Hall Rental · Membership · Schwingen ·
Swiss Echoes · About · Contact. Nothing hides under "More". `Get a Quote` sits in the
header as the primary button.

### Notes on two pages that need rethinking

**`/contact`** currently lists fourteen names and phone numbers with no hierarchy. It
becomes: *"What do you need?"* → Rent the hall / Join / An event / Swiss Echoes /
Something else → the right person or form. The full board directory stays, below.

**`/rentals`** currently says almost nothing and links to two dead sites. It becomes
the most carefully built page on the site, because it is the one that earns money.

---

## 4. Admin

Everything under `/admin`, behind login.

| Route | Purpose |
|---|---|
| `/admin` | Dashboard: new enquiries, next events, anything expiring soon |
| `/admin/calendar` | **Master month view** — events, holds and bookings in one place |
| `/admin/events` | List, filter, duplicate last year's event |
| `/admin/events/[id]` | Editor — details, images, flyer, **advertising window**, `blocksHall` |
| `/admin/rentals` | Enquiry pipeline: New → Quoted → Held → Booked → Complete |
| `/admin/rentals/[id]` | Review and adjust a quote, hold the date, send it |
| `/admin/pricing` | **Rate card editor** — change prices without a deploy |
| `/admin/pages` | Edit page copy |
| `/admin/media` | Photos and flyers |
| `/admin/members` | Roster and dues status *(Phase 5)* |
| `/admin/users` | Board logins and roles |

### The advertising window control

This is the feature that fixes stale content, so it gets explicit treatment. Each
event editor has a small calendar with **two** date ranges:

```
Event runs:        [ 15 Nov 2026 ]  →  [ 15 Nov 2026 ]
Advertise from:    [ 01 Oct 2026 ]  →  [ 16 Nov 2026 ]     ← defaults to day after
Feature on home:   [ 01 Nov 2026 ]  →  [ 16 Nov 2026 ]     ← optional
```

The public site only ever asks: *which events have an open advertising window today?*
An event that has passed disappears by itself. A Christmas party can be entered in
August and start advertising in November without anyone remembering to go back.

---

## 5. Data model

Sketch, not final schema.

```
User ─────────── id, email, passwordHash, role (admin|editor), lastLoginAt

Event ────────── id, slug, title, description, imageIds[], flyerUrl
                 startsAt, endsAt, allDay, location
                 publishFrom, publishUntil          ← advertising window
                 featureFrom, featureUntil          ← homepage slot
                 status (draft|scheduled|published|archived)
                 blocksHall  ← ties into rental availability
                 ticketed, ticketUrl, priceTiers[]
                 recurrenceRule                     (Phase 2)

RentalInquiry ── id, ref, contactName, email, phone
                 eventDate, eventType, guestCount, spaces[], hours
                 alcohol, isMember, memberName, addOns[]
                 status (new|quoted|held|booked|declined|complete)
                 createdAt, notes

Quote ────────── id, inquiryId, version, lineItems[], subtotal, discount,
                 total, bookingDeposit, damageDeposit, expiresAt, sentAt

QuoteLineItem ── id, quoteId, label, qty, unitPrice, amount, kind

Booking ──────── id, inquiryId, startsAt, endsAt, status, depositPaidAt

Hold ─────────── id, inquiryId, date, expiresAt    ← auto-expires

RateCard ─────── id, space, dayType (weekday|friday|saturday|sunday),
                 season, baseRate, includedHours, hourlyOverage,
                 memberDiscountPct, damageDeposit, effectiveFrom

AddOn ────────── id, label, description, price, unit, requiresAlcohol

Member ───────── id, name, email, tier, joinedAt, duesPaidThrough  (Phase 5)

Page ─────────── id, slug, title, body, updatedAt, updatedBy
MediaAsset ───── id, url, alt, width, height, caption
BoardMember ──── id, role, name, phone, email, sortOrder
AuditLog ─────── id, userId, action, entity, entityId, at
```

---

## 6. Quote engine logic

Calculation order — deliberately explicit, because the club will want to check it:

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
   If serving, add the required line items (licensed bartender, security, and
   surface the insurance-certificate requirement as a condition, not a charge).

6. Subtotal = 2 + 3 + 4 + 5

7. Member discount
   If verified member in good standing → subtract rateCard.memberDiscountPct

8. Total

9. Shown separately and NOT added to the total:
   - Booking deposit (credited against the total)
   - Refundable damage deposit
```

**What makes it "smart" rather than a calculator:**

- It knows the club's own calendar, so it never quotes a date the Schwingfest owns.
- It knows member status and applies a benefit the club already promises.
- It encodes real policy — alcohol implies insurance and a bartender — so renters
  learn the requirements before they ring up, not after.
- It produces a referenced, dated, shareable document a renter can take to a spouse
  or a committee.
- It feeds a pipeline, so no enquiry is lost in a volunteer's inbox.
- Prices live in the database, so the board changes them without a developer.

### Pricing is data, not code

Every number above is read from the database at runtime and edited on
`/admin/pricing`. None of it is compiled in. We build the engine against clearly
marked placeholder rates; the board replaces them with real figures through the admin
before launch.

This matters beyond convenience:

- The build does not wait on a board meeting.
- Raising rates next year is a five-minute job for a volunteer, not a support request.
- Rate cards carry `effectiveFrom`, and quotes store their own line items, so a price
  change never rewrites a quote already in a renter's hands.
- Seasonal and day-of-week variation is just more rows, so the club can experiment
  with a Friday discount without touching the application.

The same principle governs the events calendar: the board adds, edits and schedules
events entirely through `/admin/events`, including the advertising windows. Nothing
about the club's operating year is expressed in code.

---

## 7. Repository layout

```
/
├── README.md                    start here
├── ROADMAP.md                   living plan, backlog, decisions, open questions
├── ARCHITECTURE.md              this file
├── docs/
│   └── current-site-audit.md    everything on the old site, preserved
├── assets/
│   └── img/                     photographs recovered from the old CDN
└── (app code — added once the stack is agreed)
```
