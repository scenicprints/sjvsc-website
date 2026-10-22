# Roadmap — San Joaquin Valley Swiss Club website

**Living document.** Updated as work proceeds. If you are picking this up on another
machine, read this file first, then `ARCHITECTURE.md`, then `docs/current-site-audit.md`.

- **Client:** San Joaquin Valley Swiss Club (SJVSC), 110 N. Manley Road, Ripon, CA
- **Existing site:** https://sjvscriponswiss.com/ (website-builder template, to be replaced)
- **Status:** Phase 0 — planning
- **Last updated:** 2026-10-22

---

## Why we are rebuilding

The club turned 100 in 2026 and has 702 members, a hall worth renting, a wrestling
programme, a 79-year-old chorus and a calendar with roughly 25 events a year. The site
represents almost none of that. Three findings from the audit frame the whole project:

1. **Content rots in place.** On 22 Oct 2026 the homepage still led with a September
   event and an April concert recap. Events are typed as free text in three places and
   nothing expires them.
2. **Hall rental is offline.** Both rental sites the page links to are dead — one 404s,
   the other's domain no longer resolves. The club publishes no rental pricing anywhere.
3. **Money moves by phone call.** Oktoberfest tickets are sold by ringing one of five
   people. Dues go through Venmo and are reconciled by hand.

Each maps to one of the three features requested: scheduled publishing, a smart quote
system, and an admin that non-developers can actually run.

---

## Goals, in priority order

1. **Fill the hall.** Rental enquiries are the clearest revenue the site can generate.
2. **Fill the seats.** Make events discoverable and, eventually, buyable.
3. **Never look abandoned again.** Content expires itself; the homepage is always current.
4. **Hand it over cleanly.** A board member must be able to run it without a developer.
5. **Do the club justice.** 100 years deserves better than a template.

### Measures of success
- Rental enquiries per month (baseline: unknown, likely near zero — no pricing published)
- Quote-to-booking conversion
- Online ticket sales as a share of event revenue
- Days between an event passing and it leaving the homepage (target: 0)
- Board members who have logged into the admin and made an edit unaided (target: 3+)

---

## Feature backlog

Legend: `[ ]` not started · `[~]` in progress · `[x]` done · **(P1)** priority tier

### A. Events engine — *replaces the stale-content problem*
- [ ] **(P1)** Event records with `startsAt` / `endsAt`
- [ ] **(P1)** **Advertising window** — `publishFrom` / `publishUntil` per event, so the
      admin picks on a calendar exactly when an event appears and disappears
- [ ] **(P1)** Default `publishUntil` to the day after the event, so nothing can rot
- [ ] **(P1)** Draft → Scheduled → Published → Archived states
- [ ] **(P1)** Homepage "what's next" generated from the DB, never hand-typed
- [ ] **(P1)** `blocksHall` flag — club events make the date unavailable to renters
- [ ] **(P2)** Recurring events (monthly meeting = 2nd Wednesday, 7 pm)
- [ ] **(P2)** Featured slot with its own date window
- [ ] **(P2)** Add-to-calendar (.ics) per event
- [ ] **(P2)** Event detail pages with structured data for Google
- [ ] **(P3)** Past-event galleries

### B. Smart quote system — *the headline feature*
- [ ] **(P1)** Availability check against club events, holds and confirmed bookings
- [ ] **(P1)** Guided quote builder: date → space → guests → hours → add-ons → total
- [ ] **(P1)** Itemised estimate on screen, no "call us for pricing"
- [ ] **(P1)** Member rate applied automatically (an existing member benefit)
- [ ] **(P1)** Alcohol toggle drives required insurance / bartender / security line items
- [ ] **(P1)** Enquiry lands in the admin pipeline and emails both parties
- [ ] **(P2)** Admin-editable rate card — raise prices without a deploy
- [ ] **(P2)** Tentative holds with automatic expiry
- [ ] **(P2)** Suggest nearby open dates when the chosen one is taken
- [ ] **(P2)** Shareable quote link with reference number and expiry date
- [ ] **(P3)** Convert accepted quote into contract and invoice
- [ ] **(P3)** Online deposit payment

### C. Admin
- [ ] **(P1)** Login with roles (Admin / Editor)
- [ ] **(P1)** Dashboard — new enquiries, upcoming events, anything expiring
- [ ] **(P1)** Month-view calendar: events, holds and bookings in one place
- [ ] **(P2)** Editable page content for non-developers
- [ ] **(P2)** Media library for photos and flyers
- [ ] **(P2)** Audit log — who changed what
- [ ] **(P3)** Member roster and dues status

### D. Public site
- [ ] **(P1)** Flat navigation — no page hidden under "More"
- [ ] **(P1)** Mobile-first; most of this audience arrives from Facebook on a phone
- [ ] **(P1)** Rentals page that sells the venue: photos, capacity, what's included
- [ ] **(P1)** Membership page with tiers, dues, deadline and benefits
- [ ] **(P1)** Contact page that routes by topic instead of listing 14 phone numbers
- [ ] **(P1)** Content migrated and copy-edited (see audit §6 for the error list)
- [ ] **(P2)** About / 100-year history
- [ ] **(P2)** Schwingen explainer — strong search traffic, genuinely interesting
- [ ] **(P2)** Swiss Echoes page with organised video gallery and join form
- [ ] **(P2)** Local-business structured data — matters for "event venue Ripon CA"
- [ ] **(P2)** Newsletter signup
- [ ] **(P3)** Caretaker vacancy as a real posting, not a line in a contact list
- [ ] **(P3)** Shop: cookbook ($35), engraved playground bricks ($150)
- [ ] **(P3)** Spanish translation

### E. Payments — *later, and deliberately so*
- [ ] **(P3)** Online dues with automatic receipt, alongside Venmo
- [ ] **(P3)** Renewal reminders before the 31 March deadline
- [ ] **(P3)** Event ticketing — replaces phoning five people for Oktoberfest
- [ ] **(P3)** Sponsorship packages
- [ ] **(P3)** Donations

---

## Phases

| Phase | Scope | Why this order |
|---|---|---|
| **0. Foundation** | Repo, stack, hosting, deploy pipeline, design direction | Nothing ships without it |
| **1. Public site** | Real content, real photos, mobile, flat nav — content still in code | Fixes the embarrassment fastest; no backend risk |
| **2. Admin + events** | Login, events engine, advertising windows | Kills stale content permanently |
| **3. Quote system** | Availability, quote builder, enquiry pipeline | Needs Phase 2's calendar as its source of truth |
| **4. Payments** | Dues, tickets, deposits | Needs a board decision on fees and a bank account |
| **5. Extras** | Members area, shop, translation | Only once the above is stable |

Phase 1 is deployable on its own and worth shipping before Phase 2 exists.

---

## Decision log

Decisions are recorded here with their reasoning so they can be revisited rather than
re-argued.

| # | Date | Decision | Reasoning |
|---|---|---|---|
| 1 | 2026-10-22 | Rebuild rather than restyle the existing builder site | The three core features cannot be built on it |
| 2 | 2026-10-22 | Keep the project in Git on GitHub | Work must resume on any machine |
| 3 | 2026-10-22 | `ROADMAP.md` is the living record | One file to read first, whatever machine you are on |
| — | — | *Stack: pending* | See Open Question 1 |

---

## Open questions and blockers

Ordered by how much they block. **1–3 need answers from the club, not from us.**

1. **Hall rental pricing — hard blocker on the quote system.**
   Nothing is published anywhere and both old rental sites are dead. Needed from the
   board: base rates, whether Friday/Saturday differ, seasonal variation, the member
   discount, the included hours and the overage rate, the damage deposit, add-on
   pricing (kitchen, bar, tables and chairs, linens, PA, cleaning), and the alcohol
   rules — who must be insured, whether a licensed bartender or security is required.
   *Until these exist the quote engine cannot be built, only scaffolded.*

2. **Who is the client contact and who approves?**
   The President (Chris Portmann) and the rental coordinator are the obvious two. Is
   there a board vote, or does one person sign off?

3. **Who administers it after handover?**
   This determines how much the admin must hold the user's hand. A single competent
   volunteer is a different design from "three board members who rotate annually."

4. **Budget.** Hosting and domain can run near zero; payments add Stripe fees
   (~2.9% + 30¢). Someone must own the accounts and the card on file.

5. **Domain.** Keep `sjvscriponswiss.com`, or move to something people can actually
   spell? The dead `sjvalleyswisshall.com` suggests domains have already been lost
   once — find out who holds the registrar login before anything else.

6. **Photography.** Six usable images recovered. The rentals page needs a proper
   shoot: empty hall, set for a wedding, the kitchen, the grounds, the playground,
   the new entrance. Is there a club photographer, or a budget?

7. **Existing data.** Is there a member list, a rental enquiry history or a booking
   calendar in a spreadsheet somewhere that should be imported?

8. **The Swiss Echoes relationship.** Separate officers, separate email, separate
   membership. Sub-section of this site, or their own thing that we link to?

---

## Changelog

### 2026-10-22
- Audited all eight pages of the existing site; recorded content, contacts and copy
  errors in `docs/current-site-audit.md`
- Confirmed both hall rental sites are dead (404 and DNS failure)
- Recovered six photographs from the old CDN; rotated, resized and recompressed
- Drafted feature backlog, phases and architecture
- Repo initialised
