# San Joaquin Valley Swiss Club — website rebuild

A new website for the San Joaquin Valley Swiss Club (SJVSC) of Ripon, California,
founded 1926. Replaces https://sjvscriponswiss.com/.

## Start here

| File | What's in it |
|---|---|
| **[ROADMAP.md](ROADMAP.md)** | The living plan: goals, feature backlog, phases, decisions, open questions. **Read this first.** |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, every page, the data model, how the quote engine works |
| [docs/current-site-audit.md](docs/current-site-audit.md) | Everything on the old site: content, contacts, copy errors, what's broken |

## The three features driving the build

1. **An admin with scheduled publishing.** Events carry an advertising window, so they
   appear and disappear on their own. The old site still had a September event on the
   homepage in late October.
2. **A smart hall-rental quote system.** Checks the club's own calendar for
   availability, prices the booking from an admin-editable rate card, applies the
   member discount, and files the enquiry. Both of the club's old rental sites are
   dead, so the club currently publishes no pricing at all.
3. **A public site that does the club justice.** 702 members, 100 years, a wrestling
   programme and a chorus founded in 1947.

## Status

**Phase 0 — stack agreed, scaffolding next.** No application code yet.
`assets/img/` holds six photographs recovered from the old site's CDN.

Built to run at **$0**: Next.js + Drizzle on Cloudflare Workers/Pages with a D1
database, on a temporary subdomain until the club hands over `sjvscriponswiss.com`.

**Governing principle:** if a board member would ever want it different, it lives in
the database with a screen in the admin — rates, events, page copy, contacts. The club
has to run this without a developer. See `ARCHITECTURE.md` §1b.

## Resuming on another machine

```bash
git clone <this repo>
cd sjvsc-website
```

Then read `ROADMAP.md`. Its changelog records what was last done and its open
questions record what is blocked and on whom.
