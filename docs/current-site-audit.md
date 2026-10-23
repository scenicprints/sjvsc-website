# Audit of the existing site

**Audited:** 2026-10-22 · **Source:** https://sjvscriponswiss.com/ (website-builder template)

This file preserves everything found on the old site so content work can continue
without re-scraping. It is a record of *what exists today*, not what we are building.

---

## 1. Pages found

| Page | URL | In main nav? |
|---|---|---|
| Home | `/` | Yes |
| Calendar | `/calendar` | Yes |
| Hall Rental | `/hall-rental` | Yes |
| Membership | `/membership` | Yes |
| Contact | `/contact` | Yes |
| Schwingfests | `/schwingfests` | **No — hidden under "More"** |
| Oktoberfest | `/oktoberfest` | **No — hidden under "More"** |
| Swiss Echoes | `/swiss-echoes` | **No — hidden under "More"** |

Three of eight pages, including two that drive attendance and ticket sales, are
reachable only through a "More" dropdown.

---

## 2. The stale-content problem (the case for publish windows)

As audited on **22 October 2026**, the homepage still led with:

- The 100th Anniversary Championship Schwingfest, **4–6 September 2026** — seven weeks past.
- Oktoberfest, **3 October 2026** — nearly three weeks past.
- A recap of the **11 April 2026** Swiss Echoes concert, still presented as news.

Meanwhile the five events that *were* still ahead appeared only as plain text
part-way down the Calendar page:

- Wed **11 Nov 2026** — Club Meeting, 7:00 pm
- Sun **15 Nov 2026** — Fall Jass Party
- Sat **5 Dec 2026** — Children's Christmas Party
- Thu **10 Dec 2026** — Annual General Meeting
- Sat **12 Dec 2026** — Swiss Echoes Christmas Party

The Swiss Echoes page also still reads *"In 2017, the 'Swiss Echoes' **will be**
hosting the 29th Sängerfest"* — a future-tense sentence about an event nine years past.

**Conclusion:** this is not carelessness, it is a structural fault. Event content is
entered as free text in three separate places (homepage, Calendar page, event page)
with no expiry. Nothing removes it when the date passes. The fix is an events table
with `publishFrom` / `publishUntil` and an automatic default of "stop advertising the
day after the event."

---

## 3. Hall rental is broken

`/hall-rental` carries almost no information and links out to two separate rental sites:

| Link on the page | Status checked 2026-10-22 |
|---|---|
| `sjvalleyswissclub.godaddysites.com` | **404 Not Found** |
| `sjvalleyswisshall.com` | **Domain does not resolve** (DNS failure) |

A Wayback snapshot from **5 Oct 2025** shows the GoDaddy site had `Home / About /
Photo Gallery / Application & Fees / F.A.Q. / Contact`. The Internet Archive was
partly offline during this audit, so the **Application & Fees** page could not be
recovered.

**Net effect: the club publishes no hall rental pricing anywhere on the internet.**
This is the single largest revenue gap on the site and a hard blocker for the quote
engine — see Open Questions in `ROADMAP.md`.

What the page does say:

> Indoor and outdoor venue — dinner reception outside, dancing inside.
> 2026 centennial improvements: new entrance replacing the 1940s door; dance floor
> refinished; remodelled kitchen with stainless steel prep island; new playground.

---

## 4. Content worth keeping

### Mission statement (membership page, verbatim)
> To unite and strengthen the social ties of the Swiss people, those of Swiss descent
> and their supporting friends; and to encourage, promote and preserve the culture and
> traditions of Switzerland.

### Membership tiers
| Tier | Eligibility | Notes |
|---|---|---|
| Regular | Swiss or of Swiss descent, 16+ | Approved at any monthly meeting |
| Social | Non-Swiss supporters | No vote/office for 5 years, then auto-converts to Regular. Approved at AGM only |
| Spousal | Spouse of any member | No initiation fee, no annual dues |
| Life | — | $25/yr |

- Dues **$50/yr**; one-time initiation **$10**; initiation waived under 18.
- Due by **31 March**; **$20 late fee** after.
- Venmo **@Ripon-Swiss-Club**, memo = name + "Membership Dues".
- Membership stood at **702** as of 1 April 2026.
- Monthly meetings: **2nd Wednesday, 7:00 pm**, at the hall.

### Member benefits (as written)
1. Notified of all club events by mail or email.
2. Notified of deaths and funeral arrangements of members on request.
3. Free meal for member, spouse and children under 18 at the Annual Member's BBQ;
   unmarried members get one guest meal.
4. Swiss community in a friendly, safe, clean environment.
5. **Discounted hall rental rate.** ← must be wired into the quote engine

### Swiss Echoes (chorus)
Founded **1947**, 28 charter members, first director John Meyer. Member of the United
Swiss Singing Societies of the Pacific Coast (USSSPC); has attended every Sängerfest
since 1948. Hosted the first California Swiss Singing & Jodeling Festival (1956), the
10th Sängerfest (1960), the 16th (1978), the 24th (2002) and the 29th (2017).
Currently 32 mixed voices, director Agnes Litfin-Olmsted (Stockton), accompanist
SaraRae Vanderhelm (Modesto). Spring and Fall concerts in Swiss costume.
Practice **Tuesdays 7–9 pm** at the hall. New members welcome.
Contact **SJVSwissEchoes@gmail.com**. President: Chico Gunder, (209) 322-5199.
Secretary: Margrith Reichmuth.

April 2026 concert drew **75+ singers from across the country**: alphorns, yodelers,
Swiss Enzian Choir, Salt Lake City Chorus, Jakob Bean, Haslital Kapelle for the dance.
Videos filmed by Bob Bronzan (YouTube).

### Schwingen (Swiss wrestling)
Switzerland's national sport; wrestled in a circular sawdust ring. Practice
**Thursdays 6:00 pm** at the hall — contact Don, (209) 915-4245. Club runs Spring
Schwingfest (June), Buebe/Meitli Schwingfest for children (July), and the
Championship Schwingfest (September) under the **West Coast Swiss Wrestling
Association**. Events include Steinstossen (stone put). 2025 Eidgenössisches
Schwingfest Schlussgang ended in a tie; Armon Orlik became Schwingerkönig.

### 100th Anniversary weekend (4–6 Sept 2026) — past, keep for the history page
- Fri: cocktail social 7–10 pm, no entry fee
- Sat: WCSWA Championship Schwingfest. $20 admission (15+). Sign-ups 10 am, wrestling
  11 am, lunch counter noon, dignitaries 1 pm. Steak & Älplermagronen dinner 6–7:30 pm,
  $40 adult / $20 child. Dancing and awards after.
- Sun: 10:30 am Mass; 11:30 am Buebe Schwingfest check-in (under 15), Steinstossen,
  parade; chicken & rib dinner 5:30–7 pm, $40 adult / $20 child.

### Fundraisers
- **Centennial cookbook** — $35.
- **Engraved playground bricks** — $150, 3 rows × 20 characters. Playground installed.

### Oktoberfest (3 Oct 2026) — tickets sold by phone only
Gary Marchy (209) 606-5844 · Andrea Imfeld (209) 665-9149 · Lori Marchy (209) 678-1265 ·
Lisa Vanderveen (209) 505-5165 · Alena Imfeld (408) 528-4693

---

## 5. Board & contacts

| Role | Name | Phone |
|---|---|---|
| President | Chris Portmann | (209) 495-2366 |
| 1st VP | Gary & Bob Marchy | (209) 606-5844 |
| 2nd VP | Karen Aufdermaur | (209) 324-9532 |
| Treasurer | Marge Betschart | (209) 595-6784 |
| Treasurer | Erika Betschart | — |
| Financial Secretary | Margie Imfeld | (209) 531-7574 |
| Corresponding Secretary | Anna Newburg | (209) 276-5067 |
| Membership | Cathy Quinn | (209) 602-4366 |
| Swiss Echoes President | Chico Gunder | (209) 322-5199 |
| Memorials | Peggy Kaelin | (209) 599-2352 |
| Trustees | John Ott, Larry Betschart, Don Widmer | — |
| Wrestling practice | Don | (209) 915-4245 |
| Caretaker | **Vacant — club is recruiting** | — |

- Hall: **110 N. Manley Road, Ripon, CA 95366** (East Main St & Manley Rd)
- Mail: **P.O. Box 373, Ripon, CA 95366**
- General email: `riponswissclub.secretary@gmail.com`
- Hall rental email: `SJValleySwissClub@gmail.com`
- Swiss Echoes: `SJVSwissEchoes@gmail.com`
- Website contact: `cmschallberger@gmail.com`
- Facebook: `facebook.com/riponswissclub` · Instagram: `@ripon_swiss_club`
- Founded **1926**; hall incorporated **1941** (per the carved sign on the building)

---

## 6. Copy errors to fix during migration

| Page | Error | Correction |
|---|---|---|
| Home, Swiss Echoes | "vidoes" | videos |
| Home | "voices, musical talents and and cultural experiences" | remove duplicate "and" |
| Contact | "Financial Secretay" | Secretary |
| Contact | "Cooresp. Secretary" | Corresponding Secretary |
| Membership | "those joing before" | joining |
| Membership | "Let's all get invovlved" | involved |
| Oktoberfest | "Saturday, October 3th 2026" | October 3, 2026 |
| Schwingfests | "Aelpler Magaraona" | Älplermagronen |
| Swiss Echoes | "were inhosting" | were in hosting |
| Hall Rental | "New playgound" | playground |
| All | "Copyright © All Rights Reserved" | add year and legal entity name |
| All | Body copy set in ALL CAPS | sentence case |

---

## 7. Recovered photography

Pulled from the old CDN, EXIF-rotated, resized and recompressed into `assets/img/`:

| File | Source | Suggested use |
|---|---|---|
| `hall-sign.jpg` | Carved "San Joaquin Valley Swiss Club" sign, Est. 1926 / Inc. 1941 | Hero, about page |
| `hall-dancefloor.jpg` | Refinished dance floor, bar, Swiss cantonal crests, string lights | Rentals hero |
| `hall-banquet.jpg` | Full banquet seating, several hundred guests | Rentals — capacity proof |
| `hall-entrance.jpg` | ~~Hall entrance~~ Actually a screenshot of their "Hall for Rent" yard sign. Removed from the site | Was in the rentals gallery |
| `schwingen-kids.jpg` | Two boys in Schwingen breeches in the sawdust ring | Schwingen page |
| ~~`alphorns.jpg`~~ | Alphorn players, Bernese Alps | Deleted — generic stock, not the club |

Six usable photographs total. **This is not enough** — the rentals page in particular
needs a proper shoot. See Open Questions.
