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
  'details', 'attachments', 'ticksellers',
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

const PICTURE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_PICTURE = 5 * 1024 * 1024;

function pictureKey(slug, type) {
  const clean = String(slug || 'club').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'club';
  const rand = Math.random().toString(36).slice(2, 8);
  return `${clean}/${Date.now().toString(36)}-${rand}.${PICTURE_TYPES[type]}`;
}

async function putPicture(request, env, auth, slug) {
  const who = auth.who;
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim();
  if (!PICTURE_TYPES[type]) {
    return oops(415, 'A picture has to be a JPEG, a PNG or a WebP.');
  }

  const body = await request.arrayBuffer();
  if (!body.byteLength) return oops(400, 'That picture was empty.');
  if (body.byteLength > MAX_PICTURE) {
    return oops(413, 'That picture is too big. It should be resized before it is sent.');
  }

  const key = pictureKey(slug, type);
  await env.DB.prepare(
    'INSERT INTO pictures (key, bytes, type, slug, created_by) VALUES (?, ?, ?, ?, ?)'
  ).bind(key, [...new Uint8Array(body)], type, slug || null, who).run();

  await record(env, auth, 'added', 'picture', key,
    'A picture for ' + (slug || 'the club'), null,
    { src: 'pictures/' + key, bytes: body.byteLength, type });
  return json({ src: 'pictures/' + key, bytes: body.byteLength }, 201);
}

async function getPicture(env, key) {
  const row = await env.DB.prepare('SELECT bytes, type FROM pictures WHERE key = ?')
    .bind(key).first();
  if (!row) return new Response('Not found', { status: 404 });

  /* D1 hands a BLOB back as an array of byte values rather than as an
     ArrayBuffer, so it is rebuilt here. */
  const bytes = row.bytes instanceof ArrayBuffer
    ? new Uint8Array(row.bytes)
    : Uint8Array.from(row.bytes);

  return new Response(bytes, {
    headers: {
      'Content-Type': row.type || 'image/jpeg',
      /* the key is unique to the upload, so this never goes stale */
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
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

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();

  /* ---- reads, open to anyone ---- */

  if (method === 'GET' || method === 'HEAD') {
    if (path === '/api/events') return json(await listEvents(env, 0), 200, READ_CACHE);
    if (path === '/api/saved')  return json(await listEvents(env, 1), 200, READ_CACHE);
    if (path === '/api/rates')  return json(await activeRates(env) ?? {}, 200, READ_CACHE);
    if (path === '/api/gallery') return json(await allGallery(env), 200, READ_CACHE);

    /* The history is the board's own record, so it is not public. */
    if (path === '/api/changes') {
      const auth = await requireBoard(request, env);
      if (!auth.ok) return oops(auth.status, auth.message);
      return json(await listChanges(env, url.searchParams.get('limit')));
    }

    /* A photograph is public: it is on the website. */
    if (path.startsWith('/pictures/')) {
      return getPicture(env, path.slice('/pictures/'.length));
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
    path.startsWith('/api/pictures');

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

    if (method === 'POST' && path === '/api/pictures') {
      return putPicture(request, env, auth, url.searchParams.get('for'));
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
