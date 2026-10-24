/* The hall rental screen. The card itself lives in rates-data.js, which the
   rentals page and the quote engine read too, so what is shown here is what a
   renter is quoted.

   This screen reads data/rates.json and shows what is in it: kinds of day,
   things to rent, extras and rules, with the price grid drawn from the first
   two. It does not change the file. The file is changed by editing it in the
   repository and committing. */

(function () {
  var R = window.SJVSC_RATES;
  var card = R.card();           // replaced once the repository answers

  var dayrows = document.getElementById('dayrows');
  var pricegrid = document.getElementById('pricegrid');
  var extrarows = document.getElementById('extrarows');
  var rulerows = document.getElementById('rulerows');
  var daywarn = document.getElementById('daywarn');

  var DAYNAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  var WHEN = [
    ['choose',  'The renter ticks it'],
    ['always',  'Always on the bill'],
    ['alcohol', 'Added when alcohol is served']
  ];
  var DOES = [
    ['print',    'Only printed'],
    ['hours',    'Hours included'],
    ['hourly',   'Each hour after that'],
    ['discount', 'Members take off (per cent)']
  ];

  function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }

  /* a value, drawn as the box the field used to be */
  function value(v, cls) {
    var n = el('div', cls ? cls + ' val' : 'val');
    n.textContent = v === undefined || v === null ? '' : v;
    return n;
  }

  /* one of a fixed set: what it says, not the whole list */
  function named(options, v) {
    var hit = '';
    options.forEach(function (o) { if (o[0] === v) hit = o[1]; });
    return value(hit);
  }

  /* ---- kinds of day -------------------------------------------------- */

  function drawDays() {
    dayrows.innerHTML = '';
    card.days.forEach(function (d) {
      var row = el('div', 'rrow rday');
      row.appendChild(value(d.name, 'rname'));

      var ticks = el('span', 'rticks');
      DAYNAMES.forEach(function (label, n) {
        var wrap = el('label', 'rtick');
        var box = el('input');
        box.type = 'checkbox';
        box.disabled = true;
        box.checked = (d.covers || []).indexOf(n) > -1;
        box.setAttribute('aria-label', label);
        wrap.appendChild(box);
        wrap.appendChild(document.createTextNode(label));
        ticks.appendChild(wrap);
      });
      row.appendChild(ticks);

      dayrows.appendChild(row);
    });
    warnDays();
  }

  /* Every day of the week has to belong to one of these, or a quote for that
     day has no price to use. Worth saying out loud, because the quote engine
     refuses the day rather than guessing. */
  function warnDays() {
    var missing = R.uncovered(card);
    daywarn.hidden = !missing.length;
    daywarn.className = missing.length ? 'warn bad' : 'warn';
    if (missing.length) {
      daywarn.textContent = 'Nothing covers ' + missing.join(', ') +
        '. A quote for one of those days has no price to use, so the hall reads ' +
        'as unavailable. Give one of the kinds of day above those weekdays in ' +
        'data/rates.json.';
    }
  }

  /* ---- the price grid ------------------------------------------------ */

  function drawGrid() {
    pricegrid.innerHTML = '';
    pricegrid.style.setProperty('--cols', card.days.length);

    var head = el('div', 'rrow rgrid rhead');
    head.appendChild(el('span'));
    card.days.forEach(function (d) {
      var h = el('span', 'rcolname');
      h.textContent = d.name || 'Untitled';
      /* the days this column charges for, so the link to the list above is
         visible without scrolling back to it */
      var on = (d.covers || []).slice().sort(function (a, b) { return a - b; })
        .map(function (n) { return DAYNAMES[n]; });
      var sub = el('i', 'rcoldays');
      sub.textContent = on.length ? on.join(' ') : 'No days, so nothing uses this';
      if (!on.length) sub.className += ' rdead';
      h.appendChild(sub);
      head.appendChild(h);
    });
    pricegrid.appendChild(head);

    card.spaces.forEach(function (s) {
      var row = el('div', 'rrow rgrid');
      row.appendChild(value(s.name, 'rname'));
      card.days.forEach(function (d) {
        row.appendChild(value(
          s.prices[d.id] === undefined ? '' : R.money(s.prices[d.id]), 'rprice'));
      });
      pricegrid.appendChild(row);
    });
  }

  /* ---- extras and rules: the same row, different third column -------- */

  function drawExtras() {
    extrarows.innerHTML = '';
    card.extras.forEach(function (x) {
      var row = el('div', 'rrow rpair');
      row.appendChild(value(x.name, 'rname'));
      row.appendChild(value(R.money(x.price), 'rprice'));
      row.appendChild(named(WHEN, x.when || 'choose'));
      extrarows.appendChild(row);
    });
  }

  function drawRules() {
    rulerows.innerHTML = '';
    card.rules.forEach(function (r) {
      var row = el('div', 'rrow rpair');
      row.appendChild(value(r.name, 'rname'));
      row.appendChild(value(r.value, 'rprice'));
      row.appendChild(named(DOES, r.does || 'print'));
      rulerows.appendChild(row);
    });
  }

  function drawAll() { drawDays(); drawGrid(); drawExtras(); drawRules(); }

  R.load().then(function (c) {
    card = c;
    drawAll();
  });
}());
