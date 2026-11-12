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

async function createEvent(request, env, who, shelf) {
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

  return json(rowToEvent(await getEvent(env, id)), 201);
}

async function updateEvent(request, env, who, id) {
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

  return json(rowToEvent(await getEvent(env, id)));
}

async function deleteEvent(env, id) {
  const { meta } = await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();
  if (!meta?.changes) return oops(404, 'There is no event with that id.');
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
async function putRates(request, env, who) {
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

  await env.DB.batch([
    env.DB.prepare('DELETE FROM rate_cards'),
    env.DB.prepare('INSERT INTO rate_cards (data, active, created_by) VALUES (?, 1, ?)')
      .bind(JSON.stringify(body), who),
  ]);
  return json(body);
}

async function allGallery(env) {
  const { results } = await env.DB.prepare('SELECT slug, data FROM gallery').all();
  const out = {};
  for (const row of results || []) {
    try { out[row.slug] = JSON.parse(row.data); } catch { out[row.slug] = []; }
  }
  return out;
}

async function putGallery(request, env, who, slug) {
  const body = await readBody(request);
  if (!Array.isArray(body)) return oops(422, 'A gallery is a list of pictures.');
  await env.DB.prepare(
    `INSERT INTO gallery (slug, data, updated_by) VALUES (?, ?, ?)
     ON CONFLICT (slug) DO UPDATE SET
       data = excluded.data, updated_by = excluded.updated_by,
       updated_at = datetime('now')`
  ).bind(slug, JSON.stringify(body), who).run();
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
    path === '/api/rates'  || path.startsWith('/api/gallery/');

  if (writesTo && method !== 'GET' && method !== 'HEAD') {
    const auth = await requireBoard(request, env);
    if (!auth.ok) return oops(auth.status, auth.message);
    const who = auth.who;

    if (method === 'POST' && path === '/api/events') return createEvent(request, env, who, 0);
    if (method === 'POST' && path === '/api/saved')  return createEvent(request, env, who, 1);

    const eventId = /^\/api\/(?:events|saved)\/([^/]+)$/.exec(path)?.[1];
    if (eventId) {
      if (method === 'PUT' || method === 'PATCH') return updateEvent(request, env, who, eventId);
      if (method === 'DELETE') return deleteEvent(env, eventId);
    }

    if (method === 'PUT' && path === '/api/rates') return putRates(request, env, who);

    const slug = /^\/api\/gallery\/([^/]+)$/.exec(path)?.[1];
    if (slug && method === 'PUT') return putGallery(request, env, who, slug);

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
