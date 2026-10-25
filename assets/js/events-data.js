/* One list of events, read by every page that shows one.

   Each event carries the day it happens and the window it is advertised in.
   A page shows an event only while today sits inside that window, so an
   event takes itself off the site when its window closes, and nobody has to
   remember to remove it.

   The list is data/events.json, and data/saved.json beside it holds the ones
   the club runs again. Both are edited in the repository. */

window.SJVSC = (function () {

  var SEED = [
    { id: 'club-meeting-nov', title: 'Club meeting',
      note: 'Monthly meeting of the membership.',
      date: '2026-11-11', time: '7pm', link: 'membership.html',
      from: '2026-10-01', until: '2026-11-12' },
    { id: 'jass-fall', title: 'Fall Jass Party',
      note: 'The Swiss card game. Sunday afternoon at the hall.',
      date: '2026-11-15', time: '', link: 'event-jass.html', page: 'jass',
      from: '2026-09-20', until: '2026-11-16',
      details: [
        { label: 'Where', values: ['110 N. Manley Road, Ripon'] },
        { label: 'Admission', values: ['$15, which covers the Jass and the lunch'] },
        { label: 'Beginners', values: ['A learning table at noon'] }
      ] },
    { id: 'childrens-christmas', title: "Children's Christmas Party",
      note: "For members' children and grandchildren.",
      date: '2026-12-05', time: '',
      from: '2026-10-10', until: '2026-12-06' },
    { id: 'agm', title: 'Annual General Meeting',
      note: 'Officers are elected. All members may attend.',
      date: '2026-12-10', time: '7pm',
      from: '2026-10-15', until: '2026-12-11',
      details: [
        { label: 'Where', values: ['110 N. Manley Road, Ripon'] },
        { label: 'Who may attend', values: ['All members'] }
      ] },
    { id: 'echoes-christmas', title: 'Swiss Echoes Christmas Party',
      note: 'Carols, supper and a dance.',
      date: '2026-12-12', time: '', page: 'echoes',
      from: '2026-10-17', until: '2026-12-13' }
  ];

  function at(s) { var p = (s || '').split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  /* the list as it stands in this page, loaded from data/events.json */
  var LIST = SEED.slice();

  function all() {
    return LIST.slice().sort(function (a, b) { return at(a.date) - at(b.date); });
  }

  function load() {
    return window.SJVSC_STORE.read('events', SEED).then(function (list) {
      LIST = (list && list.length !== undefined) ? list : SEED.slice();
      return all();
    });
  }


  /* The shelf: events the club runs again, kept apart from the calendar so
     nothing on it reaches a reader until it is put on a date. */
  var SHELVED = [];
  function savedAll() { return SHELVED.slice(); }
  function savedLoad() {
    return window.SJVSC_STORE.read('saved', []).then(function (list) {
      SHELVED = list || [];
      return savedAll();
    });
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
     by engine, and one of them puts a comma after the weekday. */
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
      var to = href(e);
      var tag = to ? 'a' : 'span';
      var link = to ? ' href="' + to + '"' : '';
      return '<' + tag + ' class="evt"' + link + '>'
        + '<span class="dt"><b>' + ('0' + d.getDate()).slice(-2) + '</b><span>'
        + MONTH[d.getMonth()].slice(0, 3) + '</span></span>'
        + '<span><h3></h3><p></p><span class="meta"></span><b class="evt-price"></b></span>'
        + '</' + tag + '>';
    }).join('');
    // text is set rather than interpolated, so a title with punctuation is safe
    [].forEach.call(el.children, function (row, i) {
      row.querySelector('h3').textContent = list[i].title;
      row.querySelector('p').textContent = list[i].note;
      row.querySelector('.meta').textContent = longDate(list[i]);
      /* a price belongs on the listing too, while it is on sale */
      var t = tickets(list[i]);
      var tag = row.querySelector('.evt-price');
      if (t && t.price) tag.textContent = 'Tickets ' + t.price;
      else tag.remove();
    });
  }

  /* Where a tie leads. An event tied to a page links to that page, which is
     the only thing the admin ever says about where an event goes. `link` is
     left over from the seed, for the few events whose page is not one of the
     eight, and the tie beats it. */
  var TIED = {
    schwingers: 'schwingers-club.html',
    echoes: 'swiss-echoes.html',
    camp: 'kids-swiss-camp.html',
    schwingen: 'schwingen.html',
    schwingfests: 'event-schwingfest.html',
    bbq: 'members-bbq.html',
    oktoberfest: 'event-oktoberfest.html',
    jass: 'event-jass.html',
    almond: 'almond-blossom.html'
  };
  /* Where an event opens. Either it belongs to something the club already
     has a page for, and that page carries it, or it has a page of its own
     and says so in link. One or the other, never neither. */
  function href(e) { return TIED[e.page] || e.link || ''; }

  /* An event can be tied to one of the standing pages. That page carries it
     while it is being advertised, and carries every tied event at once, so a
     page with three in their window shows three. */
  function onPage(id) {
    return showing().filter(function (e) { return e.page === id; });
  }

  /* A price typed as a bare number is a number of dollars. Anything with a
     currency mark already on it, and anything that is not a plain number at
     all, is left exactly as it was typed, so "Free" and "$5 members, $8
     otherwise" both survive. */
  function priceText(v) {
    var raw = (v || '').trim();
    if (!raw) return '';
    var m = raw.match(/^([0-9]+)(?:\.([0-9]{1,2}))?$/);
    if (m) return '$' + m[1] + (m[2] ? '.' + (m[2].length === 1 ? m[2] + '0' : m[2]) : '');
    return raw;
  }

  /* A way to reach somebody is either an email address or a telephone number.
     Ten digits, or eleven starting with a 1, are written the way the rest of
     the site writes them. Anything else is left exactly as it was typed. */
  function contactText(v) {
    var raw = (v || '').trim();
    if (!raw || raw.indexOf('@') > -1) return raw;
    var d = raw.replace(/[^0-9]/g, '');
    if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
    if (d.length !== 10) return raw;
    return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  }

  /* Where a ticket can be had. More than one way at once is normal: upon
     entry and from two people is a perfectly ordinary answer. Events saved
     before that was possible carried a single way, and still read. */
  function sellers(e) {
    var list = e.ticksellers;
    if (!list && e.ticksource) {
      list = [e.ticksource === 'person'
        ? { kind: 'person', who: e.tickwho, contact: e.tickcontact }
        : { kind: 'entry' }];
    }
    return (list || []).map(function (x) {
      if (x.kind !== 'person') return 'Upon entry';
      var who = (x.who || '').trim();
      var how = contactText(x.contact);
      return who && how ? who + ', ' + how : (who || how);
    }).filter(function (t) { return t; });
  }

  /* Tickets show only while they are on sale. No dates means they show for as
     long as the event itself is advertised. Nothing shows when there is neither
     a price nor somewhere to get one. */
  function tickets(e) {
    var price = priceText(e.tickprice);
    var where = sellers(e);
    if (!price && !where.length) return null;

    var now = today();
    if (e.tickfrom && now < at(e.tickfrom)) return null;
    if (e.tickto && now > at(e.tickto)) return null;

    return { price: price, where: where };
  }

  /* The details box a tied page carries. It is the page's own Details card,
     in the page's own card and row styling, so it reads as part of the page
     rather than as something bolted on top of it. */
  function box(e) {
    var card = document.createElement('div');
    card.className = 'card ecard';

    var head = document.createElement('div');
    head.className = 'ecard-head';
    var h = document.createElement('h3');
    h.textContent = e.title;
    head.appendChild(h);
    var w = document.createElement('p');
    w.className = 'ecard-when';
    w.textContent = fullDate(e.date) + (e.time ? ', ' + e.time : '');
    head.appendChild(w);
    card.appendChild(head);

    /* A photograph of the event, where the club has put one on it. It sits
       beside everything else rather than above it, because these are mostly
       upright photographs and one across the full card would push the day
       and the details off the screen. */
    var holder = card;
    if (e.image) {
      card.className = 'card ecard ecard-shot';
      holder = document.createElement('div');
      holder.className = 'ecard-said';
      var fig = document.createElement('div');
      fig.className = 'ecard-pic';
      var pic = document.createElement('img');
      pic.src = e.image;
      pic.alt = e.title;
      pic.loading = 'lazy';
      fig.appendChild(pic);
      card.appendChild(fig);
      card.appendChild(holder);
    }

    /* the description and the headings share the width rather than leaving
       half the card empty; with only one of them it takes the lot */
    var body = document.createElement('div');
    body.className = 'ecard-body';
    holder.appendChild(body);

    if (e.desc) {
      var about = document.createElement('p');
      about.className = 'ecard-desc';
      about.textContent = e.desc;
      body.appendChild(about);
    }

    var details = (e.details || []).filter(function (d) {
      return d.label && (d.values || []).length;
    });
    var t = tickets(e);
    var hasFiles = (e.attachments || []).some(function (a) {
      return a.name && (a.data || a.link);
    });
    if (!details.length && !t && !hasFiles) return card;   // the description may be all there is
    /* beside a photograph there is no room to split this again */
    if (e.desc && !e.image) body.className = 'ecard-body both';

    var ul = document.createElement('ul');
    ul.className = 'erows';          // its own, so the pages keeping a .rows card are untouched

    function row(label, lines) {
      var li = document.createElement('li');
      var b = document.createElement('b');
      b.textContent = label;
      var span = document.createElement('span');
      lines.forEach(function (v, i) {
        if (i) span.appendChild(document.createElement('br'));
        span.appendChild(document.createTextNode(v));
      });
      li.appendChild(b);
      li.appendChild(span);
      ul.appendChild(li);
    }

    details.forEach(function (d) { row(d.label, d.values); });
    if (t) {
      if (t.price) row('Tickets', [t.price]);
      if (t.where.length) row(t.price ? 'Where from' : 'Tickets', t.where);
    }

    /* attachments: a file kept with the event, or an address somewhere else.
       Either way it is a link with the name the club gave it. */
    var files = (e.attachments || []).filter(function (a) {
      return a.name && (a.data || a.link);
    });
    if (files.length) {
      var li = document.createElement('li');
      var b = document.createElement('b');
      b.textContent = files.length === 1 ? 'Attachment' : 'Attachments';
      var span = document.createElement('span');
      files.forEach(function (a, i) {
        if (i) span.appendChild(document.createElement('br'));
        var link = document.createElement('a');
        link.className = 'ecard-file';
        link.textContent = a.name;
        if (a.data) { link.href = a.data; link.download = a.name; }
        else {
          link.href = a.link;
          link.target = '_blank';
          link.rel = 'noopener';
        }
        span.appendChild(link);
      });
      li.appendChild(b);
      li.appendChild(span);
      ul.appendChild(li);
    }

    body.appendChild(ul);
    return card;
  }

  /* A tied page keeps a hand-written Details card inside its slot. An event
     being advertised replaces it, and more than one replaces it with one card
     each. With nothing on, the hand-written card is what stays. */
  function renderPages() {
    [].forEach.call(document.querySelectorAll('[data-eventslot]'), function (el) {
      var list = onPage(el.getAttribute('data-eventslot'));
      if (!list.length) return;
      el.innerHTML = '';
      list.forEach(function (e) { el.appendChild(box(e)); });
    });

    /* An event with a page of its own. The page does not have to name the
       event: the event already names the page, in link, so the page shows
       whichever event points at it and needs no editing when next year's
       comes round. */
    [].forEach.call(document.querySelectorAll('[data-eventpage]'), function (el) {
      var here = (location.pathname.split('/').pop() || 'index.html');
      var list = showing().filter(function (e) { return e.link === here; });
      if (!list.length) return;
      el.innerHTML = '';
      list.forEach(function (e) { el.appendChild(box(e)); });
    });
  }

  /* ---- the year -------------------------------------------------------

     Twelve months at once rather than one month of days: the club's year is
     a dozen events, and a grid of empty squares says less about it than a
     list of what is on. Everything planned is here, advertised or not. An
     event being advertised opens wherever it opens; one that is not says so
     when pressed, because there is nothing to read yet. */

  var yrAt = null;

  function calSay(e) {
    var pop = document.getElementById('mcalpop');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'mcalpop';
      pop.className = 'mcalpop';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-modal', 'true');
      pop.innerHTML =
        '<div class="mcalpop-box">' +
        '<h3></h3><p class="mcalpop-when"></p>' +
        '<p class="mcalpop-say">Details to come.</p>' +
        '<button class="btn btn-ink" type="button">Close</button></div>';
      document.body.appendChild(pop);
      pop.addEventListener('click', function (ev) {
        if (ev.target === pop || ev.target.tagName === 'BUTTON') calShut();
      });
      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && !pop.hidden) calShut();
      });
    }
    pop.querySelector('h3').textContent = e.title;
    pop.querySelector('.mcalpop-when').textContent = fullDate(e.date) +
      (e.time ? ', ' + e.time : '');
    pop.hidden = false;
    document.documentElement.classList.add('mcalpop-open');
    pop.querySelector('button').focus();
  }

  function calShut() {
    var pop = document.getElementById('mcalpop');
    if (!pop) return;
    pop.hidden = true;
    document.documentElement.classList.remove('mcalpop-open');
    if (calCameFrom && calCameFrom.focus) calCameFrom.focus();
  }

  var calCameFrom = null;

  function drawYear() {
    var grid = document.getElementById('yrgrid');
    if (!grid) return;
    document.getElementById('yrtitle').textContent = yrAt;

    var live = showing();
    var mine = all().filter(function (e) { return at(e.date).getFullYear() === yrAt; })
      .sort(function (a, b) { return at(a.date) - at(b.date); });

    grid.innerHTML = '';
    MONTH.forEach(function (name, m) {
      var on = mine.filter(function (e) { return at(e.date).getMonth() === m; });
      var box = document.createElement('div');
      box.className = 'mo' + (on.length ? '' : ' quiet');

      var h = document.createElement('h3');
      h.textContent = name;
      box.appendChild(h);

      if (!on.length) {          // nothing on, so the month says nothing
        grid.appendChild(box);
        return;
      }

      on.forEach(function (e) {
        var open = live.indexOf(e) > -1 && href(e);
        var row = document.createElement(open ? 'a' : 'button');
        row.className = 'ev';
        if (open) row.href = href(e);
        else row.type = 'button';

        var b = document.createElement('b');
        b.textContent = e.title;
        row.appendChild(b);

        var when = document.createElement('span');
        var d = at(e.date);
        when.textContent = WEEK[d.getDay()].slice(0, 3) + ' ' + d.getDate() +
          (open ? '' : '  ·  Details to come');
        row.appendChild(when);

        if (!open) {
          row.classList.add('ev-soon');
          row.addEventListener('click', function () {
            calCameFrom = row;
            calSay(e);
          });
        }
        box.appendChild(row);
      });

      grid.appendChild(box);
    });
  }

  function yrStep(by) {
    yrAt += by;
    drawYear();
  }

  function startCal() {
    if (!document.getElementById('yrgrid')) return;
    yrAt = today().getFullYear();
    document.getElementById('yrprev').addEventListener('click', function () { yrStep(-1); });
    document.getElementById('yrnext').addEventListener('click', function () { yrStep(1); });
    drawYear();
  }

  /* the public pages wait for the file, then draw themselves from it */
  if (typeof document !== 'undefined' && !window.SJVSC_ADMIN) {
    load().then(function () {
      renderPages();
      render(document.getElementById('whatson'));
      render(document.getElementById('upcoming'));
      startCal();
    });
  }

  return { all: all, load: load, savedAll: savedAll, savedLoad: savedLoad,
           showing: showing,
           href: href, TIED: TIED, blocks: blocks, onPage: onPage,
           renderPages: renderPages, render: render, at: at,
           tickets: tickets, contactText: contactText, priceText: priceText,
           today: today, pretty: pretty, fullDate: fullDate, longDate: longDate,
           MONTH: MONTH };
})();
