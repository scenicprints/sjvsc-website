# SJVSC concept site

A concept website for the **San Joaquin Valley Swiss Club** of Ripon, California,
founded 1926 — built on spec to show the club what their site could be.

Their current site: https://sjvscriponswiss.com/

> **This is a pitch, not a commissioned build.** The club has not asked for it and is
> not involved yet. If they like it, the concept becomes the basis for their real site.

## Start here

| File | What's in it |
|---|---|
| **[ROADMAP.md](ROADMAP.md)** | The living plan: what success means, phases, backlog, decisions. **Read this first.** |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, every page, the data model, how the quote engine works |
| [docs/current-site-audit.md](docs/current-site-audit.md) | Everything on the old site: content, contacts, copy errors, what's broken |

## What the demo has to prove

1. **It looks like a different class of thing.** Theirs is a builder template; this
   should look designed for a 100-year-old Swiss cultural club, specifically.
2. **Events can't go stale.** Each event carries an advertising window and removes
   itself. Their homepage currently leads with a September event — in late October.
3. **The hall can be quoted online.** A smart quote system that checks the club's own
   calendar for availability, prices from an editable rate card, and applies the member
   discount. Both of their old rental sites are dead, so the club publishes no pricing
   at all today.

## Status

**Phase 0 complete — design next.** No application code yet.
`assets/img/` holds six photographs recovered from the old site's CDN.

Built to run at **$0**: Next.js + Tailwind, statically exported to Cloudflare Pages,
with seeded data and no backend. A demo needs no database, and nothing that can fail
during a presentation should exist. See `ARCHITECTURE.md` §2 for what swaps if the
club says yes.

## Resuming on another machine

```bash
git clone https://github.com/scenicprints/sjvsc-website.git
```

Then read `ROADMAP.md` — its changelog records what was last done.
