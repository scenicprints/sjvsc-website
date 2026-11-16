/* Somebody asking the club to put an event on the calendar.

   This is the one write on the site that is not behind a sign-in. Regina
   runs the Almond Blossom Dance and Karen runs the Jass lunch, and neither
   of them should need an account to hand the webmaster a flyer and a date.

   That openness is the whole of the risk, so the door has three locks:

     Turnstile  -- a Cloudflare challenge, checked server-side. Without a
                   token that Cloudflare itself vouches for, nothing is
                   written and nothing is sent. This is what keeps the form
                   from becoming a way to post bytes into the database.
     Size       -- three files, eight megabytes each, twelve in total. The
                   browser resizes photographs before sending; the ceiling
                   is the backstop for a page that forgets to.
     Shape      -- a name and a day, and everything trimmed to a length a
                   human would write.

   The row is written before the email is sent, on purpose. See the comment
   on the migration: a member who fills in a form and sees "thank you" must
   not be able to disappear because a third party had a bad afternoon. */

const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND_URL = 'https://api.resend.com/emails';

const FILE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

const MAX_FILES = 3;
const MAX_ONE = 8 * 1024 * 1024;
const MAX_ALL = 12 * 1024 * 1024;

/* Long enough for anything a person writes, short enough that the body of
   a request cannot be used to fill the database with prose. */
const LIMITS = {
  who: 120, contact: 120, title: 140, note: 200, desc: 4000,
  date: 10, time: 40, tickprice: 200, tickwhere: 300, tickto: 10,
};

const trim = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

/* Cloudflare decides whether the visitor is a person. A missing secret
   fails closed: with no way to tell, nothing is accepted. */
async function passedTurnstile(token, ip, env) {
  if (!env.TURNSTILE_SECRET) return false;
  if (!token) return false;
  try {
    const res = await fetch(TURNSTILE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET,
        response: token,
        remoteip: ip || undefined,
      }),
    });
    const out = await res.json();
    return out && out.success === true;
  } catch (err) {
    console.error('Turnstile would not answer:', err?.stack || err);
    return false;
  }
}

/* base64 in, bytes out. The browser sends files this way because the rest
   of the request is JSON and one shape is easier to reason about than two. */
function fromBase64(data) {
  const clean = String(data || '').replace(/^data:[^,]*,/, '');
  const binary = atob(clean);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function tidyName(raw, fallback) {
  const name = String(raw || '').split(/[\\/]/).pop().trim();
  return name ? name.slice(0, 120) : fallback;
}

function fileKey(type) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `request/${Date.now().toString(36)}-${rand}.${FILE_TYPES[type]}`;
}

const escape = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* What the webmaster reads. Every field the member filled in, in the order
   the form asked for it, and nothing invented to pad it out. A field left
   blank is left out rather than shown empty, because an empty row reads as
   a fact ("no time") when it only means they did not say. */
function emailHtml(r, files, site) {
  const rows = [
    ['Event', r.title],
    ['Day', r.event_date],
    ['Time', r.event_time],
    ['One line', r.note],
    ['What it costs', r.tickprice],
    ['Where to get a ticket', r.tickwhere],
    ['Tickets on sale until', r.tickto],
  ].filter(([, v]) => v);

  const sked = (r.schedule || []).filter((s) => s.at || s.what);

  return `<div style="font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#1a1613">
<p style="margin:0 0 18px">
  <b>${escape(r.who) || 'Somebody'}</b> has asked for an event on the calendar.
</p>
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 18px">
${rows.map(([k, v]) => `  <tr>
    <td style="padding:4px 18px 4px 0;color:#6b625b;white-space:nowrap;vertical-align:top">${escape(k)}</td>
    <td style="padding:4px 0"><b>${escape(v)}</b></td>
  </tr>`).join('\n')}
${r.contact ? `  <tr>
    <td style="padding:4px 18px 4px 0;color:#6b625b;white-space:nowrap;vertical-align:top">Reach them on</td>
    <td style="padding:4px 0"><b>${escape(r.contact)}</b></td>
  </tr>` : ''}
</table>
${r.description ? `<p style="margin:0 0 18px;white-space:pre-wrap">${escape(r.description)}</p>` : ''}
${sked.length ? `<p style="margin:0 0 6px;color:#6b625b">Through the day</p>
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 18px">
${sked.map((s) => `  <tr>
    <td style="padding:3px 18px 3px 0;white-space:nowrap">${escape(s.at)}</td>
    <td style="padding:3px 0">${escape(s.what)}</td>
  </tr>`).join('\n')}
</table>` : ''}
${files.length ? `<p style="margin:0 0 18px;color:#6b625b">
  ${files.length === 1 ? 'One file is attached' : files.length + ' files are attached'}, and also at:
  ${files.map((f) => `<br><a href="${site}/uploads/${escape(f.key)}">${escape(f.name)}</a>`).join('')}
</p>` : ''}
<p style="margin:0;color:#6b625b;font-size:13px">
  Sent by the request form on ${escape(site.replace(/^https?:\/\//, ''))}.
  Nothing has been put on the calendar: that is still yours to do in the admin.
</p>
</div>`;
}

/* Resend will not send from a domain it has not verified, and the key is
   a sending-only one. A failure here is recorded against the row and the
   member is still told the request arrived, because it did -- it is in the
   database, which is the thing that matters. */
async function sendEmail(env, r, files, site) {
  if (!env.RESEND_API_KEY) return 'No Resend key is configured.';
  if (!env.REQUEST_TO) return 'Nobody is configured to receive requests.';

  const subject = `Event request: ${r.title}${r.event_date ? ' — ' + r.event_date : ''}`;
  const body = {
    from: env.REQUEST_FROM || 'Swiss Club website <events@mail.sjvscriponswiss.com>',
    to: [env.REQUEST_TO],
    subject,
    html: emailHtml(r, files, site),
    attachments: files.map((f) => ({ filename: f.name, content: f.base64 })),
  };

  /* So the webmaster can answer the member by pressing reply, where what
     they gave is an address rather than a telephone number. */
  if (r.contact && r.contact.includes('@') && !/\s/.test(r.contact)) {
    body.reply_to = r.contact;
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const said = await res.text();
    return `Resend answered ${res.status}: ${said.slice(0, 400)}`;
  } catch (err) {
    return `Resend would not answer: ${String(err?.message || err).slice(0, 200)}`;
  }
}

export async function createRequest(request, env, url) {
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

  const r = {};
  for (const key of Object.keys(LIMITS)) r[key] = trim(body?.[key], LIMITS[key]);
  if (!r.title) return { status: 422, message: 'The event needs a name.' };
  if (!r.date) return { status: 422, message: 'The event needs a day.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
    return { status: 422, message: 'The day must be yyyy-mm-dd.' };
  }
  if (r.tickto && !/^\d{4}-\d{2}-\d{2}$/.test(r.tickto)) r.tickto = '';

  const schedule = Array.isArray(body?.schedule)
    ? body.schedule.slice(0, 20).map((s) => ({
        at: trim(s?.at, 40), what: trim(s?.what, 140),
      })).filter((s) => s.at || s.what)
    : [];

  /* The files. Anything that is not an allowed type, or is too big, stops
     the whole request rather than being dropped quietly -- a member who
     attached a flyer and was told "thank you" would never learn it had
     been thrown away. */
  const given = Array.isArray(body?.files) ? body.files : [];
  if (given.length > MAX_FILES) {
    return { status: 422, message: `Three files is the most. You attached ${given.length}.` };
  }

  const files = [];
  let total = 0;
  for (const f of given) {
    const type = String(f?.type || '').toLowerCase();
    if (!FILE_TYPES[type]) {
      return { status: 415, message: 'A flyer has to be a JPEG, a PNG, a WebP or a PDF.' };
    }
    let bytes;
    try {
      bytes = fromBase64(f?.data);
    } catch {
      return { status: 400, message: 'One of those files did not arrive in one piece.' };
    }
    if (!bytes.length) return { status: 400, message: 'One of those files was empty.' };
    if (bytes.length > MAX_ONE) {
      return { status: 413, message: 'Each file has to be under eight megabytes.' };
    }
    total += bytes.length;
    if (total > MAX_ALL) {
      return { status: 413, message: 'Twelve megabytes in total is the most.' };
    }
    files.push({
      key: fileKey(type),
      name: tidyName(f?.name, 'flyer.' + FILE_TYPES[type]),
      type,
      bytes,
      base64: String(f?.data || '').replace(/^data:[^,]*,/, ''),
    });
  }

  /* Written before a word is sent. */
  for (const f of files) {
    await env.DB.prepare(
      'INSERT INTO files (key, bytes, type, slug, name, created_by) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(f.key, [...f.bytes], f.type, 'request', f.name, 'a request').run();
  }

  const row = {
    who: r.who, contact: r.contact, title: r.title, note: r.note,
    description: r.desc, event_date: r.date, event_time: r.time,
    schedule, tickprice: r.tickprice, tickwhere: r.tickwhere, tickto: r.tickto,
  };

  const made = await env.DB.prepare(
    `INSERT INTO requests
       (who, contact, title, note, description, event_date, event_time,
        schedule, tickprice, tickwhere, tickto, files)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    row.who || null, row.contact || null, row.title, row.note || null,
    row.description || null, row.event_date, row.event_time || null,
    JSON.stringify(schedule),
    row.tickprice || null, row.tickwhere || null, row.tickto || null,
    JSON.stringify(files.map((f) => ({
      key: f.key, name: f.name, type: f.type, bytes: f.bytes.length,
    })))
  ).run();

  const id = made?.meta?.last_row_id;
  const site = url.origin;
  const problem = await sendEmail(env, row, files, site);

  await env.DB.prepare('UPDATE requests SET emailed = ?, email_error = ? WHERE id = ?')
    .bind(problem ? 0 : 1, problem || null, id).run();

  if (problem) console.error('A request was saved but not emailed:', problem);

  /* The member is told it arrived either way, because it did. */
  return { status: 201, ok: true, id };
}
