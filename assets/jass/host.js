/* Schieber Jass on the club's website.
 *
 * The game came out of the Parchis hub, where two phones share a board
 * through Firestore. Here there is one person and no network, so this
 * file is the whole of the hub the game ever needed: it holds the board
 * in a variable, hands it back when the game writes one, and keeps the
 * settings in this browser.
 *
 * The game asks for five things and nothing else -- deal, commit,
 * settings, setSettings and hubRows -- which is the whole reason it
 * lifted out cleanly. Nothing in games/jass was changed except one
 * import path.
 */

import jass from './view.js';
import { $ } from './ui.js';

var KEEP = 'sjvsc.jass';

/* Settings and the game in progress live in this browser and nowhere
   else. A board member's phone is not a server and nobody else is
   waiting on the board, so there is nothing to sync. */
function remember(key, fallback) {
  try {
    var raw = localStorage.getItem(KEEP + '.' + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}

function keep(key, value) {
  try { localStorage.setItem(KEEP + '.' + key, JSON.stringify(value)); }
  catch (e) { /* a private window, and the game still plays */ }
}

var settings = Object.assign(
  { people: 1, skill: 'hard', target: 1000 },
  remember('settings', {})
);

var board = null;
var screen = null;

/* Four chairs. You are red, and the other three are played for you --
   the game calls that one person playing. */
var table = {
  seats: {
    red:    { name: 'You' },
    blue:   { name: 'Partner' },
    green:  { name: 'Anna' },
    yellow: { name: 'Fritz' },
  },
};

function show() {
  if (screen && board) screen.update(board, { table: table, me: 'red' });
}

var api = {
  /* The game calls this for a fresh board, and for New game. */
  deal: function () {
    board = jass.deal(board);
    keep('board', board);
    show();
    return Promise.resolve(board);
  },

  /* Every move the game makes comes back through here. */
  commit: function (next) {
    board = next;
    keep('board', next);
    return Promise.resolve();
  },

  settings: function () { return settings; },

  setSettings: function (patch) {
    settings = Object.assign({}, settings, patch);
    keep('settings', settings);
    return Promise.resolve(settings);
  },

  /* The hub put its own rows at the top of the menu -- leaving the game,
     who is sitting where. None of that exists here, so the menu simply
     starts with the game's own rows. */
  hubRows: function () {},
};

/* mount() is handed the api itself, and reads .local and .uid off the
   same object. */
export function play() {
  var handle = Object.assign({ local: true, uid: 'local' }, api);
  screen = jass.mount(handle);

  var saved = remember('board', null);
  board = (saved && saved.board === jass.boardRev) ? saved : null;

  if (board) show();
  else api.deal();
}

export { api, jass };
