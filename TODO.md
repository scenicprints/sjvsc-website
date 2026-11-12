# To do

Things parked while the site is built. `ROADMAP.md` is the pitch plan and is now
out of date; this is the live list.

## Content

- [ ] **Put the rental saving on the membership page.** Membership is $50 a year and
      takes $600 off a single hall rental — $600 instead of $1,200. That is the
      strongest argument the club has for joining and it is nowhere on the site.
- [ ] Recover the photographs from the Network Solutions builder before the plan is
      cancelled. The four pages that render only a heading — `/playground`,
      `/swiss-miss`, `/may-birthday-celebration`, `/eidgenössisches-2022` — are almost
      certainly galleries, and photography is this project's known shortage.
- [ ] Confirm the board roster and phone numbers in `docs/current-site-audit.md`.
- [ ] Decide what the four empty pages above should redirect to.
- [ ] The monthly club meeting is missing from the events data. December's second
      Wednesday falls the day before the AGM — ask whether the club holds both.

## Before the domain moves

- [ ] Swap Clerk's development instance for a production one. New issuer, new keys,
      and `CLERK_JWT_KEY` / `CLERK_AUTHORIZED_PARTIES` both change with it.
- [ ] Point `sjvscriponswiss.com` at the Worker, with the redirects in
      `MIGRATION.md` §7 for the old URLs that do not match.
- [ ] Transfer the domain off Network Solutions **before** cancelling the builder
      plan, which can take a bundled domain with it.
- [ ] Decide whether to keep the workers.dev address as a staging copy or switch it off.
- [ ] Delete `data/*.json` once D1 is the only source. They are still read as a
      fallback when there is no API, which is what keeps the GitHub demo alive.

## Watch

- [ ] Authorization rests entirely on Clerk being invite-only. If that setting ever
      changes, `worker/auth.js` has to change with it — the comment there says how.
- [ ] `sjvalleyswisshall.com` has lapsed and is unregistered. The old live site still
      links to it from the hall rental page.
