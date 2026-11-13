/* Checks that an event can actually reach the page it is tied to.
 *
 * Three lists have to agree and nothing in the code makes them:
 *
 *   TIED        in assets/js/events-data.js -- where a tie leads
 *   the select  in admin-events.html        -- what the club may choose
 *   the slots   data-eventslot in the pages -- where the event is drawn
 *
 * When they disagree nothing throws. The page simply draws nothing, or
 * the calendar links to a page that then says nothing is on -- which is
 * what the Children's Christmas Party and the AGM did for weeks, because
 * their pages were the only two matching on the address rather than on a
 * tie, and the host's own redirect made the two addresses differ.
 *
 *   node scripts/test-ties.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
};

/* ---- what the three lists say -------------------------------------- */

const data = read('assets/js/events-data.js');
const tiedBlock = data.slice(data.indexOf('var TIED = {'));
const TIED = {};
for (const m of tiedBlock.slice(0, tiedBlock.indexOf('};'))
    .matchAll(/(\w+)\s*:\s*'([^']+)'/g)) {
  TIED[m[1]] = m[2];
}

const adminPage = read('admin-events.html');
const select = adminPage.slice(adminPage.indexOf('<select id="f-page">'));
const OPTIONS = [...select.slice(0, select.indexOf('</select>'))
  .matchAll(/<option value="([^"]*)"/g)].map((m) => m[1]).filter((v) => v);

const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const SLOTS = {};                       // slot id -> the page holding it
for (const file of pages) {
  for (const m of read(file).matchAll(/data-eventslot="([^"]+)"/g)) {
    SLOTS[m[1]] = file;
  }
}

/* ---- the checks ----------------------------------------------------- */

console.log('every tie reaches its page');

test('there is at least one tie, so a broken read does not pass quietly', () => {
  assert.ok(Object.keys(TIED).length >= 9, Object.keys(TIED).length + ' ties read');
  assert.ok(OPTIONS.length >= 9, OPTIONS.length + ' options read');
  assert.ok(Object.keys(SLOTS).length >= 9, Object.keys(SLOTS).length + ' slots read');
});

test('every tie leads to a page that exists', () => {
  for (const [id, file] of Object.entries(TIED)) {
    assert.ok(fs.existsSync(path.join(ROOT, file)), id + ' leads to ' + file + ', which is not there');
  }
});

test('every tie has a slot on that page to be drawn into', () => {
  for (const [id, file] of Object.entries(TIED)) {
    assert.equal(SLOTS[id], file,
      id + ' leads to ' + file + ' but its slot is on ' + (SLOTS[id] || 'no page'));
  }
});

test('every slot has a tie, so the page is not waiting on nothing', () => {
  for (const [id, file] of Object.entries(SLOTS)) {
    assert.ok(TIED[id], file + ' draws events tied to "' + id + '", which no tie names');
  }
});

test('the club can choose every tie there is, and nothing else', () => {
  assert.deepEqual(OPTIONS.slice().sort(), Object.keys(TIED).sort());
});

/* The old way of doing this. It still works -- it matches on the bare page
   name now -- but an event can no longer be given a link through the admin,
   so a page relying on one has no way to be filled. */
test('no page is left matching on its own address', () => {
  const stragglers = pages.filter((f) => read(f).includes('data-eventpage'));
  assert.deepEqual(stragglers, []);
});

console.log(`\n${pass} checks passed`);
