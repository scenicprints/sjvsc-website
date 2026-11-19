/* Somebody writing to the club from the contact page.

   For a long while that form was a mock-up: it said "sent" and sent
   nothing. This is the half that was missing.

   It is the second write on the site that is not behind a sign-in, and it
   holds the door the way requests.js does: Turnstile checked server-side,
   everything trimmed to a length a person would write, and the row written
   before the email is sent so that a message cannot be lost to a third
   party's bad afternoon.

   Where it goes: CONTACT_TO if that is set, and otherwise to whoever gets
   event requests (REQUEST_TO). One inbox, with the topic in the subject
   line, so that whoever reads it can pass it on. Sending each topic
   straight to a different officer is a decision for the board, not for
   this file -- nobody should start receiving the club's mail because a
   script guessed their address. */

import { passedTurnstile, escape } from './requests.js';

const RESEND_URL = 'https://api.resend.com/emails';

/* The choices on the form. Anything else is filed under the last one, so
   a topic can never be used to write an arbitrary subject line. */
export const TOPICS = [
  'Hall rental', 'Membership', 'An event',
  'Swiss Echoes', 'Schwingen', 'Something else',
];

export const LIMITS = { who: 120, contact: 120, body: 4000 };

const trim = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

/* What was typed, made safe to keep, or the reason it cannot be kept. */
export function shapeMessage(body) {
  const m = {
    who: trim(body?.who, LIMITS.who),
    contact: trim(body?.contact, LIMITS.contact),
    body: trim(body?.body, LIMITS.body),
    topic: TOPICS.includes(body?.topic) ? body.topic : TOPICS[TOPICS.length - 1],
  };
  if (!m.who) return { problem: 'We need your name.' };
  if (!m.contact) return { problem: 'We need an email or a telephone number to answer you on.' };
  if (!m.body) return { problem: 'The message is empty.' };
  return { message: m };
}

/* An address that reply can be pointed at: one word with an @ in it. A
   telephone number, or two addresses, is left alone. */
export const isAddress = (s) => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(String(s || ''));

function emailHtml(m, site) {
  return `<div style="font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#1a1613">
<p style="margin:0 0 18px">
  <b>${escape(m.who)}</b> wrote to the club about <b>${escape(m.topic)}</b>.
</p>
<p style="margin:0 0 18px;white-space:pre-wrap">${escape(m.body)}</p>
<p style="margin:0 0 18px">
  <span style="color:#6b625b">Reach them on</span> <b>${escape(m.contact)}</b>
</p>
<p style="margin:0;color:#6b625b;font-size:13px">
  Sent by the contact form on ${escape(site.replace(/^https?:\/\//, ''))}.
</p>
</div>`;
}

async function sendEmail(env, m, site) {
  const to = env.CONTACT_TO || env.REQUEST_TO;
  if (!env.RESEND_API_KEY) return 'No Resend key is configured.';
  if (!to) return 'Nobody is configured to receive messages.';

  const mail = {
    from: env.CONTACT_FROM || env.REQUEST_FROM
      || 'Swiss Club website <events@mail.sjvscriponswiss.com>',
    to: [to],
    subject: `${m.topic}: a message from ${m.who}`,
    html: emailHtml(m, site),
  };
  if (isAddress(m.contact)) mail.reply_to = m.contact;

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mail),
    });
    if (res.ok) return null;
    const said = await res.text();
    return `Resend answered ${res.status}: ${said.slice(0, 400)}`;
  } catch (err) {
    return `Resend would not answer: ${String(err?.message || err).slice(0, 200)}`;
  }
}

export async function createMessage(request, env, url) {
  let body;
  try {
    body = await request.json();
  } catch {
    return { status: 400, message: 'That was not JSON.' };
  }

  const ip = request.headers.get('CF-Connecting-IP');
  if (!(await passedTurnstile(body?.token, ip, env))) {
    return { status: 403, message: 'That did not look like a person. Reload the page and try again.' };
  }

  const shaped = shapeMessage(body);
  if (shaped.problem) return { status: 422, message: shaped.problem };
  const m = shaped.message;

  /* Written before a word is sent. */
  const made = await env.DB.prepare(
    'INSERT INTO messages (who, contact, topic, body) VALUES (?, ?, ?, ?)'
  ).bind(m.who, m.contact, m.topic, m.body).run();
  const id = made?.meta?.last_row_id;

  const problem = await sendEmail(env, m, url.origin);

  await env.DB.prepare('UPDATE messages SET emailed = ?, email_error = ? WHERE id = ?')
    .bind(problem ? 0 : 1, problem || null, id).run();

  if (problem) console.error('A message was saved but not emailed:', problem);

  /* The visitor is told it arrived either way, because it did. */
  return { status: 201, ok: true, id };
}
