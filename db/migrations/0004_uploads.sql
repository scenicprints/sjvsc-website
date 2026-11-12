-- Attachments are files too.
--
-- The table arrived holding photographs for the galleries, and was named
-- for them. But an attachment on an event is a flyer, the minutes, or a
-- form to fill in -- the screen has said so all along, and offered a box
-- to type a link into because there was nowhere to put a file. There is
-- now, and it is this table, so the name no longer fits.
--
-- Nothing is stored yet, so this costs nothing to do.
--
-- `name` is what the file was called when it was chosen, which an
-- attachment shows as its link text and a photograph never needs.

ALTER TABLE pictures RENAME TO files;
ALTER TABLE files ADD COLUMN name TEXT;

DROP INDEX IF EXISTS pictures_by_slug;
CREATE INDEX files_by_slug ON files (slug);
