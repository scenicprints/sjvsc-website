/* Checks on what the visit count keeps and what it throws away.
 *
 * The row a hit becomes is a pure function of what the page sent and
 * what the request carried, so it can be checked here without a Worker
 * or a database. The things worth catching are the ones that would make
 * the Visits screen lie: a robot counted as a reader, Facebook's three
 * link hosts counted as three places, a page counted under four
 * spellings of its address.
 *
 *   node scripts/test-visits.mjs
 */

import assert from 'node:assert/strict';
import { hitRow, refHost, cleanPath, periodStart } from '../worker/visits.js';

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
};

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const meta = { ua: CHROME, host: 'sjvscriponswiss.com', country: 'us', region: 'California', day: '2026-11-16' };

console.log('the address a page is counted under');

test('the home page is /', () => {
  assert.equal(cleanPath('/index.html'), '/');
  assert.equal(cleanPath('/'), '/');
  assert.equal(cleanPath(''), '/');
});

test('.html, a query and a hash are not four pages', () => {
  assert.equal(cleanPath('/calendar.html?t=3#top'), '/calendar');
  assert.equal(cleanPath('/calendar/'), '/calendar');
  assert.equal(cleanPath('calendar'), '/calendar');
});

test('an address is kept, but not forever', () => {
  assert.equal(cleanPath('/' + 'a'.repeat(400)).length, 200);
});

console.log('where a visitor came from');

test('nothing is a typed address or a bookmark', () => {
  assert.equal(refHost('', 'sjvscriponswiss.com'), '');
  assert.equal(refHost('not a url', 'sjvscriponswiss.com'), '');
});

test('our own pages are one place, however served', () => {
  assert.equal(refHost('https://sjvscriponswiss.com/calendar', 'sjvscriponswiss.com'), '(site)');
  assert.equal(refHost('https://www.sjvscriponswiss.com/', 'sjvscriponswiss.com'), '(site)');
  assert.equal(refHost('http://localhost:8787/', 'localhost'), '(site)');
});

test("Facebook's link hosts are one Facebook", () => {
  for (const r of ['https://l.facebook.com/l.php?u=x', 'https://m.facebook.com/', 'android-app://m.facebook.com/', 'https://www.facebook.com/'])
    assert.equal(refHost(r, 'sjvscriponswiss.com'), 'facebook.com', r);
});

test('every Google is google.com', () => {
  assert.equal(refHost('https://www.google.com/', 'x'), 'google.com');
  assert.equal(refHost('https://www.google.co.uk/', 'x'), 'google.com');
});

console.log('what becomes a row');

test('a reader on a computer', () => {
  const row = hitRow({ k: 'view', p: '/calendar.html', r: 'https://www.facebook.com/' }, meta);
  assert.deepEqual(row, {
    day: '2026-11-16', kind: 'view', path: '/calendar', ref: 'facebook.com',
    device: 'desktop', country: 'US', region: 'California',
  });
});

test('a reader on a phone', () => {
  assert.equal(hitRow({ p: '/' }, { ...meta, ua: IPHONE }).device, 'phone');
});

test('a robot is not a reader', () => {
  assert.equal(hitRow({ p: '/' }, { ...meta, ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }), null);
  assert.equal(hitRow({ p: '/' }, { ...meta, ua: 'facebookexternalhit/1.1' }), null);
  assert.equal(hitRow({ p: '/' }, { ...meta, ua: '' }), null);
});

test('an unknown kind is a view, a known one is itself', () => {
  assert.equal(hitRow({ k: 'banana', p: '/' }, meta).kind, 'view');
  assert.equal(hitRow({ k: 'jass', p: '/jass-table' }, meta).kind, 'jass');
  assert.equal(hitRow({ k: 'miss', p: '/oktober' }, meta).kind, 'view');
});

test('the admin is not the audience', () => {
  assert.equal(hitRow({ p: '/admin-events.html' }, meta), null);
});

test('no country is no country, not an empty one', () => {
  const row = hitRow({ p: '/' }, { ...meta, country: undefined, region: undefined });
  assert.equal(row.country, null);
  assert.equal(row.region, null);
});

console.log('the periods the screen offers');

test('a week is seven days including today', () => {
  assert.equal(periodStart('week', '2026-11-16'), '2026-11-10');
});

test('thirty days crosses a month end', () => {
  assert.equal(periodStart('month', '2026-11-16'), '2026-10-18');
});

test('the year starts on the first of January', () => {
  assert.equal(periodStart('year', '2026-11-16'), '2026-01-01');
});

test('today is today', () => {
  assert.equal(periodStart('today', '2026-11-16'), '2026-11-16');
});

console.log('\n' + pass + ' checks passed' + (process.exitCode ? ', some failed' : ''));
