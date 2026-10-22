# Continuing this on another machine

**Live:** https://scenicprints.github.io/sjvsc-website/
**Repo:** https://github.com/scenicprints/sjvsc-website (public)

## Setup

```bash
git clone https://github.com/scenicprints/sjvsc-website.git
cd sjvsc-website
python -m http.server 8000     # then open http://localhost:8000
```

That is the whole setup. No install, no dependencies, no framework, no build step.

### To push

Cloning needs nothing. Pushing needs credentials once:

```bash
gh auth login
```

Choose **GitHub.com → HTTPS → authenticate in browser**, and say **yes** when it asks
to authenticate Git with your GitHub credentials. That configures the credential
helper, and `git push` works from then on.

No `gh`? Make a fine-grained token at github.com/settings/tokens with
**Contents: read and write** on this repository, and use it as the password when git
prompts. Tokens can only be created in the web interface, not from the command line.

**A push to `main` is a deploy.** GitHub Pages serves the root of `main`; changes are
live in about a minute.

## Where things are

```
index.html, *.html        the 14 pages, at the repository root
assets/css/site.css       the whole design system
assets/js/site.js         navigation, scroll-to-top, the timeline
assets/js/quote.js        the hall rental quote engine; rates are at the top
assets/img/arms/          26 cantonal arms (public domain, Wikimedia)
assets/img/               6 photographs recovered from the old site
docs/current-site-audit.md  everything the old site said — the source of truth
tools/                    one script, see below
ROADMAP.md                plan, decisions, what is left
ARCHITECTURE.md           page map, data model, how the quote engine works
```

## Rules this project runs on

These were all learned the hard way. Breaking them is how the work gets rejected.

1. **Never invent a fact about the club.** Everything verifiable lives in
   `docs/current-site-audit.md`. If a claim is not in there, it does not go on the
   site. Earlier drafts invented a capacity, a maple floor, a stage, a commercial
   range, a curfew and a dairy-farming origin story. All were removed.
2. **Write plainly.** State what a thing is, when it happens and what it costs.
   No sentence fragments for rhythm, no em-dash asides, no lists of three for
   cadence, no evocative scene-setting. "Practice is Thursday at 6pm", not
   "Thursday evenings, in a ring of sawdust".
3. **Show, do not tell.** Nothing on a public page explains how the site works.
   A note reading "this page stays current because each event carries dates" was
   removed for this reason.
4. **Placeholders are deliberate.** Rental figures are illustrative and stand in for
   an admin rate card. Event detail pages are intentionally empty labelled blocks,
   to show what the admin would control. Do not fill them with invented content.
5. **The design is graphic-led on purpose.** Only six photographs exist — the club's
   own Instagram is flyers, not photos. Type, flat colour, heraldry and layout carry
   the pages. Do not restructure around imagery that is not there.
6. **No build step.** Do not add a framework, a bundler or dependencies.
7. **Keep `prefers-reduced-motion` working.** Every animation has an off switch.

## Two implementation notes

- `index.html` is a standalone document, because GitHub Pages serves it directly.
  The Claude artifact viewer needs the same content without the outer document, so
  `python tools/make-artifact-index.py` generates `artifact-index.html` for that.
  It is gitignored.
- Inside the timeline's scroll container, `scroll-snap`, CSS `scroll-behavior` and
  `scrollTo({behavior:'smooth'})` all fail, and `requestAnimationFrame` does not run
  at all in a minimised window. The timeline therefore eases by hand with a timer
  that guarantees it lands. If you test in a headless or background browser and an
  animation "does nothing", suspect this before suspecting the code.

## What is next

The public site is done. Not started:

1. **Admin demo** — login, event editor with advertising windows
   (`publishFrom` / `publishUntil`), rate card editor, master calendar.
2. **A flat Schwingen emblem** to sit alongside the cantonal arms — the one piece of
   generated artwork that would match. See `docs/image-prompts.md`.

`ROADMAP.md` has the full backlog and the decision log.

## Context

This is a **concept pitch built on spec**. The club has not asked for it and is not
involved. The audience is their board. The repository is public, which means
`ROADMAP.md` and `docs/current-site-audit.md` — which contain pitch strategy and a
blunt assessment of their current site — are public too. That was a deliberate
trade for free hosting.
