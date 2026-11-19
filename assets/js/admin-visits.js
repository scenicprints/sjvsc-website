/* The Visits screen.

   Reads /api/visits for one period at a time and draws it: four figures,
   a chart of the days, and six short tables. The chart is bars made of
   divs, because a chart library is a hundred kilobytes to draw thirty
   rectangles, and the board reads this on a tablet.

   Nothing here is editable. The period buttons are the whole of the
   interface. */

(function () {
  var S = window.SJVSC_STORE;
  var period = 'month';

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function n(x) { return Number(x || 0).toLocaleString('en-US'); }

  /* the page's address, as a person would say it */
  var NAMES = {
    '/': 'Home page', '/calendar': 'Calendar', '/rentals': 'Hall rental',
    '/membership': 'Membership', '/contact': 'Contact', '/privacy': 'Privacy',
    '/request-an-event': 'Request an event', '/jass-table': 'The Jass table',
    '/flyer': 'The flyer', '/event': 'An event of its own'
  };
  function pageName(path) {
    if (NAMES[path]) return NAMES[path];
    var bare = path.replace(/^\//, '').replace(/^event-/, '');
    return bare.charAt(0).toUpperCase() + bare.slice(1).replace(/-/g, ' ');
  }

  var REF_NAMES = { '': 'Typed, bookmarked or an app', '(site)': 'Another page here' };

  /* "United States" rather than "US", where the browser knows the names */
  var names = null;
  try { names = window.Intl && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'region' }) : null; } catch (e) { names = null; }
  function countryName(code) {
    if (!code) return '';
    try { return (names && names.of(code)) || code; } catch (e) { return code; }
  }

  function table(id, rows, name, value, empty) {
    var t = el(id);
    if (!rows || !rows.length) {
      t.innerHTML = '<tr><td class="vnone" colspan="2">' + esc(empty || 'Nothing yet.') + '</td></tr>';
      return;
    }
    var top = Math.max.apply(null, rows.map(value)) || 1;
    t.innerHTML = rows.map(function (r) {
      var v = value(r);
      return '<tr><td><span class="vbar" style="width:' + Math.round(100 * v / top) + '%"></span>' +
        '<span class="vname">' + esc(name(r)) + '</span></td>' +
        '<td class="num">' + n(v) + '</td></tr>';
    }).join('');
  }

  function month(d) {
    var dt = new Date(d + (d.length === 7 ? '-01' : '') + 'T12:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  function dayLabel(d) {
    var dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }

  /* every day in the period is a bar, so a quiet day is a gap and not a
     missing bar that makes the week look shorter */
  function fillDays(days, from, today) {
    var have = {};
    days.forEach(function (d) { have[d.d] = d; });
    var out = [];
    var dt = new Date(from + 'T12:00:00Z');
    var end = new Date(today + 'T12:00:00Z');
    while (dt <= end && out.length < 400) {
      var key = dt.toISOString().slice(0, 10);
      out.push(have[key] || { d: key, views: 0, visitors: 0 });
      dt.setUTCDate(dt.getUTCDate() + 1);
    }
    return out;
  }

  function chart(data) {
    var box = el('vChart');
    var days = data.byMonth ? data.days : fillDays(data.days, data.from, data.today);
    el('vChartHead').textContent = data.byMonth ? 'Month by month' : 'Day by day';
    if (!days.length) {
      box.innerHTML = '<p class="vnone">Nothing yet.</p>';
      el('vChartNote').textContent = '';
      return;
    }
    var top = Math.max.apply(null, days.map(function (d) { return d.views; })) || 1;
    var every = Math.max(1, Math.ceil(days.length / 10));
    box.innerHTML = days.map(function (d, i) {
      var label = data.byMonth ? month(d.d) : dayLabel(d.d);
      var show = (i % every === 0) || i === days.length - 1;
      return '<div class="vcol" title="' + esc(label) + ': ' + n(d.views) + ' views, ' + n(d.visitors) + ' visitors">' +
        '<div class="vbarv" style="height:' + Math.max(d.views ? 2 : 0, Math.round(100 * d.views / top)) + '%">' +
        '<div class="vbarp" style="height:' + (d.views ? Math.round(100 * d.visitors / d.views) : 0) + '%"></div></div>' +
        '<span class="vlab' + (show ? '' : ' vquiet') + '">' + esc(label) + '</span></div>';
    }).join('');
    el('vChartNote').textContent = 'The full bar is page views; the darker part is visitors. ' +
      'Rest on a bar for its numbers.';
  }

  function draw(data) {
    el('vViews').textContent = n(data.totals.views);
    el('vVisitors').textContent = n(data.totals.visitors);
    var phone = 0, all = 0;
    data.devices.forEach(function (d) { all += d.views; if (d.device === 'phone') phone = d.views; });
    el('vPhone').textContent = all ? Math.round(100 * phone / all) + '%' : '–';
    el('vJass').textContent = n(data.tools.jass);

    chart(data);

    table('vPages', data.pages, function (r) { return pageName(r.path); }, function (r) { return r.views; });
    table('vEvents', data.events, function (r) { return pageName(r.path); }, function (r) { return r.views; },
      'No event page was opened.');
    table('vRefs', data.refs, function (r) { return REF_NAMES[r.ref] || r.ref; }, function (r) { return r.views; });
    table('vCountries', data.countries, function (r) { return countryName(r.country); }, function (r) { return r.views; },
      'Cloudflare did not say.');
    table('vRegions', data.regions, function (r) { return r.region; }, function (r) { return r.views; },
      'No visit from inside the US yet.');
    table('vTools', [
      { name: 'Hall rental quotes worked out', n: data.tools.quote },
      { name: 'Events requested', n: data.tools.request },
      { name: 'Messages sent from the contact page', n: data.tools.contact || 0 },
      { name: 'Hands of Jass dealt', n: data.tools.jass }
    ], function (r) { return r.name; }, function (r) { return r.n; });

    el('vSince').textContent = data.since
      ? 'Counting since ' + new Date(data.since + 'T12:00:00').toLocaleDateString('en-US',
          { day: 'numeric', month: 'long', year: 'numeric' }) + '. Days are California days.'
      : 'Nothing has been counted yet.';
  }

  /* This browser. Signing in marked it as the board's and site.js has
     stopped counting it; the board can count it after all, to try the
     counter, and that choice survives the next sign-in. */
  function mine() {
    var out = false;
    try { out = window.localStorage.getItem('sjvsc_board') === '1'; } catch (e) { out = false; }
    el('vMineText').textContent = out
      ? 'This browser is a board member’s and its visits are not counted.'
      : 'This browser is counted like anyone else’s.';
    el('vMineBtn').textContent = out ? 'Count it after all' : 'Leave it out';
    el('vMineBtn').onclick = function () {
      try { window.localStorage.setItem('sjvsc_board', out ? '0' : '1'); } catch (e) {}
      mine();
    };
  }
  mine();

  function load() {
    var token = window.SJVSC_TOKEN ? window.SJVSC_TOKEN() : Promise.resolve(null);
    token.then(function (t) {
      var headers = t ? { Authorization: 'Bearer ' + t } : {};
      return fetch(S.path('visits') + '?period=' + encodeURIComponent(period) + '&t=' + Date.now(),
        { credentials: 'same-origin', headers: headers });
    }).then(function (r) {
      if (r.status === 401 || r.status === 403) { gate(true); return null; }
      if (!r.ok) throw new Error('The count did not load (' + r.status + ').');
      return r.json();
    }).then(function (data) {
      if (!data) return;
      gate(false);
      draw(data);
    }).catch(function (err) {
      el('vgate').hidden = false;
      el('vgate').textContent = err.message || 'The count did not load.';
      el('vbody').hidden = true;
    });
  }

  function gate(shut) {
    el('vgate').hidden = !shut;
    el('vgate').textContent = 'Sign in to see the count.';
    el('vbody').hidden = shut;
  }

  [].forEach.call(document.querySelectorAll('.vperiod button'), function (b) {
    b.addEventListener('click', function () {
      period = b.getAttribute('data-period');
      [].forEach.call(document.querySelectorAll('.vperiod button'), function (o) {
        var on = o === b;
        o.classList.toggle('solid', on);
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      load();
    });
  });

  /* wait for the sign-in to settle, then ask; and ask again if it changes */
  var A = window.SJVSC_AUTH;
  if (A && A.onChange) A.onChange(function () { mine(); load(); });
  else load();
}());
