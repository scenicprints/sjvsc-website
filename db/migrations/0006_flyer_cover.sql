-- The flyer is a document, not only a poster.
--
-- It was built expecting one image, because the first one I was shown was
-- a single poster page. The club's flyer is the whole newsletter: nine
-- pages of PDF, replaced when the next one arrives.
--
-- So `src` may now be a PDF, and `cover` is the picture the home page
-- band is cut from. A PDF cannot be cropped by a browser, and asking the
-- board to install something to make a thumbnail is not a plan -- so the
-- cover is optional, and the band falls back to a typographic one with no
-- artwork when there is none.

ALTER TABLE flyer ADD COLUMN cover TEXT;
