-- Who looks at the website, counted without following anybody.
--
-- One row per thing that happened: a page viewed, a quote worked out, a
-- request sent, a hand of Jass dealt. The row says what and when, and
-- roughly where from, and that is all. There is no network address in it
-- and no cookie behind it.
--
-- `visitor` is how two views on the same day are known to be one person.
-- It is a hash of the day's salt, the network address and the browser,
-- and the salt is thrown away the day after, so the hash cannot be turned
-- back into an address even by somebody holding the database. On a new
-- day the same person is a new visitor. That is on purpose: the club wants
-- to know how many came, not who.
--
-- A few hundred rows a day for a site this size. The index is what the
-- Visits screen reads by: a period, then what kind of thing.

CREATE TABLE hits (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  at       TEXT NOT NULL DEFAULT (datetime('now')),
  day      TEXT NOT NULL,                     -- YYYY-MM-DD, California time
  kind     TEXT NOT NULL DEFAULT 'view',      -- view | quote | request | jass
  path     TEXT NOT NULL,                     -- /calendar, never a query string
  ref      TEXT NOT NULL DEFAULT '',          -- facebook.com; '' is typed or bookmarked;
                                              -- '(site)' is from another page here
  device   TEXT NOT NULL DEFAULT '',          -- phone | desktop
  country  TEXT,                              -- US
  region   TEXT,                              -- California
  visitor  TEXT                               -- the day's hash, see above
);

CREATE INDEX hits_day_kind ON hits (day, kind);

-- One salt a day, made the first time anybody visits, deleted two days on.
CREATE TABLE hit_salts (
  day   TEXT PRIMARY KEY,
  salt  TEXT NOT NULL
);
