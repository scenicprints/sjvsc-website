-- Who changed what, and when.
--
-- Every write already recorded updated_by and updated_at on the row it
-- touched, which answers "who last touched this" and nothing else. A
-- committee wants the other question: what has been happening.
--
-- Each row keeps the whole thing before and the whole thing after, as
-- JSON, so the screen can work out which fields moved without a schema
-- for diffs -- and so a change can be read back long after the row it
-- describes has been deleted.
--
-- An event is a couple of kilobytes, so a thousand changes is a couple of
-- megabytes. If this ever needs pruning, delete by `at`.

CREATE TABLE changes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  at         TEXT NOT NULL DEFAULT (datetime('now')),

  who        TEXT NOT NULL,          -- the Clerk user id, which never changes
  who_name   TEXT,                   -- their name or email, as it was then

  action     TEXT NOT NULL,          -- added | changed | removed
  kind       TEXT NOT NULL,          -- event | saved event | rate card | pictures | picture
  thing      TEXT,                   -- the id or slug affected
  title      TEXT,                   -- what to call it on screen

  before     TEXT,                   -- JSON, or null where nothing was there
  after      TEXT                    -- JSON, or null where it was removed
);

CREATE INDEX changes_recent ON changes (at DESC, id DESC);
CREATE INDEX changes_by_thing ON changes (kind, thing);
