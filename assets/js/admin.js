/* Admin home. The status line is derived rather than written down, so it
   cannot drift from what the website is actually showing.

   EVENTS stands in for the admin's own data. Each one carries the date it
   happens and the window it is advertised in — the two dates that keep the
   site from going stale. Publish windows here are placeholders. */

(function () {
  var EVENTS = [
    { title: 'Fall Jass Party',              date: '2026-11-15', from: '2026-09-20', until: '2026-11-16' },
    { title: "Children's Christmas Party",   date: '2026-12-05', from: '2026-10-10', until: '2026-12-06' },
    { title: 'Annual General Meeting',       date: '2026-12-10', from: '2026-10-15', until: '2026-12-11' },
    { title: 'Swiss Echoes Christmas Party', date: '2026-12-12', from: '2026-10-17', until: '2026-12-13' }
  ];

  var WARN_DAYS = 45;   // how little runway counts as running out
  var DAY = 86400000;

  function at(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  var LONG = { weekday: 'long', day: 'numeric', month: 'long' };
  function longDate(d) { return d.toLocaleDateString('en-GB', LONG); }

  var now = today();

  var day = document.getElementById('aday');
  if (day) day.textContent = longDate(now);

  var box = document.getElementById('astate');
  if (!box) return;
  var msg = document.getElementById('astate-msg');
  var act = document.getElementById('astate-act');

  var showing = EVENTS.filter(function (e) { return at(e.from) <= now && now <= at(e.until); });
  var ahead = showing.filter(function (e) { return at(e.date) >= now; })
                     .sort(function (a, b) { return at(a.date) - at(b.date); });

  if (!showing.length) {
    box.className = 'astate none';
    msg.textContent = 'Nothing is showing on the website right now.';
    act.textContent = 'Add an event';
    return;
  }

  // the furthest-out thing still advertised: when it goes, the site is bare
  var last = showing.map(function (e) { return at(e.until); })
                    .sort(function (a, b) { return b - a; })[0];

  if (Math.round((last - now) / DAY) <= WARN_DAYS) {
    box.className = 'astate warn';
    msg.textContent = 'After ' + longDate(last) + ' there will be nothing left to show.';
    act.textContent = 'Add an event';
  } else if (!ahead.length) {
    box.className = 'astate warn';
    msg.textContent = 'No event still has a date to come.';
    act.textContent = 'Add an event';
  } else {
    box.className = 'astate';
    msg.textContent = 'The next event is the ' + ahead[0].title
      + ' on ' + longDate(at(ahead[0].date)) + '.';
    act.textContent = 'View the website';
  }
})();
