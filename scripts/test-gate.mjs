/* The door on the admin.
 *
 * The admin screens are ordinary files sitting in the repo root, which is
 * how the whole site is served. That means the default behaviour is to
 * hand them to anybody who types the address, and for a while that is
 * exactly what happened. Two things now stop it, and both are easy to
 * undo by accident:
 *
 *   - the Worker refuses an admin address to anyone it does not recognise
 *   - wrangler.jsonc sends those addresses to the Worker in the first
 *     place, because otherwise the asset handler answers first and the
 *     Worker never hears about it
 *
 * Either one alone is no door at all. A new admin page named outside the
 * pattern slips past both. Hence this check.
 *
 *   node scripts/test-gate.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAdminPage } from '../worker/index.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const wrangler = fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8');
const gate = fs.readFileSync(path.join(ROOT, 'board-sign-in.html'), 'utf8');

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
};

console.log('the door on the admin');

/* ---- what counts as an admin address ---------------------------------- */

test('the admin hub, however it is spelled', () => {
  for (const p of ['/admin', '/admin.html', '/admin/', '/ADMIN', '/Admin.html']) {
    assert.ok(isAdminPage(p), p + ' should be behind the door');
  }
});

test('every admin page in the repo is behind it', () => {
  const pages = fs.readdirSync(ROOT).filter((f) => /^admin.*\.html$/i.test(f));
  assert.ok(pages.length >= 5, 'only found ' + pages.length + ' admin pages');
  for (const f of pages) {
    assert.ok(isAdminPage('/' + f), f + ' is not behind the door');
    assert.ok(isAdminPage('/' + f.replace(/\.html$/, '')), f + ' is open without its .html');
  }
});

test('the rest of the website is not', () => {
  const open = [
    '/', '/index.html', '/events', '/hall-rental', '/newsletters',
    '/board-sign-in', '/404.html', '/api/events',
    '/assets/css/admin.css', '/assets/js/admin-events.js',
  ];
  for (const p of open) {
    assert.ok(!isAdminPage(p), p + ' should stay open');
  }
});

test('the sign-in page is not itself behind the door', () => {
  assert.ok(!isAdminPage('/board-sign-in'));
  assert.ok(!isAdminPage('/board-sign-in.html'));
});

/* ---- the Worker has to be asked first --------------------------------- */

test('wrangler sends admin addresses to the Worker first', () => {
  const first = /"run_worker_first"\s*:\s*\[([\s\S]*?)\]/.exec(wrangler);
  assert.ok(first, 'no run_worker_first in wrangler.jsonc');
  const globs = [...first[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  for (const want of ['/admin', '/admin.html', '/admin-*']) {
    assert.ok(globs.includes(want), want + ' is missing, so the files answer first');
  }
});

test('every admin page in the repo is covered by one of those globs', () => {
  const first = /"run_worker_first"\s*:\s*\[([\s\S]*?)\]/.exec(wrangler);
  const globs = [...first[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  /* The globs in use are plain paths with at most one star, so matching
     them needs no regular expression and no escaping of the dots. */
  const covers = (addr) => globs.some((g) => {
    if (!g.includes('*')) return g === addr;
    const [head, tail] = g.split('*');
    return addr.length >= head.length + tail.length
      && addr.startsWith(head) && addr.endsWith(tail);
  });
  for (const f of fs.readdirSync(ROOT).filter((x) => /^admin.*\.html$/i.test(x))) {
    assert.ok(covers('/' + f), '/' + f + ' never reaches the Worker');
    assert.ok(covers('/' + f.replace(/\.html$/, '')), '/' + f.replace(/\.html$/, '') + ' never reaches the Worker');
  }
});

/* ---- the sign-in page is served at somebody else's address ------------- */

test('every link on the sign-in page starts at the root', () => {
  const refs = [...gate.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 5, refs.length + ' links read');
  const relative = refs.filter((r) => !/^(https?:|\/\/|\/|#|mailto:|tel:)/.test(r));
  assert.deepEqual(relative, []);
});

test('the pages and stylesheets it points at are really there', () => {
  const refs = [...gate.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  const here = refs
    .filter((r) => r.startsWith('/') && !r.startsWith('//'))
    .map((r) => r.split('?')[0].split('#')[0].slice(1))
    .filter(Boolean);
  assert.ok(here.length >= 3, 'expected local links');
  for (const f of here) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), '/' + f + ' is not there');
  }
});

test('search engines are told not to keep it', () => {
  assert.match(gate, /<meta name="robots" content="noindex">/);
});

console.log(`\n${pass} checks passed`);
