-- Photographs the board uploads from the admin.
--
-- In the database rather than in object storage. R2 is the tool built for
-- this and wants a subscription the club is not taking; D1 is already here
-- and a club gallery is nowhere near its limits -- a hundred photographs
-- resized to a few hundred kilobytes is about thirty megabytes against an
-- allowance of five gigabytes.
--
-- The bytes are a BLOB rather than base64 text, which keeps a third of the
-- size off every row.
--
-- A key is never reused, so the URL of a picture can be cached forever.

CREATE TABLE pictures (
  key         TEXT PRIMARY KEY,
  bytes       BLOB NOT NULL,
  type        TEXT NOT NULL,            -- image/jpeg, image/png, image/webp
  slug        TEXT,                     -- the gallery it was uploaded for
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  created_by  TEXT
);

CREATE INDEX pictures_by_slug ON pictures (slug);
