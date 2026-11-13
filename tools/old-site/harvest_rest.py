"""Collect the pictures that do not live in the builder's wzukusers store.

The first sweep looked only at wzukusers/user-N/images/, which is where the
stock library sits. The club's own uploads are somewhere else entirely --
production-websitebuilder-v1-0-7 and -v1-0-9 -- under names with no file
extension at all, which is why they were invisible to a pattern that ended in
.jpg. A handful more are other clubs' logos hotlinked from their own sites.

All of them were on the page, so all of them come down.
"""
import hashlib, html as htmlmod, io, json, os, re, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
DEST = r'C:\Users\kwagner\Desktop\SJVS\archive\old-site\images-2'
os.makedirs(DEST, exist_ok=True)

UA = {'User-Agent': 'Mozilla/5.0 (archival copy of a site being retired)',
      'Referer': 'https://sjvscriponswiss.com/'}

EXT = {'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
       'image/gif': '.gif', 'image/webp': '.webp', 'image/avif': '.avif',
       'image/svg+xml': '.svg', 'image/bmp': '.bmp'}

# every src that went through the site's image proxy, plus bare ones
PROXY = re.compile(r'/x/cdn/\?(?P<u>https?://[^"\'\s>)]+)')

urls = set()
for fn in sorted(os.listdir(RAW)):
    if not fn.endswith('.html'):
        continue
    s = io.open(os.path.join(RAW, fn), encoding='utf-8', errors='replace').read()
    # the srcs sit inside escaped attributes, so &quot; and &amp; have to go
    # before a URL can be read off cleanly -- without this every one of them
    # is cut short and fetches nothing
    s = htmlmod.unescape(s)
    for m in PROXY.finditer(s):
        u = m.group('u')
        # the wzukusers store is already in images/
        if 'wzukusers/user-' in u and '/images/' in u:
            continue
        urls.add(u)

print('pictures to fetch: %d' % len(urls))

mapping = {}
ok = bad = 0
for u in sorted(urls):
    tag = hashlib.sha1(u.encode('utf-8')).hexdigest()[:10]
    last = u.split('?')[0].rstrip('/').rsplit('/', 1)[-1]
    last = re.sub(r'[^A-Za-z0-9._-]', '_', last)[:50] or 'picture'
    for attempt in (u, 'https://sjvscriponswiss.com/x/cdn/?' + u):
        try:
            req = urllib.request.Request(attempt, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                ctype = (r.headers.get('Content-Type') or '').split(';')[0].strip().lower()
        except Exception:
            continue
        if len(data) < 200:
            continue
        ext = EXT.get(ctype, '')
        if not ext:
            if data[:3] == b'\xff\xd8\xff':
                ext = '.jpg'
            elif data[:8] == b'\x89PNG\r\n\x1a\n':
                ext = '.png'
            elif data[:6] in (b'GIF87a', b'GIF89a'):
                ext = '.gif'
            elif data[:4] == b'RIFF' and data[8:12] == b'WEBP':
                ext = '.webp'
            else:
                break
        if '.' in last and last.lower().endswith(ext):
            name = '%s-%s' % (tag, last)
        else:
            name = '%s-%s%s' % (tag, re.sub(r'\.[A-Za-z0-9]+$', '', last), ext)
        io.open(os.path.join(DEST, name), 'wb').write(data)
        mapping[u] = name
        ok += 1
        print('OK   %-46s %6d B  %s' % (name[:46], len(data), ctype or '?'))
        break
    else:
        bad += 1
        print('MISS %s' % u[:100])
    if u not in mapping and attempt and u not in mapping:
        pass

missing = sorted(set(urls) - set(mapping))
io.open(os.path.join(HERE, 'images2-map.json'), 'w', encoding='utf-8').write(
    json.dumps(mapping, indent=1))

size = sum(os.path.getsize(os.path.join(DEST, f)) for f in os.listdir(DEST))
print('')
print('fetched %d, failed %d, %.1f MB' % (ok, len(missing), size / 1048576.0))
for u in missing:
    print('   missing: %s' % u[:110])
