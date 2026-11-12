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

  /* What a booking of each kind comes to, so the two numbers a reader
     actually wants are the two numbers they see first. */
  function headline(member) {
    return R.quoteFor(card, { member: member, guests: 0 });
  }

  function drawRateCard() {
    var lead = el('rateLead');
    if (lead) {
      lead.textContent = 'One price for the hall, whichever day of the week you take it, ' +
        'and the kitchen, the stage, the pit and the bar come with it.';
    }

    /* ---- the two totals, and the saving as the headline it is ---- */
    var cards = el('priceCards');
    if (cards) {
      var m = headline(true), n = headline(false);
      var saving = card.rent.nonmember - card.rent.member;

      var detail = function (q) {
        return q.lines.map(function (l) {
          return '<span>' + esc(l.label.replace(/,.*$/, '')) +
            '<b>' + money(l.amount) + '</b></span>';
        }).join('');
      };

      cards.innerHTML =
        '<div class="pricecard feature">' +
          (saving > 0 ? '<span class="pflag">Saves ' + money(saving) + '</span>' : '') +
          '<span class="eyebrow">As a club member</span>' +
          '<p class="pbig">' + money(m.total) + '</p>' +
          '<div class="plines">' + detail(m) + '</div>' +
          '<p class="pdep">Nothing held as a deposit.</p>' +
        '</div>' +
        '<div class="pricecard">' +
          '<span class="eyebrow">Not a member</span>' +
          '<p class="pbig">' + money(n.total) + '</p>' +
          '<div class="plines">' + detail(n) + '</div>' +
          (n.deposit ? '<p class="pdep">' + money(n.deposit.amount) +
            ' held as a deposit, returned after the event.</p>' : '') +
        '</div>' +
        (saving > 0 ? '<p class="psave">Membership is <b>$50 a year</b>. One booking pays ' +
          'for it twelve times over. <a href="membership.html">Join the club &#8594;</a></p>' : '');
    }

    /* ---- What's included and House rules.

       Both are short lines in one column, not prose. These are things to
       scan, not passages to read, and paragraphs of them were hard going.
       One fact per line, same shape in both sections.

       Written from the card, so a figure changed in the admin changes
       these too. ---- */

    /* The club writes some of these strings and they may or may not end
       in a full stop. Never add a second. */
    var stop = function (t) {
      return /[.!?]$/.test(String(t).trim()) ? t : t + '.';
    };
    var list = function (cls, items) {
      items = items.filter(Boolean);
      if (!items.length) return '';
      return '<ul class="rlist ' + cls + '">' +
        items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
    };

    var inc = el('included');
    if (inc) {
      var kitchen = R.byId(card.options, 'kitchen');
      var a = card.rules.access || {};
      var got = [];

      card.options.forEach(function (o) {
        if (o.price || o.id === 'alcohol') return;
        var note = o.id === 'kitchen' && o.note ? ' <span>' + esc(o.note) + '</span>' : '';
        got.push(esc(o.name) + note);
      });
      card.options.forEach(function (o) {
        if (o.price) got.push(esc(o.name) + ' <span>' + money(o.price) + '</span>');
      });
      if (a.from && a.until) {
        got.push('Yours from <b>' + esc(a.from) + '</b> to <b>' + esc(a.until) + '</b>' +
          (a.clearBy ? ', cleared by <b>' + esc(a.clearBy) + '</b>' : ''));
      }
      if (a.setupDayBefore) {
        got.push('Members may decorate the day before, ' + esc(a.setupDayBefore));
      }
      inc.innerHTML = list('ticks', got);
    }

    var hr = el('houserules');
    if (hr) {
      var ins = card.rules.insurance || {};
      var g = card.rules.guards || {};
      var rules = [];

      if (card.rules.noSales) rules.push(esc(card.rules.noSales));
      if (card.rules.minimumAge) {
        rules.push('Whoever signs for it must be <b>' + card.rules.minimumAge + '</b> or older');
      }
      if (ins.amount) {
        rules.push('Liability cover of at least <b>' + money(ins.amount) + '</b>' +
          (ins.named ? ', naming ' + esc(ins.named).replace(/\.$/, '') : ''));
        if (ins.daysBefore) {
          rules.push('Certificate due <b>' + ins.daysBefore + ' days</b> before');
        }
      }
      rules.push('Alcohol adds liquor liability');
      if (g.base) {
        rules.push('Non-members: <b>' + g.base + ' licensed guards</b> up to ' + g.baseUpTo +
          ' guests, one more for every ' + g.perExtra + ' after');
        if (g.daysBefore) {
          rules.push('Guard contract due <b>' + g.daysBefore + ' days</b> before');
        }
        if (g.note) rules.push(esc(g.note).replace(/\.$/, ''));
      }
      if (card.rules.holdHarmless && card.rules.holdHarmless.note) {
        rules.push(esc(card.rules.holdHarmless.note).replace(/\.$/, ''));
      }
      if (card.rules.memberMonths) {
        rules.push('The member rate is for members of at least <b>' +
          card.rules.memberMonths + ' months</b>');
      }
      (card.rules.cancellation || []).forEach(function (c) {
        if (!c.note) return;
        rules.push((c.daysBefore ? 'Cancel <b>' + c.daysBefore + ' days or more</b> before'
                                 : 'Cancel later than that') +
          ' <span>' + esc(c.note).replace(/\.$/, '') + '</span>');
      });

      hr.innerHTML = list('rules', rules);
    }
  }

  /* ---- the quote ----------------------------------------------------- */

  /* The nearest open days of the same weekday, so somebody asking for a
     Friday is offered Fridays. */
  /* what the quote knows, handed to the contact form so nobody retypes it */
  function enquiry(v, q, usedName, guests) {
    var lines = [
      'Hall rental enquiry (a request, not a booking)',
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

  /* Draw from the seed so the page is never blank, then again from the
     database the moment it answers.

     Until this call existed the page only ever drew the seed, so a price
     the board changed in the admin reached the quote and never reached
     the rate card beside it. The two agreed only because the seed happened
     to carry the same numbers. */
  function drawEverything() {
    drawUse();
    drawOptions();
    drawWaiver();
    drawRateCard();
    drawGuardNote();
  }

  drawEverything();
  R.load().then(function (fresh) {
    card = fresh;
    drawEverything();
  });

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
      '<div><span class="eyebrow" style="color:var(--ink-soft)">Estimate, not a booking</span>' +
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

      '<div class="notabooking">' +
      '<p><b>This does not book the hall.</b> It goes to the club for review.</p>' +
      '<p style="margin-top:16px"><a class="btn btn-red" href="' +
      enquiry(v, q, usedName, guests) + '">Ask about this date</a></p>' +
      '</div></div>' +

      '';

    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}());
