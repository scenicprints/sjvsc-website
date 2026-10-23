/* Hall rental: the rate card on the page and the quote under the form.

   Every figure comes from rates-data.js, which the admin writes. Nothing
   about the card is assumed here: the club names its own kinds of day, its
   own spaces, its own extras and its own rules, so this file draws whatever
   it finds and prices from the same thing a renter is looking at. */

(function () {
  var R = window.SJVSC_RATES;
  var card = R.card();
  var money = R.money;

  /* The club's own calendar still lives here; the rate card does not own it. */
  var CLUB = {
    '2027-02-07': 'the Jass Party',
    '2027-02-20': 'the Almond Blossom Parade and Dance',
    '2027-03-13': 'the Schwinger Dinner and Dance',
    '2027-04-10': 'the Swiss Echoes Spring Concert',
    '2027-06-05': 'the Spring Schwingfest',
    '2027-07-24': "the Members' BBQ and Buebe Schwingfest",
    '2027-09-04': 'the Championship Schwingfest',
    '2027-10-02': 'Oktoberfest',
    '2027-12-04': "the Children's Christmas Party"
  };

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function hours() { return R.ruleValue(card, 'hours', 8); }
  function hourly() { return R.ruleValue(card, 'hourly', 0); }
  function discount() { return R.ruleValue(card, 'discount', 0) / 100; }

  /* A rule's number is written the way that rule is used. */
  function ruleText(r) {
    var n = parseFloat(String(r.value).replace(/[^0-9.\-]/g, ''));
    if (isNaN(n)) return esc(r.value);
    if (r.does === 'discount') return n + '%';
    if (r.does === 'hours') return n + (n === 1 ? ' hour' : ' hours');
    return money(n);
  }

  function spaceById(id) {
    for (var i = 0; i < card.spaces.length; i++) if (card.spaces[i].id === id) return card.spaces[i];
    return card.spaces[0];
  }

  /* ---- the page ------------------------------------------------------ */

  function drawSpaces() {
    var sel = el('qSpace');
    if (!sel) return;
    sel.innerHTML = card.spaces.map(function (s, i) {
      return '<option value="' + esc(s.id) + '"' + (i === 0 ? ' selected' : '') + '>' +
        esc(s.name) + '</option>';
    }).join('');
  }

  function drawExtraBoxes() {
    var box = el('qExtras');
    if (!box) return;
    var choosable = card.extras.filter(function (x) { return x.when === 'choose'; });
    box.innerHTML = choosable.map(function (x) {
      return '<label><input type="checkbox" data-extra="' + esc(x.id) + '"> ' +
        esc(x.name) + '</label>';
    }).join('');
    var always = card.extras.filter(function (x) { return x.when === 'always'; });
    if (always.length) {
      box.innerHTML += '<p class="muted" style="margin-top:4px">Included on every booking: ' +
        always.map(function (x) { return esc(x.name); }).join(', ') + '.</p>';
    }
  }

  function drawMemberLabel() {
    var lab = el('qMemberLabel');
    if (!lab) return;
    var d = R.rule(card, 'discount');
    lab.textContent = 'I am a club member' + (d ? ' (' + ruleText(d) + ' off)' : '');
  }

  function drawRateCard() {
    var lead = el('rateLead');
    if (lead) {
      lead.innerHTML = card.rules.map(function (r) {
        return esc(r.name) + ' <b>' + ruleText(r) + '</b>';
      }).join(' &#183; ');
    }

    var t = el('rateTable');
    if (t) {
      t.innerHTML = '<caption>Placeholder rates.</caption>' +
        '<thead><tr><th>Space</th>' +
        card.days.map(function (d) { return '<th class="num">' + esc(d.name) + '</th>'; }).join('') +
        '</tr></thead><tbody>' +
        card.spaces.map(function (s) {
          return '<tr><td>' + esc(s.name) + '</td>' +
            card.days.map(function (d) {
              return '<td class="num">' + money(s.prices[d.id] || 0) + '</td>';
            }).join('') + '</tr>';
        }).join('') + '</tbody>';
    }

    var x = el('extraTable');
    if (x) {
      var note = { always: 'on every booking', alcohol: 'required with alcohol' };
      x.innerHTML = '<thead><tr><th>Extra</th><th class="num">Price</th></tr></thead><tbody>' +
        card.extras.map(function (e) {
          return '<tr><td>' + esc(e.name) +
            (note[e.when] ? ' <span class="muted">(' + note[e.when] + ')</span>' : '') +
            '</td><td class="num">' + money(e.price) + '</td></tr>';
        }).join('') +
        card.rules.filter(function (r) { return r.does === 'print'; }).map(function (r) {
          return '<tr><td>' + esc(r.name) + '</td><td class="num">' + ruleText(r) + '</td></tr>';
        }).join('') + '</tbody>';
    }
  }

  /* ---- the quote ----------------------------------------------------- */

  function nearestOpen(v) {
    var base = new Date(v + 'T12:00:00'), out = [];
    for (var i = 1; i <= 21 && out.length < 2; i++) {
      [-1, 1].forEach(function (dir) {
        if (out.length >= 2) return;
        var t = new Date(base); t.setDate(base.getDate() + dir * i);
        var iso = t.toISOString().slice(0, 10);
        if (!CLUB[iso] && t.getDay() === 6) out.push(t);
      });
    }
    return out;
  }

  drawSpaces();
  drawExtraBoxes();
  drawMemberLabel();
  drawRateCard();

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

    if (CLUB[v]) {
      var alts = nearestOpen(v).map(function (t) {
        return t.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
      });
      out.innerHTML = '<div class="result taken" style="display:block">' +
        '<b>' + pretty + ' is not available.</b> The club has ' + CLUB[v] + ' that day, ' +
        'so the hall is in use.' +
        (alts.length ? ' The nearest open Saturdays are ' + alts.join(' and ') + '.' : '') +
        '</div>';
      out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    var space = spaceById(el('qSpace').value);
    var guests = parseInt(el('qGuests').value, 10) || 0;
    var inc = hours();
    var asked = parseInt(el('qHours').value, 10) || inc;
    var alcohol = el('qAlcohol').checked;
    var member = el('qMember').checked;
    var day = R.dayFor(card, d);

    var lines = [];
    lines.push({
      label: space.name + ' &#8212; ' + day.name + ' rate, ' + inc + ' hours included',
      amount: space.prices[day.id] || 0
    });

    var over = Math.max(0, asked - inc);
    if (over > 0 && hourly() > 0) {
      lines.push({
        label: 'Additional hours (' + over + ' &#215; ' + money(hourly()) + ')',
        amount: over * hourly()
      });
    }

    card.extras.forEach(function (x) {
      if (x.when === 'always') { lines.push({ label: esc(x.name), amount: x.price }); return; }
      if (x.when === 'alcohol') { if (alcohol) lines.push({ label: esc(x.name), amount: x.price }); return; }
      var box = form.querySelector('[data-extra="' + x.id + '"]');
      if (box && box.checked) lines.push({ label: esc(x.name), amount: x.price });
    });

    var requirements = [];
    if (alcohol) {
      requirements.push('A certificate of liability insurance naming the club as additional insured.');
      requirements.push('No alcohol may be sold without a one-day permit from California ABC.');
    }

    var subtotal = lines.reduce(function (s, l) { return s + l.amount; }, 0);
    var off = member ? Math.round(subtotal * discount()) : 0;
    var total = subtotal - off;
    var dRule = R.rule(card, 'discount');

    var rows = lines.map(function (l) {
      return '<tr><td>' + l.label + '</td><td class="num">' + money(l.amount) + '</td></tr>';
    }).join('');

    var due = card.rules.filter(function (r) { return r.does === 'print'; });

    out.innerHTML = '<div class="result open" style="display:block;margin-bottom:20px">' +
      '<b>' + pretty + ' is available.</b> Here is the estimate.</div>' +
      '<div class="card" style="padding:0;overflow:hidden">' +
      '<div style="padding:20px 22px;border-bottom:1px solid var(--line);display:flex;' +
      'justify-content:space-between;gap:14px;flex-wrap:wrap">' +
      '<div><span class="eyebrow" style="color:var(--ink-soft)">Estimate</span>' +
      '<h3 style="margin-top:4px">' + esc(space.name) + ', ' + guests + ' guests</h3></div>' +
      '<div class="muted" style="text-align:right">Ref. SJ-' + v.replace(/-/g, '') +
      '<br>Valid 30 days</div></div>' +
      '<div class="scroll"><table class="tbl" style="margin:0"><tbody>' + rows +
      '<tr><td><b>Subtotal</b></td><td class="num"><b>' + money(subtotal) + '</b></td></tr>' +
      (off ? '<tr><td>' + esc(dRule.name) + ' (' + ruleText(dRule) + ')</td>' +
        '<td class="num">&#8722;' + money(off) + '</td></tr>' : '') +
      '<tr style="background:var(--cream-2)"><td style="font-size:1.05rem"><b>Total</b></td>' +
      '<td class="num" style="font-size:1.05rem"><b>' + money(total) + '</b></td></tr>' +
      '</tbody></table></div>' +
      '<div style="padding:18px 22px;border-top:1px solid var(--line)">' +
      (due.length ? '<p class="muted"><b>Taken separately:</b></p>' +
        '<ul class="muted" style="margin-top:6px;padding-left:18px">' +
        due.map(function (r) {
          return '<li style="margin-top:4px">' + esc(r.name) + ', ' + ruleText(r) + '</li>';
        }).join('') + '</ul>' : '') +
      (requirements.length ? '<p class="muted" style="margin-top:12px"><b>Required of you:</b></p>' +
        '<ul class="muted" style="margin-top:6px;padding-left:18px">' +
        requirements.map(function (r) { return '<li style="margin-top:4px">' + r + '</li>'; }).join('') +
        '</ul>' : '') +
      '<p style="margin-top:16px"><a class="btn btn-red" href="contact.html">Request this date</a></p>' +
      '</div></div>' +
      (member || !dRule ? '' : '<p class="muted" style="margin-top:14px">Members rent at ' +
        ruleText(dRule) + ' less. <a href="membership.html">Membership is $50 a year</a>.</p>');

    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}());
