# Architecture

How the site is put together: the stack, every page, the data behind them, and the
one idea that connects it all.

**Status:** proposed, pending sign-off. Stack is Open Question 1 in `ROADMAP.md`.

---

## 1. The organising idea

> **One calendar is the source of truth. Everything else reads from it.**

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

---

## 2. Stack

### Recommendation

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Public pages and admin in one codebase; server-rendered for SEO |
| Styling | **Tailwind CSS** | Fast, consistent, no stylesheet archaeology later |
| Database | **Postgres** (Neon or Supabase) | Relational data; generous free tier |
| ORM | **Drizzle** or **Prisma** | Typed queries, versioned migrations |
| Auth | **Auth.js** | Email + password or magic link; roles |
| Email | **Resend** or **Postmark** | Quotes and enquiry notifications |
| Hosting | **Vercel** | Deploys from GitHub on push; free tier covers this easily |
| Payments | **Stripe** (Phase 4 only) | Industry standard; defer until the board decides |

**Running cost at Phase 3: roughly $0–20/month**, plus the domain. Payments add
transaction fees but no fixed cost.

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

**Not yet buildable.** Every number above comes from a rate card that does not exist
publicly. See Open Question 1 — this is the one blocker that cannot be designed around.

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
