-- The club's data, moved out of data/*.json and into D1.
--
-- The nested parts of an event — its details, attachments and ticket sellers —
-- stay as JSON in their own columns. They are read and written whole, never
-- queried across, and keeping them as JSON means the API hands the front end
-- the same shape data/events.json always did. Normalising them would buy
-- joins nobody needs and change every page that reads an event.
--
-- Three columns are named around SQL keywords: description (desc),
-- adv_from (from) and adv_until (until). worker/shape.js maps them back.

CREATE TABLE events (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  note          TEXT    NOT NULL DEFAULT '',
  description   TEXT    NOT NULL DEFAULT '',
  image         TEXT,
  link          TEXT,
  page          TEXT    NOT NULL DEFAULT '',
  event_date    TEXT    NOT NULL,              -- yyyy-mm-dd
  event_time    TEXT    NOT NULL DEFAULT '',

  -- the advertising window: the event shows on the site only inside it
  adv_from      TEXT,
  adv_until     TEXT,

  -- tickets. No price means no tickets.
  tickprice     TEXT    NOT NULL DEFAULT '',
  tickfrom      TEXT,
  tickto        TEXT,

  -- JSON arrays, read and written whole
  details       TEXT    NOT NULL DEFAULT '[]',
  attachments   TEXT    NOT NULL DEFAULT '[]',
  ticksellers   TEXT    NOT NULL DEFAULT '[]',

  -- 0 is an event on the calendar, 1 is one on the shelf the club runs again
  -- (what data/saved.json held). A shelf event carries no date that matters.
  shelf         INTEGER NOT NULL DEFAULT 0 CHECK (shelf IN (0, 1)),

  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_by    TEXT
);

CREATE INDEX events_by_date  ON events (shelf, event_date);
CREATE INDEX events_showing  ON events (shelf, adv_from, adv_until);

-- The rate card is one document, versioned rather than overwritten, so a quote
-- can always be re-read against the card that produced it. Exactly one row is
-- active at a time.
CREATE TABLE rate_cards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  data        TEXT    NOT NULL,                 -- the whole card as JSON
  active      INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  created_by  TEXT
);

CREATE UNIQUE INDEX one_active_rate_card ON rate_cards (active) WHERE active = 1;

-- The band of photographs at the foot of an event page, keyed by the page slug
-- the event names in `page`.
CREATE TABLE gallery (
  slug        TEXT PRIMARY KEY,
  data        TEXT NOT NULL DEFAULT '[]',       -- JSON array of images
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by  TEXT
);
