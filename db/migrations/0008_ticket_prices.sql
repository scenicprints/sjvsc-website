-- More than one price for the same event.
--
-- A club event rarely has one price. Oktoberfest is one thing for an
-- adult and another for a child; a Jass party is one thing for a member
-- and another for everybody else. Until now the event held a single
-- `tickprice` string, so the only way to say that was to write it all
-- into one line and hope it read.
--
-- `tickprices` is a list, the same shape the details and the ticket
-- sellers already use: one entry per price, each with who it is for and
-- what it costs. Who it is for may be empty, which is the ordinary
-- one-price event and reads exactly as it always did.
--
-- `tickprice` stays. Every event written before today has its price
-- there and nothing in the list, and the pages read the old field when
-- the list is empty, so nothing needed rewriting to keep working.

ALTER TABLE events ADD COLUMN tickprices TEXT;
