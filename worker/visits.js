/* Counting visits.

   Every public page sends one small message when it opens: which page,
   where the visitor came from, and what kind of thing it was. The Worker
   adds what Cloudflare already knows -- the country and the state -- and
   writes a row. The board reads the rows back, added up, on the Visits
   screen in the admin.

   What is deliberately not here:

     - no network address is stored. It goes into a hash with a salt that
       changes every day and is deleted the day after, so the hash counts
       a person for one day and then means nothing. See the migration.
     - no cookie, and nothing in the browser's storage.
     - nothing about what was clicked within a page. The page, and the
       four tools worth knowing about, and that is all.

   The message comes from the page's own script, which is why robots are
   mostly absent from the count: a crawler fetching HTML does not run it.
   The ones that do run it tend to say so in their name, and are dropped.

   hitRow is pure and tested. recordHit and visitFigures talk to D1. */

const KINDS = ['view', 'quote', 'request', 'jass', 'contact'];

const ROBOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|httpclient|monitor|scan/i;
const PHONE = /Mobi|Android|iPhone|iPad|iPod/;

/* The day as California sees it. The server's clock is UTC, and a visit
   at nine on a Tuesday evening in Ripon is Wednesday in UTC, which would
   put the club's own meeting night on the wrong day of the chart. */
export function todayInCalifornia(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

/* Where a visitor came from, as a name worth reading on a list: the host
   of the page they were on, with the prefixes the big sites put on
   their links taken off, so l.facebook.com and m.facebook.com are the one
   Facebook. A page on this site is '(site)'. No referrer at all is '', which
   is a typed address, a bookmark, or an app that does not say. */
export function refHost(referrer, ownHost) {
  const raw = String(referrer || '').trim();
  if (!raw) return '';
  let host = '';
  try { host = new URL(raw).hostname.toLowerCase(); } catch (e) { return ''; }
  if (!host) return '';
  if (host === String(ownHost || '').toLowerCase() || host.endsWith('.' + ownHost)) return '(site)';
  if (host === 'localhost' || /^127\./.test(host)) return '(site)';
  host = host.replace(/^(www|m|l|lm|mobile|amp|web|out)\./, '');
  if (/(^|\.)google\./.test(host)) host = 'google.com';
  if (/(^|\.)facebook\.com$/.test(host) || host === 'fb.com') host = 'facebook.com';
  if (/(^|\.)instagram\.com$/.test(host)) host = 'instagram.com';
  if (/(^|\.)bing\.com$/.test(host)) host = 'bing.com';
  if (/(^|\.)duckduckgo\.com$/.test(host)) host = 'duckduckgo.com';
  if (/(^|\.)yahoo\.com$/.test(host)) host = 'yahoo.com';
  return host.slice(0, 80);
}

/* The page as the site knows it: /calendar, not /calendar.html?t=1#top,
   and the home page is '/'. */
export function cleanPath(p) {
  let path = String(p || '').split('#')[0].split('?')[0].trim();
  if (!path.startsWith('/')) path = '/' + path;
  path = path.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  path = path.replace(/\/index\.html$/i, '/').replace(/\.html$/i, '');
  if (path.length > 200) path = path.slice(0, 200);
  return path || '/';
}

/**
 * Turns what the page sent and what the request carried into a row, or
 * null when it should not be counted at all.
 *
 *   body  { k, p, r }            kind, path, referrer -- from the page
 *   meta  { ua, host, country, region, day }
 */
export function hitRow(body, meta) {
  const b = body && typeof body === 'object' ? body : {};
  const m = meta || {};
  const ua = String(m.ua || '');
  if (!ua || ROBOT.test(ua)) return null;

  const kind = KINDS.includes(b.k) ? b.k : 'view';
  const path = cleanPath(b.p);
  /* an admin screen never sends one, but a copy of the site elsewhere
     might; the admin's own traffic is not the club's audience */
  if (path.startsWith('/admin')) return null;

  return {
    day: m.day || todayInCalifornia(),
    kind,
    path,
    ref: refHost(b.r, m.host),
    device: PHONE.test(ua) ? 'phone' : 'desktop',
    country: m.country ? String(m.country).slice(0, 2).toUpperCase() : null,
    region: m.region ? String(m.region).slice(0, 60) : null,
  };
}

/* ---- the day's salt, and the visitor hash ------------------------- */

function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function saltFor(env, day) {
  const have = await env.DB.prepare('SELECT salt FROM hit_salts WHERE day = ?').bind(day).first();
  if (have?.salt) return have.salt;
  /* two requests on a fresh day both get here; OR IGNORE means they then
     both read back whichever one landed */
  await env.DB.prepare('INSERT OR IGNORE INTO hit_salts (day, salt) VALUES (?, ?)')
    .bind(day, randomSalt()).run();
  const row = await env.DB.prepare('SELECT salt FROM hit_salts WHERE day = ?').bind(day).first();
  return row?.salt || day;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
}

/* Yesterday's salt is the one thing that could join a hash back to an
   address, so it does not survive the day after. Run now and then; every
   hit would be too often and never would be the point missed. */
async function forgetOldSalts(env, day) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 2);
  await env.DB.prepare('DELETE FROM hit_salts WHERE day < ?').bind(d.toISOString().slice(0, 10)).run();
}

/**
 * Writes one row. Called under ctx.waitUntil, after the 204 has gone back,
 * so a visitor never waits on the count and a failure here is a log line
 * and not a broken page.
 */
export async function recordHit(request, env, body, kind) {
  const url = new URL(request.url);
  const cf = request.cf || {};
  const day = todayInCalifornia();
  const row = hitRow({ ...body, k: kind || body?.k }, {
    ua: request.headers.get('User-Agent') || '',
    host: url.hostname,
    country: cf.country,
    region: cf.region,
    day,
  });
  if (!row) return;

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const salt = await saltFor(env, day);
  const visitor = await sha256(`${salt}|${ip}|${request.headers.get('User-Agent') || ''}`);

  await env.DB.prepare(
    `INSERT INTO hits (day, kind, path, ref, device, country, region, visitor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(row.day, row.kind, row.path, row.ref, row.device, row.country, row.region, visitor).run();

  if (Math.random() < 0.02) await forgetOldSalts(env, day);
}

/* ---- what the board sees ----------------------------------------- */

/* The periods the Visits screen offers. 'year' is the calendar year to
   date, 'all' is everything there is. */
export function periodStart(period, today = todayInCalifornia()) {
  if (period === 'all') return '0000-00-00';
  if (period === 'year') return today.slice(0, 4) + '-01-01';
  const days = { today: 1, week: 7, month: 30, quarter: 90 }[period] || 30;
  const d = new Date(today + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

const EVENT_PAGE = /^\/(event|almond-blossom|members-bbq|kids-swiss-camp|swiss-echoes|schwingen|schwingers-club)/;

export async function visitFigures(env, period) {
  const today = todayInCalifornia();
  const from = periodStart(period, today);
  const byMonth = period === 'all' || period === 'year';
  const dayKey = byMonth ? "substr(day, 1, 7)" : 'day';

  const q = (sql, ...args) => env.DB.prepare(sql).bind(...args);
  const [totals, days, pages, refs, devices, countries, regions, tools, firstDay] =
    await env.DB.batch([
      q(`SELECT COUNT(*) AS views, COUNT(DISTINCT day || visitor) AS visitors
           FROM hits WHERE kind = 'view' AND day >= ?`, from),
      q(`SELECT ${dayKey} AS d, COUNT(*) AS views, COUNT(DISTINCT day || visitor) AS visitors
           FROM hits WHERE kind = 'view' AND day >= ? GROUP BY d ORDER BY d`, from),
      q(`SELECT path, COUNT(*) AS views FROM hits WHERE kind = 'view' AND day >= ?
           GROUP BY path ORDER BY views DESC LIMIT 40`, from),
      q(`SELECT ref, COUNT(*) AS views FROM hits WHERE kind = 'view' AND day >= ?
           GROUP BY ref ORDER BY views DESC LIMIT 20`, from),
      q(`SELECT device, COUNT(*) AS views FROM hits WHERE kind = 'view' AND day >= ?
           GROUP BY device`, from),
      q(`SELECT country, COUNT(*) AS views FROM hits WHERE kind = 'view' AND day >= ?
           AND country IS NOT NULL GROUP BY country ORDER BY views DESC LIMIT 12`, from),
      q(`SELECT region, COUNT(*) AS views FROM hits WHERE kind = 'view' AND day >= ?
           AND country = 'US' AND region IS NOT NULL GROUP BY region ORDER BY views DESC LIMIT 12`, from),
      q(`SELECT kind, COUNT(*) AS n FROM hits WHERE kind IN ('quote', 'request', 'jass', 'contact') AND day >= ?
           GROUP BY kind`, from),
      q(`SELECT MIN(day) AS first FROM hits`),
    ]);

  const rows = (r) => r.results || [];
  const toolCount = {};
  for (const t of rows(tools)) toolCount[t.kind] = t.n;

  const allPages = rows(pages);
  return {
    period,
    from,
    today,
    byMonth,
    since: rows(firstDay)[0]?.first || null,
    totals: rows(totals)[0] || { views: 0, visitors: 0 },
    days: rows(days),
    pages: allPages.slice(0, 15),
    events: allPages.filter((p) => EVENT_PAGE.test(p.path)).slice(0, 12),
    refs: rows(refs),
    devices: rows(devices),
    countries: rows(countries),
    regions: rows(regions),
    tools: { quote: toolCount.quote || 0, request: toolCount.request || 0, jass: toolCount.jass || 0, contact: toolCount.contact || 0 },
  };
}
