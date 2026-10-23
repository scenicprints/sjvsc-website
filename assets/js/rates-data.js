/* The hall rental rate card, read by the rentals page and the quote engine
   and written by the admin.

   Nothing here is fixed. The club names what it rents, names its own kinds
   of day, and writes its own extras and rules. The price grid is whatever
   those two lists make.

   A kind of day carries the weekdays it covers, because that is how a date
   on the quote form finds its column. An extra carries how it is applied,
   and a rule carries what it does, so a row the club invents can still be
   arithmetic rather than only print.

   In this demo the card lives in the browser. The real version keeps it in
   the club's account; nothing else on these pages would change. */

window.SJVSC_RATES = (function () {
  var KEY = 'sjvsc.rates.v1';

  /* Illustrative placeholders. The club replaces them in the admin. */
  var SEED = {
    days: [
      { id: 'sat',  name: 'Saturday',        covers: [6] },
      { id: 'frisun', name: 'Friday / Sunday', covers: [5, 0] },
      { id: 'week', name: 'Weekday',         covers: [1, 2, 3, 4] }
    ],
    spaces: [
      { id: 'hall',    name: 'Hall only',        prices: { sat: 1800, frisun: 1400, week: 900 } },
      { id: 'both',    name: 'Hall and grounds', prices: { sat: 2200, frisun: 1750, week: 1200 } },
      { id: 'grounds', name: 'Grounds only',     prices: { sat: 700,  frisun: 600,  week: 450 } }
    ],
    extras: [
      { id: 'kitchen',  name: 'Commercial kitchen',         price: 250, when: 'choose' },
      { id: 'linens',   name: 'Linens',                     price: 200, when: 'choose' },
      { id: 'av',       name: 'Sound system and projector', price: 150, when: 'choose' },
      { id: 'cleaning', name: 'End-of-night cleaning',      price: 300, when: 'choose' },
      { id: 'bar',      name: 'Licensed bartender',         price: 240, when: 'alcohol' }
    ],
    rules: [
      { id: 'hours',    name: 'Hours included',     value: 8,   does: 'hours' },
      { id: 'hourly',   name: 'Each hour after that', value: 150, does: 'hourly' },
      { id: 'discount', name: 'Members take off',   value: 25,  does: 'discount' },
      { id: 'booking',  name: 'Booking deposit (credited against the total)', value: 500, does: 'print' },
      { id: 'damage',   name: 'Damage deposit (refundable)', value: 500, does: 'print' }
    ]
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function card() {
    var c;
    try {
      var raw = localStorage.getItem(KEY);
      c = raw ? JSON.parse(raw) : null;
    } catch (e) { c = null; }          // private window, blocked storage
    if (!c || !c.spaces || !c.days) c = clone(SEED);
    return c;
  }

  function save(c) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); return true; }
    catch (e) { return false; }        // out of room
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    return clone(SEED);
  }

  /* Which column a date falls in. The first kind of day that covers the
     weekday wins; a weekday nobody covers falls to the first column, and
     the admin says so rather than letting a quote go out wrong. */
  function dayFor(c, date) {
    var n = date.getDay();
    for (var i = 0; i < c.days.length; i++) {
      if ((c.days[i].covers || []).indexOf(n) > -1) return c.days[i];
    }
    return c.days[0];
  }

  function uncovered(c) {
    var names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var out = [];
    for (var n = 0; n < 7; n++) {
      var hit = c.days.some(function (d) { return (d.covers || []).indexOf(n) > -1; });
      if (!hit) out.push(names[n]);
    }
    return out;
  }

  function rule(c, does) {
    for (var i = 0; i < c.rules.length; i++) if (c.rules[i].does === does) return c.rules[i];
    return null;
  }
  function ruleValue(c, does, fallback) {
    var r = rule(c, does);
    var n = r ? parseFloat(String(r.value).replace(/[^0-9.\-]/g, '')) : NaN;
    return isNaN(n) ? fallback : n;
  }

  function money(n) {
    return '$' + Number(n || 0).toLocaleString('en-US',
      { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  return {
    SEED: SEED, KEY: KEY,
    card: card, save: save, reset: reset, clone: clone,
    dayFor: dayFor, uncovered: uncovered,
    rule: rule, ruleValue: ruleValue, money: money
  };
}());
