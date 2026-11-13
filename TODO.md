# To do

Things parked while the site is built. `ROADMAP.md` is the pitch plan and is now
out of date; this is the live list.

## Content

- [ ] **Put the rental saving on the membership page.** Membership is $50 a year and
      takes $600 off a single hall rental — $600 instead of $1,200. That is the
      strongest argument the club has for joining and it is nowhere on the site.
- [x] ~~Recover the photographs from the Network Solutions builder.~~ Done
      13 Nov 2026: `archive/old-site/` holds all 32, at full size, plus the 3 PDFs.
      The four heading-only pages were **not** galleries — seven photographs between
      them — and nine of the twenty-four pages carry none at all. There is no trove,
      so the thin bands must be filled by a camera.
- [ ] Confirm the board roster and phone numbers in `docs/current-site-audit.md`.
- [ ] **More photographs for the thin bands.** Every page's side pictures are now in
      the band at its foot, but `schwingen` and `camp` have one each, so the band shows
      a single still picture rather than moving. `history`, `hall` and `wcswa` have two.
      Six fills a band.
- [ ] Decide what the four empty pages above should redirect to.
- [ ] The monthly club meeting is missing from the events data. December's second
      Wednesday falls the day before the AGM — ask whether the club holds both.

## Decide

- [x] ~~How a photograph gets uploaded.~~ Done: the Pictures screen opens a file
      chooser, resizes on the device and stores the bytes in D1. R2 was the textbook
      answer and wanted a subscription; the database was already here.

## Before the domain moves

What the registry says, checked 13 Nov 2026: `sjvscriponswiss.com` is registered
through **PDR Ltd. (PublicDomainRegistry)**, Network Solutions' registrar arm, paid
to **12 June 2027**, and locked with `clientTransferProhibited`. DNS is theirs too
(`ns1/ns2.worldnic.com`), and the zone holds nothing but an A record for the apex
and one for `www`. **There are no MX records**, so no club email can break: every
address the club publishes is Gmail.

That means going live does not need a transfer. Repointing the nameservers is
enough, it takes minutes, and it is reversible. The transfer is a separate, later
step whose only purpose is to make cancelling the builder plan safe.

- [ ] **Deploy the pending fix.** `.git/` and `.wrangler/` were being served as
      static assets — the whole repository was fetchable from the live site. Fixed
      in `.assetsignore` and committed, but Cloudflare's API was returning 500 on
      version creation (Workers degraded on their status page), so it has not gone
      out. Re-run `npx wrangler deploy` once they recover and confirm
      `/.git/config` 404s.
- [ ] Swap Clerk's development instance for a production one. New issuer, new keys,
      and `CLERK_JWT_KEY` / `CLERK_AUTHORIZED_PARTIES` both change with it.
      **Invite-only must be set again on the new instance** — it is a separate
      instance and the setting does not carry over, and `worker/auth.js` depends on
      it entirely. The board's accounts do not carry over either; they need
      re-inviting.
- [x] ~~Redirects for the old URLs that do not match.~~ Done and live: eleven of
      them in `MOVED` in `worker/index.js`, tested on workers.dev. Seven are
      renames; four are judgement calls (`/playground` → `/rentals`,
      `/swiss-miss` → `/club-history`, `/may-birthday-celebration` → `/calendar`,
      `/eidgenössisches-2022` → `/schwingen`) and are one line each to change.
- [ ] Point the nameservers at Cloudflare, add the zone, give the Worker the custom
      domain. **Needs the Network Solutions login.**
- [ ] Transfer the registration off Network Solutions **before** cancelling the
      builder plan, which can take a bundled domain with it. Needs the lock removed
      and an auth code, both from that same account.
- [ ] Decide whether to keep the workers.dev address as a staging copy or switch it off.
- [ ] Delete `data/*.json` once D1 is the only source. They are still read as a
      fallback when there is no API, which is what keeps the GitHub demo alive.

## Watch

- [ ] Authorization rests entirely on Clerk being invite-only. If that setting ever
      changes, `worker/auth.js` has to change with it — the comment there says how.
- [ ] `sjvalleyswisshall.com` has lapsed and is unregistered. The old live site still
      links to it from the hall rental page.
