/* Hall rental quote engine — concept.
   Every figure here would live in the admin rate card, not in code.
   Values are illustrative placeholders for the demo. */

(function () {
  var RATES = {
    hall:     { saturday: 1800, friday: 1400, sunday: 1400, weekday: 900 },
    both:     { saturday: 2200, friday: 1750, sunday: 1750, weekday: 1200 },
    grounds:  { saturday: 700,  friday: 600,  sunday: 600,  weekday: 450 }
  };
  var SPACE_LABEL = { hall: 'Hall', both: 'Hall and grounds', grounds: 'Grounds only' };
  var INCLUDED_HOURS = 8;
  var HOURLY_OVERAGE = 150;
  var MEMBER_DISCOUNT = 0.25;
  var BOOKING_DEPOSIT = 500;
  var DAMAGE_DEPOSIT = 500;

  var ADDONS = {
    kitchen: { label: 'Commercial kitchen', price: 250 },
    linens:  { label: 'Linens', price: 200 },
    av:      { label: 'Sound system and projector', price: 150 },
    cleaning:{ label: 'End-of-night cleaning', price: 300 }
  };
  var BARTENDER = { label: 'Licensed bartender (required when alcohol is served)', price: 240 };
  var SECURITY  = { label: 'Security guard (required over 150 guests with alcohol)', price: 320 };

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

  function dayType(d) {
    var n = d.getDay();
    if (n === 6) return 'saturday';
    if (n === 5) return 'friday';
    if (n === 0) return 'sunday';
    return 'weekday';
  }
  function money(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  function el(id) { return document.getElementById(id); }

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

  var form = el('quoteForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var out = el('quoteOut');
    var v = el('qDate').value;
    if (!v) return;

    var d = new Date(v + 'T12:00:00');
    var pretty = d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // 1. availability
    if (CLUB[v]) {
      var alts = nearestOpen(v).map(function (t) {
        return t.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
      });
      out.innerHTML = '<div class="result taken" style="display:block">' +
        '<b>' + pretty + ' is not available.</b> The club has ' + CLUB[v] + ' that day, ' +
        'so the hall is in use.' + (alts.length ? ' The nearest open Saturdays are ' + alts.join(' and ') + '.' : '') +
        '</div>';
      out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    var space = el('qSpace').value;
    var guests = parseInt(el('qGuests').value, 10) || 0;
    var hours = parseInt(el('qHours').value, 10) || INCLUDED_HOURS;
    var alcohol = el('qAlcohol').checked;
    var member = el('qMember').checked;
    var dt = dayType(d);

    var lines = [];
    var base = RATES[space][dt];
    lines.push({ label: SPACE_LABEL[space] + ' — ' + dt.charAt(0).toUpperCase() + dt.slice(1) +
      ' rate, ' + INCLUDED_HOURS + ' hours included', amount: base });

    var over = Math.max(0, hours - INCLUDED_HOURS);
    if (over > 0) lines.push({ label: 'Additional hours (' + over + ' × ' + money(HOURLY_OVERAGE) + ')', amount: over * HOURLY_OVERAGE });

    Object.keys(ADDONS).forEach(function (k) {
      var box = el('q_' + k);
      if (box && box.checked) lines.push({ label: ADDONS[k].label, amount: ADDONS[k].price });
    });

    var requirements = [];
    if (alcohol) {
      lines.push({ label: BARTENDER.label, amount: BARTENDER.price });
      requirements.push('A certificate of liability insurance naming the club as additional insured.');
      requirements.push('No alcohol may be sold without a one-day permit from California ABC.');
      if (guests > 150) {
        lines.push({ label: SECURITY.label, amount: SECURITY.price });
        requirements.push('One security guard is required for events over 150 guests where alcohol is served.');
      }
    }

    var subtotal = lines.reduce(function (s, l) { return s + l.amount; }, 0);
    var discount = member ? Math.round(subtotal * MEMBER_DISCOUNT) : 0;
    var total = subtotal - discount;

    var rows = lines.map(function (l) {
      return '<tr><td>' + l.label + '</td><td class="num">' + money(l.amount) + '</td></tr>';
    }).join('');

    var html = '<div class="result open" style="display:block;margin-bottom:20px">' +
      '<b>' + pretty + ' is available.</b> Here is the estimate.</div>' +
      '<div class="card" style="padding:0;overflow:hidden">' +
      '<div style="padding:20px 22px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap">' +
      '<div><span class="eyebrow" style="color:var(--ink-soft)">Estimate</span>' +
      '<h3 style="margin-top:4px">' + SPACE_LABEL[space] + ', ' + guests + ' guests</h3></div>' +
      '<div class="muted" style="text-align:right">Ref. SJ-' + v.replace(/-/g, '') +
      '<br>Valid 30 days</div></div>' +
      '<div class="scroll"><table class="tbl" style="margin:0">' +
      '<tbody>' + rows +
      '<tr><td><b>Subtotal</b></td><td class="num"><b>' + money(subtotal) + '</b></td></tr>' +
      (discount ? '<tr><td>Member discount (25%)</td><td class="num">−' + money(discount) + '</td></tr>' : '') +
      '<tr style="background:var(--cream-2)"><td style="font-size:1.05rem"><b>Total</b></td>' +
      '<td class="num" style="font-size:1.05rem"><b>' + money(total) + '</b></td></tr>' +
      '</tbody></table></div>' +
      '<div style="padding:18px 22px;border-top:1px solid var(--line)">' +
      '<p class="muted"><b>Due to hold the date:</b> ' + money(BOOKING_DEPOSIT) +
      ' booking deposit, credited against the total. A refundable damage deposit of ' +
      money(DAMAGE_DEPOSIT) + ' is taken separately and returned after the event.</p>' +
      (requirements.length ? '<p class="muted" style="margin-top:12px"><b>Required of you:</b></p><ul class="muted" style="margin-top:6px;padding-left:18px">' +
        requirements.map(function (r) { return '<li style="margin-top:4px">' + r + '</li>'; }).join('') + '</ul>' : '') +
      '<p style="margin-top:16px"><a class="btn btn-red" href="contact.html">Request this date</a></p>' +
      '</div></div>' +
      (member ? '' : '<p class="muted" style="margin-top:14px">Members rent at 25% less. ' +
        '<a href="membership.html">Membership is $50 a year</a>.</p>');

    out.innerHTML = html;
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
})();
