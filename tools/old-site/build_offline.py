"""Turn the rendered DOM of the old site into a folder that opens offline.

The DOM is kept as Chrome built it. What changes is everything that pointed at
somebody else's server:

  - every <script> is removed. The builder's JavaScript drew this page once,
    and that work is already done and saved. Left in, it would run again
    against a site that is not there and blank the page it was meant to draw.
  - the one stylesheet is fetched and kept, and the fonts it names with it.
  - pictures come from images/, which is the archive's own copy.
  - links between pages become links between files, so it is browsable.
"""
import io, os, re, shutil, sys, urllib.request

SCRATCH = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(SCRATCH, 'raw')
ARCH = r'C:\Users\kwagner\Desktop\SJVS\archive\old-site'
OUT = os.path.join(SCRATCH, 'offline')

PATH_TO_SLUG = {
    '/': 'index', '/calendar': 'calendar', '/hall-rental': 'hall-rental',
    '/membership': 'membership', '/contact': 'contact',
    '/swiss-echoes': 'swiss-echoes', '/schwingers-club': 'schwingers-club',
    '/club-history': 'club-history', '/scholarships': 'scholarships',
    '/oktoberfest': 'oktoberfest', '/schwingfests': 'schwingfests',
    '/jass': 'jass', '/kids-swiss-camp': 'kids-swiss-camp',
    '/playground': 'playground',
    '/may-birthday-celebration': 'may-birthday-celebration',
    '/swiss-miss': 'swiss-miss', '/newsletters': 'newsletters',
    '/eidgen%c3%b6ssisches-2022': 'eidgenoessisches-2022',
    '/eidgenössisches-2022': 'eidgenoessisches-2022',
    '/memorials': 'memorials',
    '/children-s-christmas-party': 'children-s-christmas-party',
    '/other-swiss-clubs': 'other-swiss-clubs',
    '/almond-blossom-dance': 'almond-blossom-dance',
    '/west-coast-swiss-wrestling-association': 'west-coast-swiss-wrestling-association',
    '/k%c3%bcche-k%c3%a4stle-kochbuch': 'kueche-kaestle-kochbuch',
    '/küche-kästle-kochbuch': 'kueche-kaestle-kochbuch',
    '/members-bbq': 'members-bbq',
}

UA = {'User-Agent': 'Mozilla/5.0 (archival copy of a site being retired)'}


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read()


# ---- where each referenced picture lives locally -----------------------

def local_images():
    have = set(os.listdir(os.path.join(ARCH, 'images')))
    m = {}
    for tail in [l.strip() for l in
                 io.open(os.path.join(ARCH, 'image-ids.txt'), encoding='utf-8')
                 if l.strip()]:
        flat = tail.replace('/', '__')
        if flat in have:
            m[tail] = flat
            continue
        # the page asked for a _d400 thumbnail; the archive kept the original
        bare = re.sub(r'_d?\d+(\.[A-Za-z]+)$', r'\1', flat)
        if bare in have:
            m[tail] = bare
    return m


IMG = local_images()
FONTS = {}

# The club's own uploads, which are not in the wzukusers store at all but in
# production-websitebuilder-v1-0-7 and -v1-0-9, under names with no file
# extension. harvest_rest.py fetched them; this is where they landed.
import json as _json
_map = os.path.join(SCRATCH, 'images2-map.json')
IMG2 = _json.load(io.open(_map, encoding='utf-8')) if os.path.exists(_map) else {}

DOCS = {}
for fn in os.listdir(os.path.join(ARCH, 'documents')):
    DOCS[fn.lower()] = fn


def rewrite(html, slug):
    notes = {'scripts': 0, 'imgs': 0, 'links': 0, 'docs': 0, 'lost': set()}

    # 1. the builder's JavaScript goes. Its output is already in this file.
    html, n = re.subn(r'(?is)<script\b[^>]*>.*?</script>', '', html)
    notes['scripts'] = n
    html = re.sub(r'(?is)<noscript\b[^>]*>.*?</noscript>', '', html)

    # 2. one stylesheet, kept beside the pages
    html = re.sub(
        r'<link([^>]*?)href="https://components\.mywebsitebuilder\.com/[^"]*?\.css"',
        r'<link\1href="assets/viewer.css"', html)

    # 3a. the club's own uploads, swapped by exact URL. They are matched as
    #     plain strings rather than by pattern because the names carry no
    #     extension and nothing else about them is regular. Longest first, so
    #     a URL that is a prefix of another cannot take its place.
    for u in sorted(IMG2, key=len, reverse=True):
        name = 'images-2/' + IMG2[u]
        for form in ('/x/cdn/?' + u, u):
            for variant in (form, form.replace('&', '&amp;')):
                if variant in html:
                    html = html.replace(variant, name)
                    notes['imgs'] += 1

    # 3. pictures. Both the proxied form (/x/cdn/?...) and the direct one.
    def img_sub(m):
        tail = m.group('tail')
        f = IMG.get(tail)
        if not f:
            bare = re.sub(r'_d?\d+(\.[A-Za-z]+)$', r'\1', tail)
            f = IMG.get(bare)
        if f:
            notes['imgs'] += 1
            return 'images/' + f
        notes['lost'].add(tail)
        return 'images/missing.png'

    html = re.sub(
        r'(?:/x/cdn/\?)?https?://storage\.googleapis\.com/wzukusers/user-\d+/images/'
        r'(?P<tail>[A-Za-z0-9_\-./%]+?\.(?:jpe?g|png|webp|gif|JPG|JPEG|PNG))',
        img_sub, html)

    # 4. the PDFs the pages linked to
    def doc_sub(m):
        name = urllib.parse.unquote(m.group('name'))
        f = DOCS.get(name.lower())
        if f:
            notes['docs'] += 1
            return 'documents/' + urllib.parse.quote(f)
        return m.group(0)

    html = re.sub(
        r'https?://storage\.googleapis\.com/wzukusers/user-\d+/documents/[0-9a-f]+/'
        r'(?P<name>[^"\'\s>]+\.pdf)', doc_sub, html, flags=re.I)

    # 5. links between pages become links between files
    def link_sub(m):
        href = m.group('href')
        key = href.split('#')[0].split('?')[0].rstrip('/') or '/'
        if key.startswith('https://sjvscriponswiss.com'):
            key = key[len('https://sjvscriponswiss.com'):] or '/'
        if key in PATH_TO_SLUG:
            notes['links'] += 1
            return 'href="%s.html"' % PATH_TO_SLUG[key]
        return m.group(0)

    html = re.sub(r'href="(?P<href>(?:https://sjvscriponswiss\.com)?/[^"]*)"',
                  link_sub, html)

    # 6. the typefaces. Each page declares its own @font-face block pointing
    #    at the builder's blob store, so the faces are fetched once and the
    #    rules are pointed at the local copies. Without this the pages fall
    #    back to whatever the reading machine happens to have, and the old
    #    site stops looking like itself.
    def font_sub(m):
        url = m.group(0)
        name = FONTS.get(url)
        return 'assets/' + name if name else url

    html = re.sub(
        r'https?://(?:wzuk|webzaitest)\.blob\.core\.windows\.net/assets/'
        r'(?:fonts|icons)/[A-Za-z0-9_\-/]+\.(?:woff2?|ttf|eot)(?:\?[^"\')\s]*)?',
        font_sub, html)

    # 7. a banner, so nobody mistakes this for the live site
    banner = (
        '<div style="position:sticky;top:0;z-index:99999;background:#8a1538;'
        'color:#fff;font:14px/1.5 system-ui,sans-serif;padding:9px 14px;'
        'text-align:center">Archived copy of the old San Joaquin Valley Swiss '
        'Club site, taken 13 November 2026. Nothing here is live. '
        '<a href="index.html" style="color:#fff">Home</a> &middot; '
        '<a href="_index.html" style="color:#fff">All pages</a></div>')
    html = re.sub(r'(<body[^>]*>)', r'\1' + banner, html, count=1)

    return html, notes


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, 'assets'))
    shutil.copytree(os.path.join(ARCH, 'images'), os.path.join(OUT, 'images'))
    shutil.copytree(os.path.join(ARCH, 'documents'), os.path.join(OUT, 'documents'))
    two = os.path.join(ARCH, 'images-2')
    if os.path.isdir(two):
        shutil.copytree(two, os.path.join(OUT, 'images-2'))

    # the stylesheet, and the fonts it names
    css_url = ('https://components.mywebsitebuilder.com/g-202607141007122069/'
               'viewer-website-builder/viewer.css')
    css = fetch(css_url).decode('utf-8', 'replace')
    fonts = 0
    seen = {}
    for m in re.finditer(r'url\(([\'"]?)(https?://[^)\'"]+?\.(?:woff2?|ttf|eot|svg))\1\)', css):
        u = m.group(2)
        if u in seen:
            continue
        name = re.sub(r'[^A-Za-z0-9._-]', '_', u.rsplit('/', 1)[-1].split('?')[0])
        try:
            data = fetch(u)
        except Exception:
            continue
        io.open(os.path.join(OUT, 'assets', name), 'wb').write(data)
        seen[u] = name
        fonts += 1
    for u, name in seen.items():
        css = css.replace(u, name)
    # any remaining absolute asset refs in the css cannot be reached offline
    io.open(os.path.join(OUT, 'assets', 'viewer.css'), 'w',
            encoding='utf-8', newline='\n').write(css)

    # a 1x1 stand-in for the one picture the builder itself had lost
    io.open(os.path.join(OUT, 'images', 'missing.png'), 'wb').write(bytes.fromhex(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4'
        '890000000a49444154789c6300010000050001' + '0d0a2db4' + '0000000049454e44ae426082'))

    # the typefaces, named inside each page rather than in the stylesheet
    wanted = set()
    for fn in os.listdir(RAW):
        if not fn.endswith('.html'):
            continue
        s = io.open(os.path.join(RAW, fn), encoding='utf-8', errors='replace').read()
        for m in re.finditer(
                r'https?://(?:wzuk|webzaitest)\.blob\.core\.windows\.net/assets/'
                r'(?:fonts|icons)/[A-Za-z0-9_\-/]+\.(?:woff2?|ttf)(?:\?[^"\')\s]*)?', s):
            wanted.add(m.group(0))
    for u in sorted(wanted):
        name = re.sub(r'[^A-Za-z0-9._-]', '_', u.rsplit('/', 1)[-1].split('?')[0])
        try:
            data = fetch(u)
        except Exception:
            continue
        io.open(os.path.join(OUT, 'assets', name), 'wb').write(data)
        FONTS[u] = name
    fonts += len(FONTS)

    # the builder's own 27x15 spacer, used 175 times for layout. It is not a
    # photograph and was left out of the archive, but the pages lean on it to
    # hold their shape, so the copy keeps one.
    try:
        io.open(os.path.join(OUT, 'images', 'UqyKO21dH0iBBoVaL4Po6Q.png'), 'wb').write(
            fetch('https://sjvscriponswiss.com/x/cdn/?https://storage.googleapis.com'
                  '/wzukusers/user-500000/images/UqyKO21dH0iBBoVaL4Po6Q.png'))
        IMG['UqyKO21dH0iBBoVaL4Po6Q.png'] = 'UqyKO21dH0iBBoVaL4Po6Q.png'
    except Exception as e:
        print('spacer not fetched: %s' % e)

    total = {'scripts': 0, 'imgs': 0, 'links': 0, 'docs': 0}
    lost = set()
    made = []
    for fn in sorted(os.listdir(RAW)):
        if not fn.endswith('.html'):
            continue
        slug = fn[:-5]
        html = io.open(os.path.join(RAW, fn), encoding='utf-8', errors='replace').read()
        html, notes = rewrite(html, slug)
        io.open(os.path.join(OUT, slug + '.html'), 'w',
                encoding='utf-8', newline='\n').write(html)
        for k in total:
            total[k] += notes[k]
        lost |= notes['lost']
        made.append(slug)

    # a plain contents page, because the builder's nav was partly JavaScript
    rows = '\n'.join(
        '<li><a href="%s.html">%s</a></li>' % (s, s.replace('-', ' '))
        for s in made)
    io.open(os.path.join(OUT, '_index.html'), 'w', encoding='utf-8', newline='\n').write(
        '<!doctype html><meta charset="utf-8"><title>Old site - all pages</title>'
        '<style>body{font:16px/1.7 system-ui,sans-serif;max-width:40rem;margin:3rem auto;'
        'padding:0 1rem;background:#faf7f2;color:#231f20}h1{font-size:1.4rem}'
        'li{margin:.3rem 0}a{color:#8a1538}</style>'
        '<h1>San Joaquin Valley Swiss Club &mdash; the old site</h1>'
        '<p>Archived 13 November 2026. Every page as it stood. Nothing here is live.</p>'
        '<ul>%s</ul>' % rows)

    print('pages written   : %d' % len(made))
    print('scripts removed : %d' % total['scripts'])
    print('pictures wired  : %d' % total['imgs'])
    print('links rewired   : %d' % total['links'])
    print('pdf links wired : %d' % total['docs'])
    print('fonts kept      : %d' % fonts)
    if lost:
        print('pictures not in the archive (%d):' % len(lost))
        for t in sorted(lost):
            print('   ' + t)
    size = sum(os.path.getsize(os.path.join(dp, f))
               for dp, _, fs in os.walk(OUT) for f in fs)
    print('folder size     : %.1f MB' % (size / 1048576.0))


if __name__ == '__main__':
    import urllib.parse
    main()
