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
- [x] ~~Swap Clerk's development instance for a production one.~~ Done 13 Nov 2026.
      Cloned from the development instance, which carried invite-only across —
      checked on the new instance rather than assumed. Sign-in is served from
      `clerk.sjvscriponswiss.com`; `CLERK_AUTHORIZED_PARTIES` is the live domain
      only, so the admin now works there and not on workers.dev. Accounts did not
      carry over: Kevin is invited, the rest of the board still needs inviting from
      Users → Invitations.
- [x] ~~Redirects for the old URLs that do not match.~~ Done and live: eleven of
      them in `MOVED` in `worker/index.js`, tested on workers.dev. Seven are
      renames; four are judgement calls (`/playground` → `/rentals`,
      `/swiss-miss` → `/club-history`, `/may-birthday-celebration` → `/calendar`,
      `/eidgenössisches-2022` → `/schwingen`) and are one line each to change.
- [x] ~~Point the nameservers at Cloudflare and give the Worker the domain.~~ Done
      13 Nov 2026. sjvscriponswiss.com serves the new site; www 301s to the bare
      domain; the old addresses redirect; workers.dev still works.

- [ ] **Move the registration to Cloudflare. Deadline: April 2027.**

      The website has left Network Solutions but the *name* has not. It is still
      registered through their registrar arm (PDR Ltd), paid to **12 June 2027**,
      on an account whose card has expired and which the club has stopped paying.

      Nothing breaks until that date. On that date, if nobody has paid, the domain
      lapses quietly, sits in a grace period, and is then released for anyone to
      register. Domains belonging to established organisations are watched for
      exactly this.

      Moving it costs about $10.44 a year at Cloudflare, which is less than
      Network Solutions charges and is a bill the club already pays; the transfer
      adds a year, taking it to June 2028. It needs the domain unlocked and an
      auth code, both from the Network Solutions account.

      April 2027 rather than June because transfers take about five days and
      registrars block them close to expiry — and because the real risk is losing
      access to that account, not missing the date.
- [ ] Decide whether to keep the workers.dev address as a staging copy or switch it off.
- [ ] Delete `data/*.json` once D1 is the only source. They are still read as a
      fallback when there is no API, which is what keeps the GitHub demo alive.

## Watch

- [ ] Authorization rests entirely on Clerk being invite-only. If that setting ever
      changes, `worker/auth.js` has to change with it — the comment there says how.
- [ ] `sjvalleyswisshall.com` has lapsed and is unregistered. The old live site still
      links to it from the hall rental page.
