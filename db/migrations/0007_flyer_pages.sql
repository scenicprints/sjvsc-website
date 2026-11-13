-- The flyer's pages, as pictures.
--
-- Embedding the PDF put the browser's own viewer in the middle of the
-- page: grey chrome, a toolbar, its own scrollbar, and on a phone a
-- scrolling box inside a scrolling page. It looked like somebody else's
-- software wedged into the site, because it was.
--
-- So every page is rendered to a picture when the flyer is uploaded, and
-- the flyer page shows those: no viewer, no toolbar, nothing to scroll
-- but the page itself. The PDF is still kept, and still offered for
-- download, because that is the thing worth having on a printer.
--
-- A JSON array of sources, in order, because they are read and written
-- whole and never queried across.

ALTER TABLE flyer ADD COLUMN pages TEXT NOT NULL DEFAULT '[]';
