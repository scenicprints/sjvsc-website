/* The page a visitor gets when nothing is at the address they asked for.
 *
 * Cloudflare serves 404.html's contents *at the address that was asked
 * for*, not at /404. So a visitor who types /events/oktoberfest gets this
 * page while the browser still believes it is sitting in /events/, and
 * every relative link on it -- the stylesheet included -- resolves against
 * that folder and comes back 404 as well. The page would arrive unstyled,
 * with every link broken, which is a worse answer than the bare one it
 * replaced.
 *
 * Nothing in the markup says this page is different, and it is the one
 * page on the site where copying a link from another page is wrong. Hence
 * this check.
 *
 *   node scripts/test-404.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(path.join(ROOT, '404.html'), 'utf8');

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
};

console.log('the page for an address with nothing at it');

const refs = [...page.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);

test('it has links at all, so a broken read does not pass quietly', () => {
  assert.ok(refs.length >= 15, refs.length + ' links read');
});

test('every link starts at the root, an anchor, or another site', () => {
  const relative = refs.filter((r) => !/^(https?:|\/\/|\/|#|mailto:|tel:)/.test(r));
  assert.deepEqual(relative, []);
});

test('every page it points at is really there', () => {
  const here = refs
    .filter((r) => r.startsWith('/') && !r.startsWith('//'))
    .map((r) => r.split('?')[0].split('#')[0].slice(1))
    .filter(Boolean);
  for (const f of here) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), '/' + f + ' is not there');
  }
});

test('search engines are told not to keep it', () => {
  assert.match(page, /<meta name="robots" content="noindex">/);
});

console.log(`\n${pass} checks passed`);
