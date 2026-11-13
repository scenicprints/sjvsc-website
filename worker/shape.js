/* The shape the front end has always seen.

   data/events.json gave every page an array of plain objects, and every page
   reads them directly. So the API hands back that same array rather than
   anything cleverer: the rows come out of D1 and go through here on the way,
   and nothing in assets/js has to learn a new shape.

   Three columns are named around SQL keywords, and this is where that stops
   mattering: description -> desc, adv_from -> from, adv_until -> until. */

/* A JSON column that is empty, null or malformed must not take a page down:
   an event with a broken details blob is still an event with a date. */
function parseList(value) {
  if (!value) return [];
  try {
    const out = JSON.parse(value);
    return Array.isArray(out) ? out : [];
  } catch {
    return [];
  }
}

/* Keys the client may set. Anything else in a submitted body is dropped —
   id, timestamps and shelf are the server's to decide, never the caller's. */
export const WRITABLE = [
  'title', 'note', 'desc', 'image', 'link', 'page',
  'date', 'time', 'from', 'until',
  'tickprice', 'tickfrom', 'tickto',
  'details', 'attachments', 'ticksellers', 'tickprices',
];

export function rowToEvent(row) {
  const out = {
    id: row.id,
    title: row.title,
    note: row.note || '',
    desc: row.description || '',
    date: row.event_date,
    time: row.event_time || '',
    page: row.page || '',
    from: row.adv_from || '',
    until: row.adv_until || '',
    details: parseList(row.details),
    attachments: parseList(row.attachments),
    ticksellers: parseList(row.ticksellers),
    tickprices: parseList(row.tickprices),
    tickprice: row.tickprice || '',
    tickfrom: row.tickfrom || '',
    tickto: row.tickto || '',
  };
  /* image and link are absent rather than empty when unset, because the
     pages test for their presence, not their truthiness. */
  if (row.image) out.image = row.image;
  if (row.link) out.link = row.link;
  return out;
}

/* The reverse, for writes. Returns the column values; the caller supplies
   the id and the timestamps. */
export function eventToRow(body) {
  const str = (v) => (v == null ? '' : String(v));
  const orNull = (v) => (v == null || v === '' ? null : String(v));
  const list = (v) => JSON.stringify(Array.isArray(v) ? v : []);

  return {
    title: str(body.title).trim(),
    note: str(body.note),
    description: str(body.desc),
    image: orNull(body.image),
    link: orNull(body.link),
    page: str(body.page),
    event_date: str(body.date).trim(),
    event_time: str(body.time),
    adv_from: orNull(body.from),
    adv_until: orNull(body.until),
    tickprice: str(body.tickprice),
    tickfrom: orNull(body.tickfrom),
    tickto: orNull(body.tickto),
    details: list(body.details),
    attachments: list(body.attachments),
    ticksellers: list(body.ticksellers),
    tickprices: list(body.tickprices),
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/* The advertising window, filled in where the club did not.

   events-data.js shows an event only while today sits between `from` and
   `until`, and it compares dates without guarding against a missing one —
   so an event with either side blank never appears at all. The events
   screen has no field for `until` on purpose: its own wording promises the
   event "comes off the website by itself the day after the event", and this
   is where that promise is kept.

   `from` falls back to today, so an event added now is advertised now. */
export function withWindow(body, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const out = { ...body };
  const date = String(out.date || '').trim();

  if (!String(out.from || '').trim()) out.from = today;

  if (!String(out.until || '').trim() && ISO_DATE.test(date)) {
    out.until = shiftDays(date, 1);
  }
  return out;
}

/* What has to be true before a row is written. The club writes its own
   headings and its own prose, so almost everything is optional — but an
   event with no title or no day is not an event, and a date that is not a
   date silently breaks every sort and every calendar cell. */
export function validateEvent(body, { shelf = false } = {}) {
  const problems = [];

  if (!body || typeof body !== 'object') return ['The body must be an object.'];
  if (!String(body.title || '').trim()) problems.push('An event needs a name.');

  /* A shelf event is one the club runs again and has not yet dated. */
  const date = String(body.date || '').trim();
  if (!shelf && !date) problems.push('An event needs a day.');
  if (date && !ISO_DATE.test(date)) problems.push('The day must be yyyy-mm-dd.');

  for (const key of ['from', 'until', 'tickfrom', 'tickto']) {
    const v = String(body[key] || '').trim();
    if (v && !ISO_DATE.test(v)) problems.push(`${key} must be yyyy-mm-dd.`);
  }

  if (date && ISO_DATE.test(date)) {
    const until = String(body.until || '').trim();
    /* An event advertised until before it happens never reaches a reader.
       This is the mistake the old site made in the other direction. */
    if (until && ISO_DATE.test(until) && until < date) {
      problems.push('The event stops being advertised before the day it happens.');
    }
    const tickto = String(body.tickto || '').trim();
    if (tickto && ISO_DATE.test(tickto) && tickto > date) {
      problems.push('Tickets are on sale after the event is over.');
    }
  }

  for (const key of ['details', 'attachments', 'ticksellers', 'tickprices']) {
    if (body[key] != null && !Array.isArray(body[key])) {
      problems.push(`${key} must be a list.`);
    }
  }

  return problems;
}
