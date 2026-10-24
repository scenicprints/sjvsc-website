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
      from: '2026-09-20', until: '2026-11-16',
      details: [
        { label: 'Where', values: ['110 N. Manley Road, Ripon'] },
        { label: 'Admission', values: ['$15, which covers the Jass and the lunch'] },
        { label: 'Beginners', values: ['A learning table at noon'] }
      ] },
    { id: 'childrens-christmas', title: "Children's Christmas Party",
      note: "For members' children and grandchildren.",
      date: '2026-12-05', time: '', link: 'event-childrens-christmas.html',
      from: '2026-10-10', until: '2026-12-06' },
    { id: 'agm', title: 'Annual General Meeting',
      note: 'Officers are elected. All members may attend.',
      date: '2026-12-10', time: '7pm', link: 'event-agm.html',
      from: '2026-10-15', until: '2026-12-11',
      details: [
        { label: 'Where', values: ['110 N. Manley Road, Ripon'] },
        { label: 'Who may attend', values: ['All members'] }
      ] },
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

  /* The hall is tied up the day before an event, the day of it, and the day
     after: setting up, the event, and clearing away. This reads the event's
     own day, not its advertising window, so an event that has stopped showing
     on the site still holds its dates until it has passed. */
  function blocks(date) {
    var want = date instanceof Date ? date : at(date);
    var list = all();
    for (var i = 0; i < list.length; i++) {
      var gap = Math.round((at(list[i].date) - want) / 86400000);
      if (gap >= -1 && gap <= 1) return list[i];
    }
    return null;
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

  /* An event can be tied to one of the standing pages. That page carries it
     while it is being advertised, and carries every tied event at once, so a
     page with three in their window shows three. */
  function onPage(id) {
    return showing().filter(function (e) { return e.page === id; });
  }

  function box(e) {
    var when = fullDate(e.date) + (e.time ? ', ' + e.time : '');
    var wrap = document.createElement('article');
    wrap.className = 'ebox';

    var head = document.createElement('div');
    head.className = 'ebox-head';
    var h = document.createElement('h3');
    h.textContent = e.title;
    var w = document.createElement('p');
    w.className = 'ebox-when';
    w.textContent = when;
    head.appendChild(h);
    head.appendChild(w);
    wrap.appendChild(head);

    if (e.note) {
      var n = document.createElement('p');
      n.className = 'ebox-note';
      n.textContent = e.note;
      wrap.appendChild(n);
    }

    var details = (e.details || []).filter(function (d) {
      return d.label && (d.values || []).length;
    });
    if (details.length) {
      var dl = document.createElement('dl');
      dl.className = 'ebox-rows';
      details.forEach(function (d) {
        var dt = document.createElement('dt');
        dt.textContent = d.label;
        dl.appendChild(dt);
        var dd = document.createElement('dd');
        d.values.forEach(function (v, i) {
          if (i) dd.appendChild(document.createElement('br'));
          dd.appendChild(document.createTextNode(v));
        });
        dl.appendChild(dd);
      });
      wrap.appendChild(dl);
    }

    return wrap;
  }

  /* Pages carry an empty container and say which tie they are. Nothing is
     drawn when nothing is on, so the page reads as it did before. */
  function renderPages() {
    [].forEach.call(document.querySelectorAll('[data-eventpage]'), function (el) {
      var list = onPage(el.getAttribute('data-eventpage'));
      el.innerHTML = '';
      if (!list.length) return;
      list.forEach(function (e) { el.appendChild(box(e)); });
      el.hidden = false;
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderPages);
    } else renderPages();
  }

  return { all: all, save: save, showing: showing, blocks: blocks, onPage: onPage,
           renderPages: renderPages, render: render, at: at,
           today: today, pretty: pretty, fullDate: fullDate, longDate: longDate,
           MONTH: MONTH, KEY: KEY };
})();
