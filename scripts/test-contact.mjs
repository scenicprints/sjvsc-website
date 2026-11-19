/* The contact form really sends.
 *
 * For its first weeks on the club's own domain the form on the contact
 * page was a mock-up left over from the concept: pressing Send showed
 * "Concept demo. Nothing is sent." and that was all. The hall quote and
 * the membership page both hand people to that form, so three ways of
 * reaching the club went nowhere and nothing on the page said so.
 *
 * This is here so that it cannot quietly go back to being a picture of a
 * form.
 *
 *   node scripts/test-contact.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shapeMessage, isAddress, TOPICS, LIMITS, createMessage } from '../worker/messages.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const page = read('contact.html');
const script = read('assets/js/contact.js');
const worker = read('worker/index.js');

let pass = 0;
const test = async (name, fn) => {
  try { await fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
};

console.log('the contact form');

await test('the page is not a mock-up', () => {
  assert.ok(!/concept demo/i.test(page), 'the demo notice is still on the page');
  assert.ok(!/onsubmit=/.test(page), 'the form still has an inline handler');
  assert.match(page, /id="ctform"/);
  assert.match(page, /assets\/js\/contact\.js/);
  assert.match(page, /class="cf-turnstile"/);
  assert.match(page, /challenges\.cloudflare\.com\/turnstile/);
});

await test('the script posts to the Worker, and the Worker answers there', () => {
  assert.match(script, /fetch\('api\/contact'/);
  assert.match(worker, /path === '\/api\/contact'/);
});

await test('every topic on the page is one the Worker knows', () => {
  const block = page.slice(page.indexOf('id="cTopic"'), page.indexOf('</select>', page.indexOf('id="cTopic"')));
  const onPage = [...block.matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1]);
  assert.deepEqual(onPage, TOPICS);
});

await test('a name, a way to answer and a message are all needed', () => {
  assert.ok(shapeMessage({ contact: 'a@b.com', body: 'hello' }).problem);
  assert.ok(shapeMessage({ who: 'Anna', body: 'hello' }).problem);
  assert.ok(shapeMessage({ who: 'Anna', contact: 'a@b.com', body: '   ' }).problem);
  assert.ok(shapeMessage({ who: 'Anna', contact: '209 555 0143', body: 'hello' }).message);
});

await test('a topic nobody offered is filed under the last one', () => {
  const { message } = shapeMessage({ who: 'A', contact: 'b', body: 'c', topic: 'Win a prize\r\nBcc: x' });
  assert.equal(message.topic, 'Something else');
});

await test('nothing is kept longer than a person would write', () => {
  const { message } = shapeMessage({ who: 'x'.repeat(999), contact: 'y'.repeat(999), body: 'z'.repeat(99999) });
  assert.equal(message.who.length, LIMITS.who);
  assert.equal(message.contact.length, LIMITS.contact);
  assert.equal(message.body.length, LIMITS.body);
});

await test('reply goes to an address, never to a telephone number', () => {
  assert.ok(isAddress('anna@example.com'));
  assert.ok(!isAddress('(209) 555-0143'));
  assert.ok(!isAddress('anna@example.com, other@example.com'));
  assert.ok(!isAddress('anna at example'));
});

await test('without Turnstile nothing is written', async () => {
  let wrote = false;
  const env = { DB: { prepare() { wrote = true; throw new Error('should not be reached'); } } };
  const req = new Request('https://sjvscriponswiss.com/api/contact', {
    method: 'POST', body: JSON.stringify({ who: 'A', contact: 'b', body: 'c' }),
  });
  const out = await createMessage(req, env, new URL(req.url));
  assert.equal(out.status, 403);
  assert.equal(wrote, false);
});

console.log(`\n${pass} passed`);
