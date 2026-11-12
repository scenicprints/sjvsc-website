/* The quote, checked against the club's own rental forms.
 *
 * The figures below are taken from the two application sheets:
 * MEMBER APPLICATION FOR FACILITY USE RENTAL and the NON-MEMBER one.
 * If a number here and a number on those sheets ever disagree, the sheet
 * is right.
 *
 *   node scripts/test-rates.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* rates-data.js is a browser script: it puts itself on globalThis rather
   than exporting, so importing it for the side effect is the way in. */
import '../assets/js/rates-data.js';
const R = globalThis.SJVSC_RATES;

const card = JSON.parse(readFileSync(new URL('../data/rates.json', import.meta.url), 'utf8'));

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
};

const sum = (q) => q.total;
const line = (q, text) => q.lines.find((l) => l.label.includes(text));

console.log('what the hall costs');

test('a member pays 600 and 500: 1100, with nothing held', () => {
  const q = R.quoteFor(card, { member: true, use: 'both', guests: 100 });
  assert.equal(line(q, 'Hall rental').amount, 600);
  assert.equal(line(q, 'Cleaning').amount, 500);
  assert.equal(sum(q), 1100);
  assert.equal(q.deposit, null, 'members are not asked for a deposit');
  assert.equal(q.dueTotal, 1100);
});

test('a non-member pays 1200 and 500, and 800 is held', () => {
  const q = R.quoteFor(card, { member: false, use: 'both', guests: 100 });
  assert.equal(line(q, 'Hall rental').amount, 1200);
  assert.equal(line(q, 'Cleaning').amount, 500);
  assert.equal(sum(q), 1700);
  assert.equal(q.deposit.amount, 800);
  assert.equal(q.dueTotal, 2500);
});

test('the deposit is not counted as money spent', () => {
  const q = R.quoteFor(card, { member: false, guests: 50 });
  assert.ok(!q.lines.some((l) => /deposit/i.test(l.label)),
    'a refundable deposit is not a line in the total');
});

test('membership saves 600 on one rental', () => {
  const m = R.quoteFor(card, { member: true, guests: 100 });
  const n = R.quoteFor(card, { member: false, guests: 100 });
  assert.equal(n.total - m.total, 600);
});

console.log('a funeral');

test('a member funeral is free but still pays the cleaning', () => {
  const q = R.quoteFor(card, { member: true, waiver: 'funeral', guests: 60 });
  assert.equal(line(q, 'Funeral').amount, 0);
  assert.equal(line(q, 'Cleaning').amount, 500);
  assert.equal(sum(q), 500);
});

test('a non-member cannot claim it', () => {
  const q = R.quoteFor(card, { member: false, waiver: 'funeral', guests: 60 });
  assert.equal(line(q, 'Hall rental').amount, 1200);
  assert.equal(sum(q), 1700);
});

console.log('security guards, by the sheet');

const guards = (n, member = false) =>
  R.quoteFor(card, { member, guests: n }).guards;

test('two guards up to 199', () => {
  assert.equal(guards(1), 2);
  assert.equal(guards(199), 2);
});
test('a third at 200, and up to 299', () => {
  assert.equal(guards(200), 3);
  assert.equal(guards(299), 3);
});
test('a fourth at 300, and up to 399', () => {
  assert.equal(guards(300), 4);
  assert.equal(guards(399), 4);
});
test('and so on above that', () => {
  assert.equal(guards(400), 5);
});
test('a member is not required to have any', () => {
  assert.equal(guards(300, true), 0);
});
test('a member without guards is told about the hold harmless', () => {
  const q = R.quoteFor(card, { member: true, guests: 300 });
  assert.ok(q.requirements.some((r) => /hold harmless/i.test(r)));
});

console.log('what must be produced');

test('everyone needs a million dollars of cover naming the club', () => {
  const q = R.quoteFor(card, { member: true, guests: 20 });
  const r = q.requirements.find((x) => /liability insurance/i.test(x));
  assert.ok(r, 'the insurance requirement is stated');
  assert.ok(r.includes('$1,000,000'), 'with the amount');
  assert.ok(r.includes('San Joaquin Valley Swiss Club'), 'and who it names');
  assert.ok(r.includes('10 days'), 'and when it is due');
});

test('alcohol adds liquor liability', () => {
  const dry = R.quoteFor(card, { member: true, guests: 20, options: [] });
  const wet = R.quoteFor(card, { member: true, guests: 20, options: ['alcohol'] });
  assert.ok(!dry.requirements.some((r) => /liquor/i.test(r)));
  assert.ok(wet.requirements.some((r) => /liquor/i.test(r)));
});

test('alcohol costs nothing today', () => {
  const dry = R.quoteFor(card, { member: true, guests: 20 });
  const wet = R.quoteFor(card, { member: true, guests: 20, options: ['alcohol'] });
  assert.equal(wet.total, dry.total);
});

console.log('the options the board may price later');

test('a free option adds no line', () => {
  const q = R.quoteFor(card, { member: true, guests: 20, options: ['kitchen', 'bbq', 'stage'] });
  assert.equal(q.total, 1100);
  assert.equal(q.lines.length, 2, 'rent and cleaning, nothing else');
});

test('giving one a price puts it on the quote, with no code change', () => {
  const priced = R.clone(card);
  priced.options.find((o) => o.id === 'bbq').price = 75;
  const q = R.quoteFor(priced, { member: true, guests: 20, options: ['bbq'] });
  assert.equal(line(q, 'BBQ').amount, 75);
  assert.equal(q.total, 1175);
});

test('an option not chosen is not charged', () => {
  const priced = R.clone(card);
  priced.options.find((o) => o.id === 'bbq').price = 75;
  const q = R.quoteFor(priced, { member: true, guests: 20, options: ['kitchen'] });
  assert.equal(q.total, 1100);
});

console.log('a card that is missing things must not throw');

test('an empty card still answers', () => {
  const q = R.quoteFor({}, { member: true, guests: 10 });
  assert.equal(typeof q.total, 'number');
});

test('rubbish instead of a card still answers', () => {
  const q = R.quoteFor(null, { member: false, guests: 10 });
  assert.equal(typeof q.total, 'number');
});

console.log(`\n${pass} checks passed`);
