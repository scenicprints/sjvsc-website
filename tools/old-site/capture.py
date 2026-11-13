"""Render every page of the old site and keep the DOM as the browser built it.

The builder draws the whole page in JavaScript -- the HTML it serves carries a
title and nothing else -- so a saved copy has to be taken after rendering, not
downloaded. Chrome does the rendering here; the DOM it produces is what gets
written out.
"""
import io, json, os, sys
from playwright.sync_api import sync_playwright

RAW = sys.argv[1]
os.makedirs(RAW, exist_ok=True)
SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'page-pictures')
os.makedirs(SHOTS, exist_ok=True)

SITE = 'https://sjvscriponswiss.com'

PAGES = [
    ('index', '/'),
    ('calendar', '/calendar'),
    ('hall-rental', '/hall-rental'),
    ('membership', '/membership'),
    ('contact', '/contact'),
    ('swiss-echoes', '/swiss-echoes'),
    ('schwingers-club', '/schwingers-club'),
    ('club-history', '/club-history'),
    ('scholarships', '/scholarships'),
    ('oktoberfest', '/oktoberfest'),
    ('schwingfests', '/schwingfests'),
    ('jass', '/jass'),
    ('kids-swiss-camp', '/kids-swiss-camp'),
    ('playground', '/playground'),
    ('may-birthday-celebration', '/may-birthday-celebration'),
    ('swiss-miss', '/swiss-miss'),
    ('newsletters', '/newsletters'),
    ('eidgenoessisches-2022', '/eidgen%c3%b6ssisches-2022'),
    ('memorials', '/memorials'),
    ('children-s-christmas-party', '/children-s-christmas-party'),
    ('other-swiss-clubs', '/other-swiss-clubs'),
    ('almond-blossom-dance', '/almond-blossom-dance'),
    ('west-coast-swiss-wrestling-association', '/west-coast-swiss-wrestling-association'),
    ('kueche-kaestle-kochbuch', '/k%c3%bcche-k%c3%a4stle-kochbuch'),
    ('members-bbq', '/members-bbq'),
]

REPORT = []
SHEETS = set()

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})

    for slug, path in PAGES:
        url = SITE + path
        try:
            page.goto(url, wait_until='networkidle', timeout=60000)
        except Exception:
            try:
                page.goto(url, wait_until='load', timeout=60000)
            except Exception as e:
                REPORT.append({'slug': slug, 'error': str(e)[:120]})
                continue

        # lazy images only fetch once they are scrolled near
        page.evaluate("""async () => {
            const step = Math.round(window.innerHeight * 0.8);
            for (let y = 0; y < document.body.scrollHeight; y += step) {
                window.scrollTo(0, y);
                await new Promise(r => setTimeout(r, 220));
            }
            window.scrollTo(0, 0);
            await new Promise(r => setTimeout(r, 600));
        }""")
        page.wait_for_timeout(900)

        # A full-page picture, which is the one record that cannot come out
        # wrong: whatever the saved HTML does later, this is what the page
        # looked like on the day.
        page.screenshot(path=os.path.join(SHOTS, slug + '.png'), full_page=True)

        # Bake the geometry the builder's JavaScript worked out.
        #
        # The page is laid out by script: boxes are positioned absolutely and
        # their heights are set at run time. Strip the script -- which a saved
        # copy must, or it runs again against a site that is gone -- and every
        # container collapses to nothing, so the content falls through to the
        # bottom and the page shows as a red void.
        #
        # So before saving, every positioned box is given the width and height
        # it actually has on screen, written into its own style attribute.
        # After that the layout holds on its own and needs no script at all.
        page.evaluate("""() => {
            document.querySelectorAll('*').forEach(el => {
                const cs = getComputedStyle(el);

                // Geometry, for the boxes the builder positions itself.
                if (cs.position === 'absolute' || cs.position === 'relative') {
                    const r = el.getBoundingClientRect();
                    if (r.height > 0) el.style.height = Math.round(r.height) + 'px';
                    if (r.width > 0) el.style.width = Math.round(r.width) + 'px';
                }

                // Colour. The site's palette is applied at run time through
                // classes like theme-text-color-4-4, and the rules behind
                // them arrive with the script. Without the script every one
                // of them falls back to white, which is how the whole of the
                // club's history came to be white text on a white page.
                const cls = (el.className || '').toString();
                if (cls.indexOf('theme-') >= 0) {
                    el.style.color = cs.color;
                    if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                        el.style.backgroundColor = cs.backgroundColor;
                    }
                }

                // Background pictures, which are set the same way.
                if (cs.backgroundImage && cs.backgroundImage !== 'none'
                    && cs.backgroundImage.indexOf('url(') === 0) {
                    el.style.backgroundImage = cs.backgroundImage;
                    el.style.backgroundSize = cs.backgroundSize;
                    el.style.backgroundPosition = cs.backgroundPosition;
                    el.style.backgroundRepeat = cs.backgroundRepeat;
                }
            });
            // the page's own scroll height, so the body does not shrink
            const h = document.documentElement.scrollHeight;
            document.body.style.minHeight = h + 'px';
        }""")

        facts = page.evaluate("""() => ({
            html: document.documentElement.outerHTML,
            title: document.title,
            anchors: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')),
            imgs: [...document.querySelectorAll('img')].map(i => i.currentSrc || i.src),
            sheets: [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href),
            scripts: document.querySelectorAll('script').length,
            height: document.body.scrollHeight
        })""")

        with io.open(os.path.join(RAW, slug + '.html'), 'w', encoding='utf-8') as f:
            f.write(facts['html'])

        for s in facts['sheets']:
            SHEETS.add(s)

        REPORT.append({
            'slug': slug,
            'title': facts['title'],
            'bytes': len(facts['html']),
            'anchors': len(facts['anchors']),
            'internal': len([a for a in facts['anchors']
                             if a.startswith('/') or 'sjvscriponswiss' in a]),
            'imgs': len(facts['imgs']),
            'scripts': facts['scripts'],
            'height': facts['height'],
        })
        print('%-40s %6d bytes  %2d img  %2d links  %4dpx' % (
            slug, len(facts['html']), len(facts['imgs']),
            len(facts['anchors']), facts['height']))

    browser.close()

with io.open(os.path.join(RAW, '_report.json'), 'w', encoding='utf-8') as f:
    json.dump({'pages': REPORT, 'stylesheets': sorted(SHEETS)}, f, indent=1)

print('')
print('stylesheets:')
for s in sorted(SHEETS):
    print('  ' + s)
ok = [r for r in REPORT if 'error' not in r]
print('')
print('captured %d of %d pages' % (len(ok), len(PAGES)))
