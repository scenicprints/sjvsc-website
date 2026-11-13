/* Checks on the rules that decide whether an event is visible and whether
 * it is allowed to be saved. Plain node, no Worker, no database:
 *
 *   node scripts/test-shape.mjs
 */

import assert from 'node:assert/strict';
import { rowToEvent, eventToRow, validateEvent, withWindow, WRITABLE } from '../worker/shape.js';

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
};

console.log('the advertising window');

test('until defaults to the day after the event', () => {
  assert.equal(withWindow({ date: '2027-03-14' }).until, '2027-03-15');
});

test('it rolls over a month end', () => {
  assert.equal(withWindow({ date: '2027-01-31' }).until, '2027-02-01');
});

test('it rolls over a leap day', () => {
  assert.equal(withWindow({ date: '2028-02-28' }).until, '2028-02-29');
});

test('it rolls over a year end', () => {
  assert.equal(withWindow({ date: '2026-12-31' }).until, '2027-01-01');
});

test('from defaults to today', () => {
  assert.equal(withWindow({ date: '2027-03-14' }, { today: '2026-11-12' }).from, '2026-11-12');
});

test('what the club set is left alone', () => {
  const out = withWindow({ date: '2027-03-14', from: '2027-01-01', until: '2027-03-20' });
  assert.equal(out.from, '2027-01-01');
  assert.equal(out.until, '2027-03-20');
});

console.log('what may be saved');

test('an event needs a name', () => {
  assert.ok(validateEvent({ date: '2027-03-14' }).some((p) => /name/.test(p)));
});

test('an event needs a day', () => {
  assert.ok(validateEvent({ title: 'Jass' }).some((p) => /day/.test(p)));
});

test('a shelf event needs no day', () => {
  assert.deepEqual(validateEvent({ title: 'Jass' }, { shelf: true }), []);
});

test('a day must be a date', () => {
  assert.ok(validateEvent({ title: 'Jass', date: '14/03/2027' }).some((p) => /yyyy-mm-dd/.test(p)));
});

test('it refuses an event that stops showing before it happens', () => {
  const problems = validateEvent({ title: 'Jass', date: '2027-03-14', until: '2027-03-01' });
  assert.ok(problems.some((p) => /stops being advertised/.test(p)));
});

test('it refuses tickets sold after the event', () => {
  const problems = validateEvent({ title: 'Jass', date: '2027-03-14', tickto: '2027-03-20' });
  assert.ok(problems.some((p) => /after the event/.test(p)));
});

test('a good event passes', () => {
  assert.deepEqual(
    validateEvent({ title: 'Fall Jass Party', date: '2027-03-14', until: '2027-03-15' }),
    []
  );
});

console.log('the shape the pages read');

test('a row comes back as the object data/events.json held', () => {
  const event = rowToEvent({
    id: 'jass-fall', title: 'Fall Jass Party', note: 'The Swiss card game',
    description: 'Long prose.', image: null, link: null, page: 'jass',
    event_date: '2026-11-15', event_time: '12:00 PM',
    adv_from: '2026-10-15', adv_until: '2026-11-16',
    tickprice: '$15', tickfrom: null, tickto: null,
    details: '[]', attachments: '[]', ticksellers: '[{"kind":"entry"}]',
  });
  assert.equal(event.desc, 'Long prose.');
  assert.equal(event.from, '2026-10-15');
  assert.equal(event.until, '2026-11-16');
  assert.equal(event.ticksellers[0].kind, 'entry');
  assert.ok(!('image' in event), 'an unset image is absent, not empty');
});

test('a broken JSON column does not take the event down', () => {
  const event = rowToEvent({
    id: 'x', title: 'x', event_date: '2027-01-01', details: '{oh dear',
  });
  assert.deepEqual(event.details, []);
});

test('a round trip keeps the values', () => {
  const before = {
    title: 'Jass', note: 'n', desc: 'd', page: 'jass', date: '2027-03-14',
    time: '12:00 PM', from: '2027-01-01', until: '2027-03-15',
    tickprice: '$15', details: [{ label: 'Where', values: ['The hall'] }],
    attachments: [], ticksellers: [{ kind: 'entry' }],
  };
  const after = rowToEvent({ id: 'jass', ...eventToRow(before) });
  for (const key of Object.keys(before)) {
    assert.deepEqual(after[key], before[key], key + ' survived');
  }
});

console.log('')
console.log('what a ticket costs');

test('a list of prices survives the round trip', () => {
  const prices = [{ who: 'Adults', price: '$20' }, { who: 'Children', price: '$10' }];
  const after = rowToEvent({ id: 'x', ...eventToRow({
    title: 'Oktoberfest', date: '2027-10-02', tickprices: prices,
  }) });
  assert.deepEqual(after.tickprices, prices);
});

test('an event with no prices comes back with an empty list', () => {
  const after = rowToEvent({ id: 'x', ...eventToRow({ title: 'A', date: '2027-01-01' }) });
  assert.deepEqual(after.tickprices, []);
});

/* The old single field is the one every event written before today has,
   and it must keep reading after the column exists. */
test('the old single price is left exactly where it was', () => {
  const after = rowToEvent({ id: 'x', ...eventToRow({
    title: 'A', date: '2027-01-01', tickprice: '$15',
  }) });
  assert.equal(after.tickprice, '$15');
  assert.deepEqual(after.tickprices, []);
});

test('prices sent as something other than a list are refused', () => {
  const problems = validateEvent({
    title: 'A', date: '2027-01-01', tickprices: '$20',
  });
  assert.ok(problems.some((q) => q.includes('tickprices')), problems.join(' '));
});

console.log('what happens through the day');

test('a schedule survives the round trip', () => {
  const sked = [
    { at: '11am', what: 'Doors open' },
    { at: 'noon', what: 'Lunch is served' },
    { at: 'after the parade', what: 'Schwingen in the ring' },
  ];
  const after = rowToEvent({ id: 'x', ...eventToRow({
    title: 'Oktoberfest', date: '2027-10-02', schedule: sked,
  }) });
  assert.deepEqual(after.schedule, sked);
});

/* Every event written before the column existed has NULL in it, and an
   event that is one thing at one time still does. Neither may throw. */
test('an event with no schedule comes back with an empty list', () => {
  const after = rowToEvent({ id: 'x', ...eventToRow({ title: 'A', date: '2027-01-01' }) });
  assert.deepEqual(after.schedule, []);
});

test('a schedule column holding rubbish does not take the event down', () => {
  const after = rowToEvent({ id: 'x', title: 'A', event_date: '2027-01-01',
                             schedule: 'not json at all' });
  assert.deepEqual(after.schedule, []);
  assert.equal(after.title, 'A');
});

test('a schedule sent as something other than a list is refused', () => {
  const problems = validateEvent({
    title: 'A', date: '2027-01-01', schedule: '11am doors',
  });
  assert.ok(problems.some((q) => q.includes('schedule')), problems.join(' '));
});

/* The admin sends it; if it is not on this list the Worker drops it
   silently and the club's schedule is lost on save with no error. */
test('the client may set a schedule, so it is not dropped on the way in', () => {
  assert.ok(WRITABLE.includes('schedule'), WRITABLE.join(', '));
});

console.log(`\n${pass} checks passed`);
