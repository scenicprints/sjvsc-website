-- The flyer that stands all year.
--
-- One poster at a time, replaced each year, so this holds one row and
-- says so: the primary key may only ever be 1. A second flyer would be a
-- second row, and there is no second row.
--
-- The poster is not put on the home page. A short band goes there, made
-- from a crop of the poster's own artwork, and clicking it opens the
-- poster on a page of its own -- which is also an address the club can
-- paste into Facebook.
--
-- `happens` is the day the event is on. The band takes itself off the
-- home page the day after, the same way an event does, so July's flyer
-- is not still sitting there in September.

CREATE TABLE flyer (
  id          INTEGER PRIMARY KEY CHECK (id = 1),

  title       TEXT NOT NULL,            -- Schwingen in the Sierra
  happens     TEXT,                     -- yyyy-mm-dd
  place       TEXT,                     -- Truckee
  note        TEXT,                     -- a line under the name, if wanted

  src         TEXT NOT NULL,            -- the uploaded poster
  link        TEXT,                     -- registration, or the host's own page

  -- which part of the poster the band is cut from: top, middle or bottom
  crop        TEXT NOT NULL DEFAULT 'top'
              CHECK (crop IN ('top', 'middle', 'bottom')),

  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by  TEXT
);
