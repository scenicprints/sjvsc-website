-- What somebody asked the club to put on the calendar.
--
-- The request is emailed to the webmaster and that is the point of it.
-- This table is the safety net underneath: Resend can be down, a key can
-- expire, Gmail can decide the whole domain is spam, and none of that
-- should mean a member filled in a form, saw "thank you", and vanished.
--
-- So the row is written first and the email is sent after. `emailed` says
-- whether it went, and `email_error` says what Resend said when it did
-- not, which is the difference between "nobody asked" and "we never found
-- out they asked".
--
-- Flyers go where every other uploaded file goes, into `files`, under the
-- slug `request`. This table keeps their keys.

CREATE TABLE requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  at          TEXT NOT NULL DEFAULT (datetime('now')),

  who         TEXT,                   -- the name they gave
  contact     TEXT,                   -- a telephone number or an email

  title       TEXT NOT NULL,
  note        TEXT,                   -- their one line for the calendar
  description TEXT,
  event_date  TEXT,
  event_time  TEXT,
  schedule    TEXT,                   -- JSON, what happens through the day
  tickprice   TEXT,
  tickwhere   TEXT,
  tickto      TEXT,

  files       TEXT,                   -- JSON: [{ key, name, type, bytes }]

  emailed     INTEGER NOT NULL DEFAULT 0,
  email_error TEXT
);

CREATE INDEX requests_recent ON requests (at DESC, id DESC);
