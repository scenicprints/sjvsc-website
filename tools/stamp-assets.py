# -*- coding: utf-8 -*-
"""Stamp every stylesheet and script reference with a hash of the file.

GitHub Pages serves assets with Cache-Control: max-age=600, so for ten
minutes after a push a visitor can get the new HTML with the old script.
When the two disagree — a script looking for a field the HTML no longer
has — the page breaks on load.

A hash in the URL means the HTML can only ever ask for the file it was
built against. Run this before committing whenever CSS or JS changed:

    python tools/stamp-assets.py
"""
import glob
import hashlib
import io
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = re.compile(r'(?P<attr>href|src)="(?P<path>assets/(?:css|js)/[^"?]+)(?:\?v=[^"]*)?"')


def short_hash(path):
    with open(path, 'rb') as fh:
        return hashlib.sha1(fh.read()).hexdigest()[:8]


def main():
    cache = {}
    touched = 0
    for page in sorted(glob.glob(os.path.join(ROOT, '*.html'))):
        text = io.open(page, encoding='utf-8').read()

        def stamp(m):
            rel = m.group('path')
            full = os.path.join(ROOT, rel.replace('/', os.sep))
            if not os.path.exists(full):
                return m.group(0)
            if rel not in cache:
                cache[rel] = short_hash(full)
            return '%s="%s?v=%s"' % (m.group('attr'), rel, cache[rel])

        stamped = REF.sub(stamp, text)
        if stamped != text:
            io.open(page, 'w', encoding='utf-8', newline='\n').write(stamped)
            touched += 1
        print('  %-28s %s' % (os.path.basename(page),
                              'stamped' if stamped != text else 'unchanged'))

    print('\n%d file(s) changed' % touched)
    for rel in sorted(cache):
        print('  %s  %s' % (cache[rel], rel))


if __name__ == '__main__':
    main()
