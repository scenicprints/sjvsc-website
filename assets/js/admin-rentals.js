/* The hall rental screen. The card itself lives in rates-data.js, which the
   rentals page and the quote engine read too, so a change here is the change
   a renter sees.

   Four lists, all the club's own: kinds of day, things to rent, extras and
   rules. The price grid is drawn from the first two, so adding a column or a
   row redraws it. Nothing is written until Save. */

(function () {
  var R = window.SJVSC_RATES;
  var card = R.card();           // replaced once the repository answers

  var dayrows = document.getElementById('dayrows');
  var pricegrid = document.getElementById('pricegrid');
  var extrarows = document.getElementById('extrarows');
  var rulerows = document.getElementById('rulerows');
  var daywarn = document.getElementById('daywarn');
  var saved = document.getElementById('saved');

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
  function uid(p) { return p + Math.random().toString(36).slice(2, 8); }

  function input(value, cls, placeholder, label) {
    var i = el('input', cls);
    i.type = 'text';
    i.autocomplete = 'off';
    i.value = value === undefined || value === null ? '' : value;
    if (placeholder) i.placeholder = placeholder;
    if (label) i.setAttribute('aria-label', label);
    return i;
  }

  function picker(options, value, label) {
    var s = el('select');
    s.setAttribute('aria-label', label);
    options.forEach(function (o) {
      var op = el('option');
      op.value = o[0];
      op.textContent = o[1];
      if (o[0] === value) op.selected = true;
      s.appendChild(op);
    });
    return s;
  }

  function removeBtn(label, fn) {
    var b = el('button', 'abtn small danger');
    b.type = 'button';
    b.textContent = 'Remove';
    b.setAttribute('aria-label', label);
    b.addEventListener('click', fn);
    return b;
  }

  /* ---- kinds of day -------------------------------------------------- */

  function drawDays() {
    dayrows.innerHTML = '';
    card.days.forEach(function (d) {
      var row = el('div', 'rrow rday');

      var name = input(d.name, 'rname', 'Saturday', 'What this kind of day is called');
      name.addEventListener('input', function () { d.name = name.value; drawGrid(); });
      row.appendChild(name);

      var ticks = el('span', 'rticks');
      DAYNAMES.forEach(function (label, n) {
        var wrap = el('label', 'rtick');
        var box = el('input');
        box.type = 'checkbox';
        box.checked = (d.covers || []).indexOf(n) > -1;
        box.setAttribute('aria-label', label);
        box.addEventListener('change', function () {
          d.covers = d.covers || [];
          var at = d.covers.indexOf(n);
          if (!box.checked) {
            if (at > -1) d.covers.splice(at, 1);
          } else {
            /* A weekday belongs to one kind of day. Without this, a row can
               hold prices nothing will ever charge, because an earlier row
               already claimed the day. */
            card.days.forEach(function (other) {
              if (other === d) return;
              var k = (other.covers || []).indexOf(n);
              if (k > -1) other.covers.splice(k, 1);
            });
            if (at < 0) d.covers.push(n);
          }
          drawDays();
          drawGrid();
        });
        wrap.appendChild(box);
        wrap.appendChild(document.createTextNode(label));
        ticks.appendChild(wrap);
      });
      row.appendChild(ticks);

      row.appendChild(removeBtn('Remove ' + (d.name || 'this kind of day'), function () {
        card.days = card.days.filter(function (x) { return x !== d; });
        card.spaces.forEach(function (s) { delete s.prices[d.id]; });
        if (!card.days.length) addDay();
        /* its weekdays would otherwise belong to nothing */
        var left = card.days[0];
        (d.covers || []).forEach(function (n) {
          if ((left.covers || []).indexOf(n) < 0) (left.covers = left.covers || []).push(n);
        });
        drawDays(); drawGrid();
      }));

      dayrows.appendChild(row);
    });
    warnDays();
  }

  function warnDays() {
    var missing = R.uncovered(card);
    daywarn.hidden = !missing.length;
    daywarn.className = missing.length ? 'warn bad' : 'warn';
    if (missing.length) {
      daywarn.textContent = 'Nothing covers ' + missing.join(', ') +
        '. Every day of the week has to belong to one of these, or a quote for '
        + 'that day has no price to use. This cannot be saved until it does.';
    }
    var save = document.querySelector('#rform button[type=submit]');
    if (save) save.disabled = !!missing.length;
  }

  function addDay() {
    card.days.push({ id: uid('d'), name: '', covers: [] });
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
    head.appendChild(el('span'));
    pricegrid.appendChild(head);

    card.spaces.forEach(function (s) {
      var row = el('div', 'rrow rgrid');

      var name = input(s.name, 'rname', 'Hall only', 'What can be rented');
      name.addEventListener('input', function () { s.name = name.value; });
      row.appendChild(name);

      card.days.forEach(function (d) {
        var p = input(s.prices[d.id] === undefined ? '' : R.money(s.prices[d.id]),
          'rprice', '$0', (s.name || 'This') + ' on a ' + (d.name || 'day'));
        p.addEventListener('input', function () {
          var n = parseFloat(p.value.replace(/[^0-9.\-]/g, ''));
          s.prices[d.id] = isNaN(n) ? 0 : n;
        });
        p.addEventListener('blur', function () {
          if (p.value.trim()) p.value = R.money(s.prices[d.id]);
        });
        row.appendChild(p);
      });

      row.appendChild(removeBtn('Remove ' + (s.name || 'this'), function () {
        card.spaces = card.spaces.filter(function (x) { return x !== s; });
        if (!card.spaces.length) addSpace();
        drawGrid();
      }));

      pricegrid.appendChild(row);
    });
  }

  function addSpace() {
    card.spaces.push({ id: uid('s'), name: '', prices: {} });
  }

  /* ---- extras and rules: the same row, different third column -------- */

  function drawExtras() {
    extrarows.innerHTML = '';
    card.extras.forEach(function (x) {
      var row = el('div', 'rrow rpair');

      var name = input(x.name, 'rname', 'Commercial kitchen', 'What the extra is');
      name.addEventListener('input', function () { x.name = name.value; });
      row.appendChild(name);

      var price = input(R.money(x.price), 'rprice', '$0', 'What it costs');
      price.addEventListener('input', function () {
        var n = parseFloat(price.value.replace(/[^0-9.\-]/g, ''));
        x.price = isNaN(n) ? 0 : n;
      });
      price.addEventListener('blur', function () {
        if (price.value.trim()) price.value = R.money(x.price);
      });
      row.appendChild(price);

      var when = picker(WHEN, x.when || 'choose', 'When it goes on the bill');
      when.addEventListener('change', function () { x.when = when.value; });
      row.appendChild(when);

      row.appendChild(removeBtn('Remove ' + (x.name || 'this extra'), function () {
        card.extras = card.extras.filter(function (y) { return y !== x; });
        if (!card.extras.length) addExtra();
        drawExtras();
      }));

      extrarows.appendChild(row);
    });
  }

  function addExtra() {
    card.extras.push({ id: uid('x'), name: '', price: 0, when: 'choose' });
  }

  function drawRules() {
    rulerows.innerHTML = '';
    card.rules.forEach(function (r) {
      var row = el('div', 'rrow rpair');

      var name = input(r.name, 'rname', 'Hours included', 'What the rule is called');
      name.addEventListener('input', function () { r.name = name.value; });
      row.appendChild(name);

      var value = input(r.value, 'rprice', '0', 'Its number');
      value.addEventListener('input', function () { r.value = value.value; });
      row.appendChild(value);

      var does = picker(DOES, r.does || 'print', 'What it does to a quote');
      does.addEventListener('change', function () { r.does = does.value; });
      row.appendChild(does);

      row.appendChild(removeBtn('Remove ' + (r.name || 'this rule'), function () {
        card.rules = card.rules.filter(function (y) { return y !== r; });
        if (!card.rules.length) addRule();
        drawRules();
      }));

      rulerows.appendChild(row);
    });
  }

  function addRule() {
    card.rules.push({ id: uid('r'), name: '', value: '', does: 'print' });
  }

  /* ---- buttons ------------------------------------------------------- */

  function drawAll() { drawDays(); drawGrid(); drawExtras(); drawRules(); }

  function fresh(add, draw, focusIn) {
    add();
    draw();
    var rows = focusIn.querySelectorAll('.rname');
    if (rows.length) rows[rows.length - 1].focus();
  }

  document.getElementById('adday').addEventListener('click', function () {
    addDay(); drawDays(); drawGrid();
    var n = dayrows.querySelectorAll('.rname');
    if (n.length) n[n.length - 1].focus();
  });
  document.getElementById('adspace').addEventListener('click', function () {
    addSpace(); drawGrid();
    var n = pricegrid.querySelectorAll('.rname');
    if (n.length) n[n.length - 1].focus();
  });
  document.getElementById('adextra').addEventListener('click', function () {
    fresh(addExtra, drawExtras, extrarows);
  });
  document.getElementById('adrule').addEventListener('click', function () {
    fresh(addRule, drawRules, rulerows);
  });

  document.getElementById('resetbtn').addEventListener('click', function () {
    card = R.reset();
    drawAll();
    saved.hidden = true;
  });

  document.getElementById('rform').addEventListener('submit', function (ev) {
    ev.preventDefault();
    saved.hidden = true;

    /* a weekday belonging to no kind of day would have no price to quote */
    var missing = R.uncovered(card);
    if (missing.length) {
      warnDays();
      daywarn.scrollIntoView({ block: 'center' });
      return;
    }

    /* a row nobody named is a row nobody meant to keep */
    card.days = card.days.filter(function (d) { return d.name.trim(); });
    card.spaces = card.spaces.filter(function (s) { return s.name.trim(); });
    card.extras = card.extras.filter(function (x) { return x.name.trim(); });
    card.rules = card.rules.filter(function (r) { return String(r.name).trim(); });
    if (!card.days.length) addDay();
    if (!card.spaces.length) addSpace();
    if (!card.extras.length) addExtra();
    if (!card.rules.length) addRule();

    var save = document.querySelector('#rform button[type=submit]');
    if (save) save.disabled = true;
    R.save(card, 'Hall rental rates').then(function () {
      if (save) save.disabled = false;
      document.getElementById('e-save').hidden = true;
      saved.hidden = false;
      drawAll();
      saved.scrollIntoView({ block: 'center' });
    }, function (err) {
      if (save) save.disabled = false;
      var e = document.getElementById('e-save');
      e.textContent = err.message;
      e.hidden = false;
    });
  });

  R.load().then(function (c) {
    card = c;
    drawAll();
  });
}());
