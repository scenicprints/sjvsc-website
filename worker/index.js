/* The API behind the website.

   Everything that is not /api/* is a file on disk and is served as one, so
   the public pages reach the visitor exactly as they always have. This
   Worker exists for the part a file cannot do: letting the board change
   what the pages say.

   Reads are open. Writes go through requireBoard. */

import { requireBoard } from './auth.js';
import { rowToEvent, eventToRow, validateEvent, withWindow, WRITABLE } from './shape.js';

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });

/* Reads are tiny and change rarely; half a minute keeps a burst off the
   database without anyone noticing a stale event. The admin sends its own
   cache-buster, so an edit shows up the moment it is saved. */
const READ_CACHE = { 'Cache-Control': 'public, max-age=30' };

const oops = (status, message) => json({ error: message }, status);

/* Ids read better as words than as timestamps — jass-fall rather than
   e1792808398146 — so one is made from the name, with a short suffix so two
   events of the same name in different years cannot collide. */
function makeId(title) {
  const slug = String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  return slug ? `${slug}-${suffix}` : `event-${suffix}`;
}

async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

/* Only the keys the client is allowed to set, and only those it sent. */
function pickWritable(body) {
  const out = {};
  for (const key of WRITABLE) {
    if (Object.prototype.hasOwnProperty.call(body, key)) out[key] = body[key];
  }
  return out;
}

/* ---- the history ----------------------------------------------------

   Every write leaves a line here. The whole thing before and the whole
   thing after go in as JSON, so the screen can work out which fields
   moved, and so a change stays readable after the row it describes has
   been deleted.

   Recording must never be the reason a save fails. If the log write
   throws, the change the board made still stands and the failure goes to
   the Workers log instead. */
async function record(env, auth, action, kind, thing, title, before, after) {
  try {
    await env.DB.prepare(
      `INSERT INTO changes (who, who_name, action, kind, thing, title, before, after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      auth.who,
      auth.name || null,
      action,
      kind,
      thing == null ? null : String(thing),
      title == null ? null : String(title),
      before == null ? null : JSON.stringify(before),
      after == null ? null : JSON.stringify(after)
    ).run();
  } catch (err) {
    console.error('The change was made but not recorded:', err?.stack || err);
  }
}

async function listChanges(env, limit) {
  const n = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const { results } = await env.DB.prepare(
    `SELECT id, at, who, who_name, action, kind, thing, title, before, after
       FROM changes ORDER BY at DESC, id DESC LIMIT ?`
  ).bind(n).all();
  return (results || []).map((r) => {
    const parse = (v) => { try { return v ? JSON.parse(v) : null; } catch { return null; } };
    return { ...r, before: parse(r.before), after: parse(r.after) };
  });
}

async function listEvents(env, shelf) {
  const { results } = await env.DB
    .prepare('SELECT * FROM events WHERE shelf = ? ORDER BY event_date, title')
    .bind(shelf)
    .all();
  return (results || []).map(rowToEvent);
}

async function getEvent(env, id) {
  return env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(id).first();
}

const COLUMNS = [
  'title', 'note', 'description', 'image', 'link', 'page',
  'event_date', 'event_time', 'adv_from', 'adv_until',
  'tickprice', 'tickfrom', 'tickto',
  'details', 'attachments', 'ticksellers', 'tickprices',
];

async function createEvent(request, env, auth, shelf) {
  const who = auth.who;
  const body = await readBody(request);
  if (!body) return oops(400, 'That was not JSON.');

  /* A shelf event carries no dates, so it gets no window either. */
  const clean = shelf === 1 ? pickWritable(body) : withWindow(pickWritable(body));
  const problems = validateEvent(clean, { shelf: shelf === 1 });
  if (problems.length) return json({ error: problems.join(' ') }, 422);

  const row = eventToRow(clean);
  const id = makeId(row.title);

  await env.DB.prepare(
    `INSERT INTO events (id, ${COLUMNS.join(', ')}, shelf, updated_by)
     VALUES (?, ${COLUMNS.map(() => '?').join(', ')}, ?, ?)`
  ).bind(id, ...COLUMNS.map((c) => row[c]), shelf, who).run();

  const made = rowToEvent(await getEvent(env, id));
  await record(env, auth, 'added', shelf === 1 ? 'saved event' : 'event',
    id, made.title, null, made);
  return json(made, 201);
}

async function updateEvent(request, env, auth, id) {
  const who = auth.who;
  const existing = await getEvent(env, id);
  if (!existing) return oops(404, 'There is no event with that id.');

  const body = await readBody(request);
  if (!body) return oops(400, 'That was not JSON.');

  /* A partial update is merged onto what is already there, so the admin can
     save one field without resending the whole event. */
  let merged = { ...rowToEvent(existing), ...pickWritable(body) };
  if (existing.shelf !== 1) merged = withWindow(merged);
  const problems = validateEvent(merged, { shelf: existing.shelf === 1 });
  if (problems.length) return json({ error: problems.join(' ') }, 422);

  const row = eventToRow(merged);

  await env.DB.prepare(
    `UPDATE events SET ${COLUMNS.map((c) => `${c} = ?`).join(', ')},
       updated_at = datetime('now'), updated_by = ?
     WHERE id = ?`
  ).bind(...COLUMNS.map((c) => row[c]), who, id).run();

  const now = rowToEvent(await getEvent(env, id));
  await record(env, auth, 'changed', existing.shelf === 1 ? 'saved event' : 'event',
    id, now.title, rowToEvent(existing), now);
  return json(now);
}

async function deleteEvent(env, auth, id) {
  /* read it before it goes, so the history can still show what it was */
  const existing = await getEvent(env, id);
  const { meta } = await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();
  if (!meta?.changes) return oops(404, 'There is no event with that id.');
  if (existing) {
    const was = rowToEvent(existing);
    await record(env, auth, 'removed', existing.shelf === 1 ? 'saved event' : 'event',
      id, was.title, was, null);
  }
  return new Response(null, { status: 204 });
}

async function activeRates(env) {
  const row = await env.DB
    .prepare('SELECT data FROM rate_cards WHERE active = 1 ORDER BY id DESC LIMIT 1')
    .first();
  if (!row) return null;
  try { return JSON.parse(row.data); } catch { return null; }
}

/* One card, replaced in place.

   This used to keep every version, on the reasoning that a quote already
   given should stay readable against the prices that produced it. But a
   quote here is never stored — it is worked out in the browser and handed
   to the contact form — so there is nothing to read an old card back
   against, and the old rows were only accumulating. */
async function putRates(request, env, auth) {
  const who = auth.who;
  const body = await readBody(request);
  if (!body) return oops(400, 'That was not JSON.');

  if (!body.rent || typeof body.rent !== 'object') {
    return oops(422, 'The rate card needs a rent, with a member and a non-member price.');
  }
  for (const who2 of ['member', 'nonmember']) {
    if (typeof body.rent[who2] !== 'number' || body.rent[who2] < 0) {
      return oops(422, `The ${who2} price must be a number.`);
    }
  }
  for (const key of ['fees', 'use', 'options']) {
    if (!Array.isArray(body[key])) return oops(422, `The rate card needs a ${key} list.`);
  }

  const before = await activeRates(env);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM rate_cards'),
    env.DB.prepare('INSERT INTO rate_cards (data, active, created_by) VALUES (?, 1, ?)')
      .bind(JSON.stringify(body), who),
  ]);
  await record(env, auth, 'changed', 'rate card', 'rates', 'Hall rental prices',
    before, body);
  return json(body);
}

/* ---- photographs the board uploads --------------------------------

   They live in D1, beside everything else. R2 is the tool built for files
   and wants a subscription the club is not taking; the database is here
   already and a club gallery is nowhere near its limits.

   The browser resizes before sending, so what arrives is a few hundred
   kilobytes of JPEG rather than whatever came off a phone. The ceiling
   below is a backstop against a page that forgets to, not the expected
   size.

   A key is never reused, so a picture URL can be cached forever. */

const UPLOAD_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  /* a flyer, the minutes, a form to fill in */
  'application/pdf': 'pdf',
};
const MAX_UPLOAD = 10 * 1024 * 1024;

function uploadKey(slug, type) {
  const clean = String(slug || 'club').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'club';
  const rand = Math.random().toString(36).slice(2, 8);
  return `${clean}/${Date.now().toString(36)}-${rand}.${UPLOAD_TYPES[type]}`;
}

/* The name the file had when it was chosen. It is shown as the link text
   on an event, so it must not carry a path or anything that would read
   oddly in a sentence. */
function tidyName(raw) {
  const name = String(raw || '').split(/[\\/]/).pop().trim();
  return name ? name.slice(0, 120) : null;
}

async function putUpload(request, env, auth, slug, givenName) {
  const who = auth.who;
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim();
  if (!UPLOAD_TYPES[type]) {
    return oops(415, 'That has to be a JPEG, a PNG, a WebP or a PDF.');
  }

  const body = await request.arrayBuffer();
  if (!body.byteLength) return oops(400, 'That file was empty.');
  if (body.byteLength > MAX_UPLOAD) {
    return oops(413, 'That file is too big. Ten megabytes is the most.');
  }

  const key = uploadKey(slug, type);
  const name = tidyName(givenName);
  await env.DB.prepare(
    'INSERT INTO files (key, bytes, type, slug, name, created_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(key, [...new Uint8Array(body)], type, slug || null, name, who).run();

  const isPicture = type.startsWith('image/');
  await record(env, auth, 'added', isPicture ? 'picture' : 'file', key,
    name || ((isPicture ? 'A picture for ' : 'A file for ') + (slug || 'the club')),
    null, { src: 'uploads/' + key, bytes: body.byteLength, type });

  return json({ src: 'uploads/' + key, name: name, bytes: body.byteLength }, 201);
}

async function getUpload(env, key) {
  const row = await env.DB.prepare('SELECT bytes, type, name FROM files WHERE key = ?')
    .bind(key).first();
  if (!row) return new Response('Not found', { status: 404 });

  /* D1 hands a BLOB back as an array of byte values rather than as an
     ArrayBuffer, so it is rebuilt here. */
  const bytes = row.bytes instanceof ArrayBuffer
    ? new Uint8Array(row.bytes)
    : Uint8Array.from(row.bytes);

  const headers = {
    'Content-Type': row.type || 'application/octet-stream',
    /* the key is unique to the upload, so this never goes stale */
    'Cache-Control': 'public, max-age=31536000, immutable',
  };
  /* A PDF offered for download should arrive called what the club called
     it, not a key. An image is displayed rather than saved, so it needs
     no disposition. */
  if (row.name && !String(row.type).startsWith('image/')) {
    headers['Content-Disposition'] =
      'inline; filename="' + row.name.replace(/["\\]/g, '') + '"';
  }
  return new Response(bytes, { headers });
}

/* ---- the flyer that stands all year --------------------------------

   One row, or none. getFlyer answers null rather than an error when the
   club has not put one up, because a home page with no flyer is a normal
   state and not a fault. */

async function getFlyer(env) {
  const row = await env.DB.prepare(
    'SELECT title, happens, place, note, src, cover, pages, link, crop FROM flyer WHERE id = 1'
  ).first();
  if (!row) return null;
  try { row.pages = row.pages ? JSON.parse(row.pages) : []; } catch { row.pages = []; }
  if (!Array.isArray(row.pages)) row.pages = [];
  return row;
}

async function putFlyer(request, env, auth) {
  const body = await readBody(request);
  if (!body) return oops(400, 'That was not JSON.');

  const title = String(body.title || '').trim();
  const src = String(body.src || '').trim();
  if (!title) return oops(422, 'The flyer needs a name.');
  if (!src) return oops(422, 'The flyer needs a poster.');

  const happens = String(body.happens || '').trim();
  if (happens && !/^\d{4}-\d{2}-\d{2}$/.test(happens)) {
    return oops(422, 'The day must be yyyy-mm-dd.');
  }
  const crop = ['top', 'middle', 'bottom'].includes(body.crop) ? body.crop : 'top';

  const before = await getFlyer(env);
  await env.DB.prepare(
    `INSERT INTO flyer (id, title, happens, place, note, src, cover, pages,
                        link, crop, updated_by)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       title = excluded.title, happens = excluded.happens, place = excluded.place,
       note = excluded.note, src = excluded.src, cover = excluded.cover,
       pages = excluded.pages, link = excluded.link, crop = excluded.crop,
       updated_by = excluded.updated_by, updated_at = datetime('now')`
  ).bind(title, happens || null, String(body.place || '').trim() || null,
         String(body.note || '').trim() || null, src,
         String(body.cover || '').trim() || null,
         JSON.stringify(Array.isArray(body.pages) ? body.pages.filter(Boolean) : []),
         String(body.link || '').trim() || null, crop, auth.who).run();

  const after = await getFlyer(env);
  await record(env, auth, before ? 'changed' : 'added', 'flyer', 'flyer', title,
    before, after);
  return json(after);
}

async function clearFlyer(env, auth) {
  const before = await getFlyer(env);
  if (!before) return new Response(null, { status: 204 });
  await env.DB.prepare('DELETE FROM flyer WHERE id = 1').run();
  await record(env, auth, 'removed', 'flyer', 'flyer', before.title, before, null);
  return new Response(null, { status: 204 });
}

async function allGallery(env) {
  const { results } = await env.DB.prepare('SELECT slug, data FROM gallery').all();
  const out = {};
  for (const row of results || []) {
    try { out[row.slug] = JSON.parse(row.data); } catch { out[row.slug] = []; }
  }
  return out;
}

async function putGallery(request, env, auth, slug) {
  const who = auth.who;
  const body = await readBody(request);
  if (!Array.isArray(body)) return oops(422, 'A gallery is a list of pictures.');
  const was = await env.DB.prepare('SELECT data FROM gallery WHERE slug = ?')
    .bind(slug).first();
  let before = null;
  if (was) { try { before = JSON.parse(was.data); } catch { before = null; } }

  await env.DB.prepare(
    `INSERT INTO gallery (slug, data, updated_by) VALUES (?, ?, ?)
     ON CONFLICT (slug) DO UPDATE SET
       data = excluded.data, updated_by = excluded.updated_by,
       updated_at = datetime('now')`
  ).bind(slug, JSON.stringify(body), who).run();

  await record(env, auth, 'changed', 'pictures', slug,
    'Pictures on ' + slug, before, body);
  return json(body);
}

/* ---- where the old site's addresses went ---------------------------

   Seventeen of the old site's twenty-four pages kept their address, so
   most links into the club's site still land. These are the ones that
   did not, and a link to any of them -- a bookmark, a Facebook post
   from 2019, Google's index -- would otherwise reach a 404 on the day
   the domain moves.

   The first seven are renames and are not in doubt. The last four are
   pages that held almost nothing; each goes to the standing page that
   covers its subject, which is a judgement rather than a fact, and any
   of them is one line to change.

   301 rather than 302: these moves are permanent and search engines
   should carry the old page's standing over to the new one. */

const MOVED = {
  '/hall-rental': '/rentals',
  '/oktoberfest': '/event-oktoberfest',
  '/jass': '/event-jass',
  '/children-s-christmas-party': '/event-childrens-christmas',
  '/almond-blossom-dance': '/almond-blossom',
  '/west-coast-swiss-wrestling-association': '/wcswa',
  '/küche-kästle-kochbuch': '/kochbuch',

  '/schwingfests': '/schwingen',
  '/eidgenössisches-2022': '/schwingen',
  '/playground': '/rentals',
  '/swiss-miss': '/club-history',
  '/may-birthday-celebration': '/calendar'
};

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();

  /* The old addresses arrive percent-encoded -- /k%c3%bcche-... -- and
     decoding is what makes the two German pages match. A malformed
     escape throws rather than matching, so it falls through to the
     asset handler and its 404, which is the right answer anyway. */
  let asked = path;
  try { asked = decodeURIComponent(path).toLowerCase(); } catch (e) { /* leave it */ }
  const movedTo = MOVED[asked];
  if (movedTo) return Response.redirect(new URL(movedTo, url).toString(), 301);

  /* ---- reads, open to anyone ---- */

  if (method === 'GET' || method === 'HEAD') {
    if (path === '/api/events') return json(await listEvents(env, 0), 200, READ_CACHE);
    if (path === '/api/saved')  return json(await listEvents(env, 1), 200, READ_CACHE);
    if (path === '/api/rates')  return json(await activeRates(env) ?? {}, 200, READ_CACHE);
    if (path === '/api/gallery') return json(await allGallery(env), 200, READ_CACHE);
    if (path === '/api/flyer')   return json(await getFlyer(env), 200, READ_CACHE);

    /* The history is the board's own record, so it is not public. */
    if (path === '/api/changes') {
      const auth = await requireBoard(request, env);
      if (!auth.ok) return oops(auth.status, auth.message);
      return json(await listChanges(env, url.searchParams.get('limit')));
    }

    /* An upload is public: it is on the website. */
    if (path.startsWith('/uploads/')) {
      return getUpload(env, path.slice('/uploads/'.length));
    }

    /* The admin asks this to decide whether to show the form as editable. */
    if (path === '/api/me') {
      const auth = await requireBoard(request, env);
      return auth.ok
        ? json({ signedIn: true, who: auth.who, role: auth.role })
        : json({ signedIn: false });
    }
  }

  /* ---- writes, board only ---- */

  const writesTo =
    path === '/api/events' || path.startsWith('/api/events/') ||
    path === '/api/saved'  || path.startsWith('/api/saved/')  ||
    path === '/api/rates'  || path.startsWith('/api/gallery/') ||
    path.startsWith('/api/upload') ||
    path === '/api/flyer';

  if (writesTo && method !== 'GET' && method !== 'HEAD') {
    const auth = await requireBoard(request, env);
    if (!auth.ok) return oops(auth.status, auth.message);

    if (method === 'POST' && path === '/api/events') return createEvent(request, env, auth, 0);
    if (method === 'POST' && path === '/api/saved')  return createEvent(request, env, auth, 1);

    const eventId = /^\/api\/(?:events|saved)\/([^/]+)$/.exec(path)?.[1];
    if (eventId) {
      if (method === 'PUT' || method === 'PATCH') return updateEvent(request, env, auth, eventId);
      if (method === 'DELETE') return deleteEvent(env, auth, eventId);
    }

    if (method === 'PUT' && path === '/api/rates') return putRates(request, env, auth);

    if (path === '/api/flyer') {
      if (method === 'PUT') return putFlyer(request, env, auth);
      if (method === 'DELETE') return clearFlyer(env, auth);
    }

    if (method === 'POST' && path === '/api/upload') {
      return putUpload(request, env, auth,
        url.searchParams.get('for'), url.searchParams.get('name'));
    }

    const slug = /^\/api\/gallery\/([^/]+)$/.exec(path)?.[1];
    if (slug && method === 'PUT') return putGallery(request, env, auth, slug);

    return oops(405, `${method} is not something this address does.`);
  }

  if (path.startsWith('/api/')) return oops(404, 'No such endpoint.');

  /* Not the API: it is a page, a stylesheet or a photograph. */
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env);
    } catch (err) {
      /* A failure here must not return a stack trace to a visitor. The
         detail goes to the Workers log, which observability keeps. */
      console.error('Unhandled', err?.stack || err);
      return oops(500, 'Something went wrong at our end.');
    }
  },
};
