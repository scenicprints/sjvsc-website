# The old site, kept

A copy of what stood at `sjvscriponswiss.com` before the club moved, taken on
**13 November 2026** while the old site was still serving. It is here so that
cancelling the Network Solutions plan destroys nothing.

- `pages/` — the text of all 25 pages, one file each, as it read on screen.
- `images/` — 34 pictures from the builder's shared library, 7.1 MB.
- `images-2/` — **98 of the club's own photographs, 51.7 MB.** These are the
  Oktoberfest crowds, the kitchen crews, the schwingfest rings, the Members'
  BBQ, the children's Christmas party.
- `documents/` — the 3 PDFs the site linked to, 6.6 MB.
- `pages.txt`, `image-ids.txt` — what was on each page, and where it came from.

A running copy of the whole thing is `../SJVSC-old-site.exe`. It is one file,
installs nothing, and reaches no network. Run it and the old site opens in its
own window — no tabs, no address bar, its own entry on the taskbar — and you
click through it as it was.

## A correction

An earlier pass through this material concluded that the club had only 32
photographs online and that there was "no trove". **That was wrong**, and the
mistake is worth recording because it is an easy one to repeat.

The builder keeps pictures in two different places. The shared library lives
at `wzukusers/user-N/images/<folder>/<name>.jpg`. The club's own uploads do
not: they live at `production-websitebuilder-v1-0-7` and `-v1-0-9`, under
names that are a bare 32-character hash **with no file extension at all**. A
search for pictures that ended in `.jpg` therefore found the stock library and
missed almost everything the club had actually taken.

What exposed it was building the offline copy, not inspecting the pages: a
hundred images came back broken, and every one of them was a photograph nobody
had looked for. The real count is **132**.

The lesson is that a page renders what it renders. Counting from a pattern is
counting what the pattern knows about.

## What was taken, and how

The old site was built with Network Solutions' Website Builder (Webzai). It
renders entirely in JavaScript: the HTML served to a browser or a search
engine contains the page title and nothing else — no headings, no body text,
not one link. That is worth recording on its own, because it means the club's
site has been effectively invisible to Google for as long as it has existed.
The new site is plain HTML and is not.

So the pages were opened in a real browser and read after rendering. The
pictures were then pulled at full size: most were being served as `_d400` or
`_d600` thumbnails with the originals still sitting behind them, which is why
`Alphorns_Grindelwald.jpg` is 702 KB here and was 40 KB on the page.

## About the text

Taken from the rendered page, so it is what a visitor read, not what the
builder stored. The club's own typos are kept — "vidoes", "Secretay",
"invovlved", "JAPRIL", the year "20026" — because an archive that quietly
corrects its source stops being one. Where a page contradicted itself or
pointed somewhere dead, a bracketed note at the foot of that file says so.
Several are worth knowing: `/swiss-miss` was still advertising a deadline of
31 July 2021, `/playground` still carried two paragraphs of the website
builder's placeholder text, and `/memorials` gave a phone number with a digit
missing.

German letters came back from the capture flattened, so they are written out
as ae, oe and ue. The club spells it Küche Kästli Kochbuch.

## What is not here

- **Three pictures that were already broken on the live site.** The
  scholarships page referenced a 404; two logos belonging to other clubs
  (`lpss.info`, a GoDaddy-hosted banner) no longer resolve at their own ends.
- **The embedded video.** The Swiss Echoes page carried twelve videos in
  players from another service. Only their titles survive.
- **Link targets on `/other-swiss-clubs`.** Those buttons were images with
  click handlers rather than links, so the destinations could not be read back
  out of the rendered page.
