/* One list of events, read by the public pages and written by the admin.

   Each event carries the day it happens and the window it is advertised in.
   A page shows an event only while today sits inside that window, so an
   event takes itself off the site when its window closes — nobody has to
   remember to remove it.

   In this demo the list lives in the browser. The real version keeps it in
   the club's account; nothing else on these pages would change. */

window.SJVSC = (function () {
  var KEY = 'sjvsc.events.v1';

  var SEED = [
    { id: 'club-meeting-nov', title: 'Club meeting',
      note: 'Monthly meeting of the membership.',
      date: '2026-11-11', time: '7pm', link: 'membership.html',
      from: '2026-10-01', until: '2026-11-12' },
    { id: 'jass-fall', title: 'Fall Jass Party',
      note: 'The Swiss card game. Sunday afternoon at the hall.',
      date: '2026-11-15', time: '', link: 'event-jass.html',
      from: '2026-09-20', until: '2026-11-16' },
    { id: 'childrens-christmas', title: "Children's Christmas Party",
      note: "For members' children and grandchildren.",
      date: '2026-12-05', time: '', link: 'event-childrens-christmas.html',
      from: '2026-10-10', until: '2026-12-06' },
    { id: 'agm', title: 'Annual General Meeting',
      note: 'Officers are elected. All members may attend.',
      date: '2026-12-10', time: '7pm', link: 'event-agm.html',
      from: '2026-10-15', until: '2026-12-11' },
    { id: 'echoes-christmas', title: 'Swiss Echoes Christmas Party',
      note: 'Carols, supper and a dance.',
      date: '2026-12-12', time: '', link: 'event-echoes-christmas.html',
      from: '2026-10-17', until: '2026-12-13' }
  ];

  function at(s) { var p = (s || '').split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  function all() {
    var list;
    try {
      var raw = localStorage.getItem(KEY);
      list = raw ? JSON.parse(raw) : null;
    } catch (e) { list = null; }      // private window, blocked storage
    if (!list || !list.length) list = SEED.slice();
    return list.sort(function (a, b) { return at(a.date) - at(b.date); });
  }

  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }

  /* what a visitor should see right now: inside its advertising window */
  function showing() {
    var now = today();
    return all().filter(function (e) { return at(e.from) <= now && now <= at(e.until); });
  }

  /* Spelled out rather than left to the browser's formatter, which varies
     by engine — one of them puts a comma after the weekday. */
  var WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June',
               'July', 'August', 'September', 'October', 'November', 'December'];

  function pretty(s) {
    var d = at(s);
    return d.getDate() + ' ' + MONTH[d.getMonth()] + ' ' + d.getFullYear();
  }
  function fullDate(s) {
    var d = at(s);
    return WEEK[d.getDay()] + ' ' + pretty(s);
  }
  function longDate(e) {
    return fullDate(e.date) + (e.time ? ', ' + e.time : '');
  }

  /* draw the list into a container, in the same shape the pages already use */
  function render(el, limit) {
    if (!el) return;
    var list = showing();
    if (limit) list = list.slice(0, limit);
    if (!list.length) {
      el.innerHTML = '<p class="lead" style="margin:0">Nothing is on the calendar just now. '
        + 'Do look again, or <a href="contact.html">ask the club</a>.</p>';
      return;
    }
    el.innerHTML = list.map(function (e) {
      var d = at(e.date);
      var tag = e.link ? 'a' : 'span';
      var href = e.link ? ' href="' + e.link + '"' : '';
      return '<' + tag + ' class="evt"' + href + '>'
        + '<span class="dt"><b>' + ('0' + d.getDate()).slice(-2) + '</b><span>'
        + MONTH[d.getMonth()].slice(0, 3) + '</span></span>'
        + '<span><h3></h3><p></p><span class="meta"></span></span>'
        + '</' + tag + '>';
    }).join('');
    // text is set rather than interpolated, so a title with punctuation is safe
    [].forEach.call(el.children, function (row, i) {
      row.querySelector('h3').textContent = list[i].title;
      row.querySelector('p').textContent = list[i].note;
      row.querySelector('.meta').textContent = longDate(list[i]);
    });
  }

  return { all: all, save: save, showing: showing, render: render, at: at,
           today: today, pretty: pretty, fullDate: fullDate, longDate: longDate,
           MONTH: MONTH, KEY: KEY };
})();
