# Building the archived old site

These four scripts turn the live `sjvscriponswiss.com` into
`archive/SJVSC-old-site.exe` — one file that serves the old site to your own
browser, offline, forever.

They are kept because the old site will not be there to capture twice. If the
copy ever has to be rebuilt or corrected, this is how it was made.

## Running them

Needs Python and Chrome. Playwright drives the Chrome already on the machine,
so there is no 150 MB browser download:

    python -m venv venv
    venv\Scripts\python -m pip install playwright pyinstaller

    venv\Scripts\python capture.py raw        # render all 25 pages, keep the DOM
    venv\Scripts\python harvest_rest.py       # the club's own photographs
    venv\Scripts\python build_offline.py      # assemble the browsable folder
    venv\Scripts\python check_offline.py      # open it with the network cut off

    venv\Scripts\python -m PyInstaller --onedir --name "SJVSC Old Site" ^
        --add-data "offline;site" --windowed launcher.py

## Why it is not just "save page as"

The builder draws every page in JavaScript. The HTML it serves carries a title
and nothing else, so an ordinary download gets a blank page. Three things had
to be solved:

**The layout is computed.** Boxes are positioned absolutely and their heights
are set at run time. Strip the script — which a saved copy must, or it runs
again against a site that is gone — and every container collapses, the content
falls to the bottom of the page and the whole thing shows as a red void. So
`capture.py` writes the geometry the browser worked out back into each
element's own style attribute before saving. After that the layout stands on
its own.

**The colours are computed too.** The palette arrives through classes like
`theme-text-color-4-4`, and the rules behind them come with the script.
Without it every one falls back to white — which is how the entire club
history came to be white text on a white page, present in the DOM and
invisible on screen. The computed colours are baked in the same way.

**The photographs are in two places.** The shared library is at
`wzukusers/user-N/images/…/name.jpg`. The club's own uploads are at
`production-websitebuilder-v1-0-7` and `-v1-0-9`, named with a bare hash and
**no file extension**, which is why a pattern looking for `.jpg` found 34
pictures and missed 98. `harvest_rest.py` exists because of that mistake: it
takes every image URL the rendered page actually asked for, whatever it looks
like, and sniffs the file type from the bytes.

## The one thing to watch

`capture.py` only works while the old site is still serving. Once the
nameservers move, there is nothing left to capture and these scripts become a
record of how it was done rather than a way to do it again.

## The window

`launcher.py` serves the pages on a loopback port and shows them in a Qt
window with Qt's own web engine, which is Chromium and which travels inside
the program. Nothing on the reader's machine is borrowed: no Edge, no Chrome,
no runtime to install. That is the point of an archive — a copy that leans on
software somebody else maintains is a copy with a clock running on it.

It costs 649 MB and it is worth it.

## Two things that will bite whoever builds this next

**Build it as a folder, not one packed file.** `--onefile` produces a program
that starts, unpacks itself, and then hangs forever with no window and no
error. Chromium's sandbox will not launch from a directory the program
created for itself a second earlier, and it fails silently. The fix people
reach for is `--no-sandbox`; the better one is `--onedir`, where the sandbox
works normally because the files are where they claim to be. A folder is also
how the rest of this machine's apps are built.

**Build from a short path.** PySide6 unpacks file names long enough to break
a `pip install` run from a deep temporary directory, and the error names a
missing `.obj` file rather than the real cause. `C:\sjvsc-build` is enough.
