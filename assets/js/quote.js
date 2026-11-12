/* Hall rental: what it costs on the page, and the quote under the form.

   None of the arithmetic is here. rates-data.js has quoteFor(), which is a
   pure function held to the club's own application forms by
   scripts/test-rates.mjs; this file collects what the renter said, asks it,
   and lays the answer out. Anything that looks like a price in this file is
   a bug.

   Availability still comes from the events the club enters, which is the
   one thing the forms cannot tell anybody. */

(function () {
  var R = window.SJVSC_RATES;
  var card = R.card();
  var money = R.money;

  /* Availability comes off the events the club already enters. An event ties
     the hall up the day before, the day of, and the day after. Today and
     anything before it are gone too: nobody books the hall for this morning. */
  var D = window.SJVSC;
  function gone(date) {
    /* day against day: the date off the form carries a midday time and
       today() is midnight, so comparing them straight lets today through */
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return d <= D.today();
  }
  function taken(date) { return gone(date) || D.blocks(date); }

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---- the page ------------------------------------------------------ */

  function drawUse() {
    var sel = el('qUse');
    if (!sel) return;
    sel.innerHTML = card.use.map(function (u, i) {
      return '<option value="' + esc(u.id) + '"' + (i === card.use.length - 1 ? ' selected' : '') +
        '>' + esc(u.name) + (u.price ? ' (' + money(u.price) + ')' : '') + '</option>';
    }).join('');
  }

  /* Everything here is free today. Showing a price only when there is one
     keeps a row of "$0" off a page nobody wants to read. */
  function drawOptions() {
    var box = el('qOptions');
    if (!box) return;
    box.innerHTML = card.options.map(function (o) {
      return '<label><input type="checkbox" data-option="' + esc(o.id) + '"> ' +
        esc(o.name) + (o.price ? ' <span class="muted">' + money(o.price) + '</span>' : '') +
        '</label>';
    }).join('');
  }

  /* A waiver belongs to members, so the question only appears for one. */
  function drawWaiver() {
    var wrap = el('qWaiverWrap');
    var who = el('qWho');
    if (!wrap || !who) return;
    var member = who.value === 'member';
    var w = card.waivers.filter(function (x) { return R.appliesTo(x.who, member); })[0];
    wrap.hidden = !member || !w;
    if (w) {
      el('qWaiverLabel').textContent = w.name;
      el('qWaiver').setAttribute('data-waiver', w.id);
    }
    if (wrap.hidden) el('qWaiver').checked = false;
  }

  /* How many guards this many guests needs, said as the number is typed,
     because it is the thing that surprises people. */
  function drawGuardNote() {
    var note = el('qGuardNote');
    var who = el('qWho');
    if (!note || !who) return;
    var member = who.value === 'member';
    var n = R.appliesTo(card.rules.guards && card.rules.guards.who, member)
      ? R.guardsFor(card, el('qGuests').value) : 0;
    note.textContent = n
      ? n + ' licensed security ' + (n === 1 ? 'guard is' : 'guards are') + ' required at this size.'
      : '';
  }

  function drawRateCard() {
    var lead = el('rateLead');
    if (lead) {
      lead.textContent = 'The hall is one price, whoever you are and whichever day you take it. ' +
        'Members pay ' + money(card.rent.member) + ' and everyone else ' +
        money(card.rent.nonmember) + '.';
    }

    var t = el('rateTable');
    if (t) {
      var feeRow = function (f, member) {
        if (!R.appliesTo(f.who, member)) return '<td class="num muted">&#8212;</td>';
        return '<td class="num">' + money(f.amount) + '</td>';
      };
      t.innerHTML =
        '<thead><tr><th></th><th class="num">Member</th><th class="num">Not a member</th></tr></thead>' +
        '<tbody><tr><td>Hall rental</td><td class="num">' + money(card.rent.member) +
        '</td><td class="num">' + money(card.rent.nonmember) + '</td></tr>' +
        card.fees.map(function (f) {
          return '<tr><td>' + esc(f.name) +
            (f.refundable ? ' <span class="muted">(returned after the event)</span>' : '') +
            '</td>' + feeRow(f, true) + feeRow(f, false) + '</tr>';
        }).join('') +
        card.waivers.map(function (w) {
          return '<tr><td>' + esc(w.name) + '</td>' +
            (R.appliesTo(w.who, true) ? '<td class="num">' + money(0) + '</td>' : '<td class="num muted">&#8212;</td>') +
            (R.appliesTo(w.who, false) ? '<td class="num">' + money(0) + '</td>' : '<td class="num muted">&#8212;</td>') +
            '</tr>';
        }).join('') +
        '</tbody>';
    }

    var ex = el('rateExtras');
    if (ex) {
      var free = card.options.filter(function (o) { return !o.price; });
      var paid = card.options.filter(function (o) { return o.price; });
      ex.innerHTML =
        (free.length ? '<p class="muted">Included at no charge: ' +
          free.map(function (o) { return esc(o.name).toLowerCase(); }).join(', ') + '.</p>' : '') +
        (paid.length ? '<div class="scroll"><table class="tbl"><tbody>' +
          paid.map(function (o) {
            return '<tr><td>' + esc(o.name) + '</td><td class="num">' + money(o.price) + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '');
    }

    var rr = el('rateRules');
    if (rr) {
      var a = card.rules.access || {};
      var bits = [];
      if (a.from) {
        bits.push('<li>The hall is yours from <b>' + esc(a.from) + '</b> on the day until <b>' +
          esc(a.until) + '</b>, and you have until <b>' + esc(a.clearBy) +
          '</b> to clear up.</li>');
      }
      if (a.setupDayBefore) {
        bits.push('<li>Members may decorate the day before, ' + esc(a.setupDayBefore) + '.</li>');
      }
      if (card.rules.noSales) bits.push('<li>' + esc(card.rules.noSales) + '</li>');
      if (card.rules.memberMonths) {
        bits.push('<li>The member rate is for members of at least <b>' +
          card.rules.memberMonths + ' months</b>.</li>');
      }
      (card.rules.cancellation || []).forEach(function (c) {
        if (!c.note) return;
        bits.push('<li>Cancel ' + (c.daysBefore ? c.daysBefore + ' or more days before' : 'later than that') +
          ': ' + esc(c.note) + '</li>');
      });
      rr.innerHTML = bits.length
        ? '<h3>The terms</h3><ul class="muted" style="margin-top:10px;padding-left:18px;line-height:1.7">' +
          bits.join('') + '</ul>'
        : '';
    }
  }

  /* ---- the quote ----------------------------------------------------- */

  /* The nearest open days of the same weekday, so somebody asking for a
     Friday is offered Fridays. */
  /* what the quote knows, handed to the contact form so nobody retypes it */
  function enquiry(v, q, usedName, guests) {
    var lines = [
      'Hall rental enquiry',
      'Date: ' + D.fullDate(v),
      'Renting as: ' + (q.member ? 'a club member' : 'not a member'),
      'Using: ' + usedName,
      'Guests: ' + guests,
      'Estimate: ' + money(q.total) +
        (q.deposit ? ' plus ' + money(q.deposit.amount) + ' held as a deposit' : ''),
      'Reference: SJ-' + v.replace(/-/g, '')
    ];
    return 'contact.html?about=Hall%20rental&msg=' + encodeURIComponent(lines.join('\n'));
  }

  function nearestOpen(v) {
    var base = new Date(v + 'T12:00:00'), out = [];
    for (var i = 7; i <= 70 && out.length < 2; i += 7) {
      [1, -1].forEach(function (dir) {
        if (out.length >= 2) return;
        var t = new Date(base); t.setDate(base.getDate() + dir * i);
        if (t >= D.today() && !taken(t)) out.push(t);
      });
    }
    return out.sort(function (a, b) { return a - b; });
  }

  /* ---- the calendar -------------------------------------------------- */

  function iso(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) +
      '-' + ('0' + d.getDate()).slice(-2);
  }

  var grid = el('calGrid');
  var shown = null;            // the first of the month on screen

  function drawMonth() {
    if (!grid) return;
    var now = D.today();
    var first = new Date(shown.getFullYear(), shown.getMonth(), 1);
    el('calTitle').textContent = D.MONTH[first.getMonth()] + ' ' + first.getFullYear();

    /* a month never starts on a Sunday by itself, so pad back to one */
    var cur = new Date(first);
    cur.setDate(1 - first.getDay());
    var end = new Date(first.getFullYear(), first.getMonth() + 1, 0);

    var cells = [];
    while (cur <= end || cur.getDay() !== 0) {
      cells.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
      if (cells.length > 41) break;
    }

    grid.innerHTML = '';
    cells.forEach(function (d) {
      var out = d.getMonth() !== first.getMonth();
      var past = d <= now;          // today is gone too
      var shut = !past && !!taken(d);
      var cell;

      if (out) {
        cell = document.createElement('span');
        cell.className = 'rcal-cell rcal-out';
      } else if (past || shut) {
        cell = document.createElement('span');
        cell.className = 'rcal-cell ' + (past ? 'rcal-past' : 'rcal-shut');
        cell.setAttribute('aria-label', D.fullDate(iso(d)) +
          (past ? ', past' : ', not available'));
      } else {
        cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'rcal-cell rcal-open';
        cell.setAttribute('aria-label', D.fullDate(iso(d)) + ', available');
        cell.addEventListener('click', function () {
          el('qDate').value = iso(d);
          [].forEach.call(grid.querySelectorAll('.rcal-on'), function (n) {
            n.classList.remove('rcal-on');
          });
          cell.classList.add('rcal-on');
          el('qDate').focus();
        });
      }

      cell.appendChild(document.createTextNode(d.getDate()));
      if (!out && iso(d) === el('qDate').value) cell.classList.add('rcal-on');
      grid.appendChild(cell);
    });

    /* nothing before this month is bookable, so there is nowhere to go back to */
    el('calPrev').disabled =
      first <= new Date(now.getFullYear(), now.getMonth(), 1);
  }

  function step(by) {
    shown = new Date(shown.getFullYear(), shown.getMonth() + by, 1);
    drawMonth();
  }

  if (grid) {
    /* it opens on this month, which is the one somebody is looking for */
    var now = D.today();
    shown = new Date(now.getFullYear(), now.getMonth(), 1);

    /* and the form starts on the first day that can actually be booked */
    if (!el('qDate').value) {
      var first = new Date(now);
      for (var tries = 0; tries < 400; tries++) {
        first.setDate(first.getDate() + 1);
        if (!taken(first)) { el('qDate').value = iso(first); break; }
      }
    }
    el('calPrev').addEventListener('click', function () { step(-1); });
    el('calNext').addEventListener('click', function () { step(1); });
    el('qDate').addEventListener('change', function () {
      var v = el('qDate').value;
      if (!v) return;
      var d = new Date(v + 'T12:00:00');
      shown = new Date(d.getFullYear(), d.getMonth(), 1);
      drawMonth();
    });
    drawMonth();
  }

  drawUse();
  drawOptions();
  drawWaiver();
  drawRateCard();
  drawGuardNote();

  if (el('qWho')) {
    el('qWho').addEventListener('change', function () { drawWaiver(); drawGuardNote(); });
  }
  if (el('qGuests')) el('qGuests').addEventListener('input', drawGuardNote);

  var form = el('quoteForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var out = el('quoteOut');
    var v = el('qDate').value;
    if (!v) return;

    var d = new Date(v + 'T12:00:00');
    var pretty = d.toLocaleDateString('en-US',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    if (taken(d)) {
      var alts = nearestOpen(v).map(function (t) {
        return t.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
      });
      out.innerHTML = '<div class="result taken" style="display:block">' +
        '<b>' + pretty + (gone(d) ? ' has passed.' : ' is not available.') + '</b>' +
        (alts.length ? ' The nearest open ones are ' + alts.join(' and ') + '.' : '') +
        '</div>';
      out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    var member = el('qWho').value === 'member';
    var guests = parseInt(el('qGuests').value, 10) || 0;
    var useId = el('qUse').value;
    var chosen = [].map.call(form.querySelectorAll('[data-option]:checked'), function (b) {
      return b.getAttribute('data-option');
    });
    var waiverBox = el('qWaiver');
    var waiver = (waiverBox && waiverBox.checked && !el('qWaiverWrap').hidden)
      ? waiverBox.getAttribute('data-waiver') : null;

    var q = R.quoteFor(card, {
      member: member, use: useId, options: chosen, guests: guests, waiver: waiver
    });

    var used = R.byId(card.use, useId);
    var usedName = used ? used.name : '';

    var rows = q.lines.map(function (l) {
      return '<tr><td>' + esc(l.label) +
        (l.note ? '<br><span class="muted">' + esc(l.note) + '</span>' : '') +
        '</td><td class="num">' + money(l.amount) + '</td></tr>';
    }).join('');

    out.innerHTML = '<div class="result open" style="display:block;margin-bottom:20px">' +
      '<b>' + pretty + ' is available.</b> Here is the estimate.</div>' +
      '<div class="card" style="padding:0;overflow:hidden">' +
      '<div style="padding:20px 22px;border-bottom:1px solid var(--line);display:flex;' +
      'justify-content:space-between;gap:14px;flex-wrap:wrap">' +
      '<div><span class="eyebrow" style="color:var(--ink-soft)">Estimate</span>' +
      '<h3 style="margin-top:4px">' + esc(usedName) + ', ' + guests + ' guests</h3></div>' +
      '<div class="muted" style="text-align:right">Ref. SJ-' + v.replace(/-/g, '') +
      '<br>' + (member ? 'Member rate' : 'Not a member') + '</div></div>' +
      '<div class="scroll"><table class="tbl" style="margin:0"><tbody>' + rows +
      '<tr style="background:var(--cream-2)"><td style="font-size:1.05rem"><b>To pay</b></td>' +
      '<td class="num" style="font-size:1.05rem"><b>' + money(q.total) + '</b></td></tr>' +
      '</tbody></table></div>' +

      /* A deposit is not a cost. It sits apart from the total so nobody
         reads money they get back as money they have spent. */
      (q.deposit ? '<div style="padding:18px 22px;border-top:1px solid var(--line)">' +
        '<p><b>' + esc(q.deposit.label) + ': ' + money(q.deposit.amount) + '</b>, held, not spent.</p>' +
        (q.deposit.note ? '<p class="muted" style="margin-top:4px">' + esc(q.deposit.note) + '</p>' : '') +
        '</div>' : '') +

      (q.requirements.length ? '<div style="padding:18px 22px;border-top:1px solid var(--line)">' +
        '<p><b>What you need to provide</b></p>' +
        '<ul class="muted" style="margin-top:8px;padding-left:18px;line-height:1.7">' +
        q.requirements.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') +
        '</ul></div>' : '') +

      '<div style="padding:18px 22px;border-top:1px solid var(--line)">' +
      '<p style="margin:0"><a class="btn btn-red" href="' +
      enquiry(v, q, usedName, guests) + '">Request this date</a></p>' +
      '</div></div>' +

      (member ? '' : '<p class="muted" style="margin-top:14px">Members pay ' +
        money(card.rent.member) + ' for the same hall, a saving of ' +
        money(card.rent.nonmember - card.rent.member) + '. ' +
        '<a href="membership.html">Membership is $50 a year</a>.</p>');

    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}());
