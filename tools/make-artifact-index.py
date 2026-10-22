#!/usr/bin/env python3
"""Generate the artifact-shaped copy of index.html.

GitHub Pages serves index.html as a normal standalone document. The Claude
artifact viewer supplies its own doctype, charset and <body>, and rejects a page
that brings its own, so it needs the same content with the outer document
stripped off. This writes that copy next to the site as artifact-index.html.

    python tools/make-artifact-index.py

The output is gitignored; it exists only to be handed to the Artifact tool.
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'index.html')
DST = os.path.join(ROOT, 'artifact-index.html')

HEAD = (
    '<title>Ripon Swiss Club</title>\n'
    '<meta name="claude:viewport-fit-sides" content="cover">\n'
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
    'family=Fraunces:opsz,wght@9..144,400..800&'
    'family=Archivo:wght@400;500;600;700&display=swap">\n'
    '<link rel="stylesheet" href="assets/css/site.css">\n\n'
)

src = io.open(SRC, encoding='utf-8').read()
try:
    body = src[src.index('<body>') + len('<body>'):src.rindex('</body>')].strip()
except ValueError:
    sys.exit('index.html has no <body>; it may already be artifact-shaped.')

io.open(DST, 'w', encoding='utf-8').write(HEAD + body + '\n')
print('wrote %s (%d bytes)' % (os.path.relpath(DST, ROOT), os.path.getsize(DST)))
