-- What somebody wrote to the club on the contact page.
--
-- Built the same way as `requests`, for the same reason: the message is
-- emailed, and this table is the net underneath. The row is written first
-- and the email is sent after, so a visitor who saw "thank you" cannot
-- vanish because Resend or Gmail had a bad afternoon. `emailed` says
-- whether it went and `email_error` says what was said when it did not.
--
-- A hall quote arrives here too: the quote on the rentals page writes
-- itself into the message box, so `body` holds it as the visitor saw it.

CREATE TABLE messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  at          TEXT NOT NULL DEFAULT (datetime('now')),

  who         TEXT NOT NULL,          -- the name they gave
  contact     TEXT NOT NULL,          -- an email or a telephone number
  topic       TEXT NOT NULL,          -- one of the choices on the form
  body        TEXT NOT NULL,

  emailed     INTEGER NOT NULL DEFAULT 0,
  email_error TEXT
);

CREATE INDEX messages_recent ON messages (at DESC, id DESC);
