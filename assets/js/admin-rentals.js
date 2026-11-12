/* The hall rental screen.

   The card is two prices, some fees, a few things that are free today, and
   a page of terms that are not money at all. All of it comes from the
   database and all of it goes back there, so a number changed here is a
   number changed on the rate card and in the next quote.

   Signed out the screen reads; signed in it writes. Which of the two is
   the Worker's answer, not Clerk's — see admin-events.js for why. */

(function () {
  var R = window.SJVSC_RATES;
  var S = window.SJVSC_STORE;
  var card = R.card();
  var canEdit = false;

  function el(id) { return document.getElementById(id); }
  function make(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }

  function said(message, bad) {
    var box = el('rsaid');
    if (!box) return;
    box.textContent = message || '';
    box.classList.toggle('bad', !!bad);
  }

  /* ---- rows ----------------------------------------------------------

     Every repeating section is the same shape: a row of labelled boxes
     built from a spec, so adding a column is adding a line rather than
     writing another renderer. */

  function row(holder, fields) {
    var r = make('div', 'rrow');
    fields.forEach(function (f) {
      var cell = make('div', 'rcell' + (f.wide ? ' wide' : ''));
      var lab = make('label');
      lab.textContent = f.label;
      var input;
      if (f.type === 'select') {
        input = make('select');
        f.options.forEach(function (o) {
          var opt = make('option');
          opt.value = o[0];
          opt.textContent = o[1];
          input.appendChild(opt);
        });
        input.value = f.value == null ? '' : String(f.value);
      } else if (f.type === 'check') {
        input = make('input');
        input.type = 'checkbox';
        input.checked = !!f.value;
      } else {
        input = make('input');
        input.type = f.type || 'text';
        if (f.type === 'number') { input.min = f.min == null ? 0 : f.min; input.step = f.step || 1; }
        input.value = f.value == null ? '' : f.value;
      }
      input.setAttribute('data-key', f.key);
      if (f.readOnly) input.readOnly = true;
      lab.appendChild(input);
      cell.appendChild(lab);
      r.appendChild(cell);
    });
    holder.appendChild(r);
    return r;
  }

  function readRow(r) {
    var out = {};
    [].forEach.call(r.querySelectorAll('[data-key]'), function (i) {
      var k = i.getAttribute('data-key');
      if (i.type === 'checkbox') out[k] = i.checked;
      else if (i.type === 'number') out[k] = i.value === '' ? null : Number(i.value);
      else out[k] = i.value;
    });
    return out;
  }

  var WHO = [['all', 'Everyone'], ['member', 'Members only'], ['nonmember', 'Non-members only']];

  /* ---- drawing -------------------------------------------------------- */

  function draw() {
    el('rMember').value = card.rent.member;
    el('rNonMember').value = card.rent.nonmember;

    var fees = el('feerows');
    fees.innerHTML = '';
    card.fees.forEach(function (f) {
      row(fees, [
        { key: 'id', label: 'Reference', value: f.id, readOnly: true },
        { key: 'name', label: 'What it is called', value: f.name, wide: true },
        { key: 'amount', label: 'Amount', value: f.amount, type: 'number' },
        { key: 'who', label: 'Who pays it', value: f.who, type: 'select', options: WHO },
        { key: 'refundable', label: 'Returned', value: f.refundable, type: 'check' },
        { key: 'dueDays', label: 'Days before', value: f.dueDays, type: 'number' },
        { key: 'note', label: 'What the quote says about it', value: f.note, wide: true }
      ]);
    });

    var waivers = el('waiverrows');
    waivers.innerHTML = '';
    card.waivers.forEach(function (w) {
      row(waivers, [
        { key: 'id', label: 'Reference', value: w.id, readOnly: true },
        { key: 'name', label: 'The reason', value: w.name, wide: true },
        { key: 'who', label: 'Who may claim it', value: w.who, type: 'select', options: WHO },
        { key: 'note', label: 'What the quote says about it', value: w.note, wide: true }
      ]);
    });

    [['use', 'userows'], ['options', 'optionrows']].forEach(function (pair) {
      var holder = el(pair[1]);
      holder.innerHTML = '';
      card[pair[0]].forEach(function (o) {
        row(holder, [
          { key: 'id', label: 'Reference', value: o.id, readOnly: true },
          { key: 'name', label: 'What it is called', value: o.name, wide: true },
          { key: 'price', label: 'Price', value: o.price || 0, type: 'number' }
        ]);
      });
    });

    var g = card.rules.guards || {};
    el('gBase').value = g.base == null ? '' : g.base;
    el('gUpTo').value = g.baseUpTo == null ? '' : g.baseUpTo;
    el('gPer').value = g.perExtra == null ? '' : g.perExtra;
    el('gDays').value = g.daysBefore == null ? '' : g.daysBefore;

    var i = card.rules.insurance || {};
    el('iAmount').value = i.amount == null ? '' : i.amount;
    el('iDays').value = i.daysBefore == null ? '' : i.daysBefore;
    el('iNamed').value = i.named || '';

    var a = card.rules.access || {};
    el('tRentDue').value = card.rules.rentDueDays == null ? '' : card.rules.rentDueDays;
    el('tMonths').value = card.rules.memberMonths == null ? '' : card.rules.memberMonths;
    el('tAge').value = card.rules.minimumAge == null ? '' : card.rules.minimumAge;
    el('tFrom').value = a.from || '';
    el('tUntil').value = a.until || '';
    el('tClear').value = a.clearBy || '';
    el('tSetup').value = a.setupDayBefore || '';
    el('tNoSales').value = card.rules.noSales || '';

    var cancels = el('cancelrows');
    cancels.innerHTML = '';
    (card.rules.cancellation || []).forEach(function (c) {
      row(cancels, [
        { key: 'daysBefore', label: 'Days before', value: c.daysBefore, type: 'number' },
        { key: 'refund', label: 'What comes back', value: c.refund, type: 'select',
          options: [['all', 'All of it'], ['half', 'Half'], ['none', 'Nothing']] },
        { key: 'less', label: 'Less a fee of', value: c.less || 0, type: 'number' },
        { key: 'note', label: 'What the quote says about it', value: c.note, wide: true }
      ]);
    });

    showExample();
    lockOrUnlock();
  }

  /* The guard rule is four numbers and easy to get backwards, so the screen
     works an example rather than making anyone do it in their head. */
  function showExample() {
    var note = el('gExample');
    if (!note) return;
    var live = collect();
    var sizes = [100, 199, 200, 300, 400];
    note.textContent = 'As set: ' + sizes.map(function (n) {
      return n + ' guests needs ' + R.guardsFor(live, n);
    }).join(', ') + '.';
  }

  function lockOrUnlock() {
    var form = el('rform');
    [].forEach.call(form.querySelectorAll('input, textarea, select'), function (i) {
      if (i.getAttribute('data-key') === 'id') { i.readOnly = true; return; }
      if (i.tagName === 'SELECT') i.disabled = !canEdit;
      else i.readOnly = !canEdit;
      i.classList.toggle('ro', !canEdit);
    });
    el('rsave').hidden = !canEdit;
    el('signedoutnote').hidden = canEdit;
  }

  /* ---- reading the screen back ---------------------------------------- */

  function collect() {
    var out = R.clone(card);

    out.rent = {
      member: Number(el('rMember').value) || 0,
      nonmember: Number(el('rNonMember').value) || 0
    };

    out.fees = [].map.call(el('feerows').querySelectorAll('.rrow'), function (r) {
      var v = readRow(r);
      return {
        id: v.id, name: v.name, amount: Number(v.amount) || 0, who: v.who,
        refundable: !!v.refundable,
        dueDays: v.dueDays === null ? null : Number(v.dueDays),
        note: v.note
      };
    });

    out.waivers = [].map.call(el('waiverrows').querySelectorAll('.rrow'), function (r) {
      var v = readRow(r);
      return { id: v.id, name: v.name, who: v.who, waives: 'rent', note: v.note };
    });

    [['use', 'userows'], ['options', 'optionrows']].forEach(function (pair) {
      var before = card[pair[0]];
      out[pair[0]] = [].map.call(el(pair[1]).querySelectorAll('.rrow'), function (r, n) {
        var v = readRow(r);
        var was = before[n] || {};
        var o = { id: v.id, name: v.name, price: Number(v.price) || 0 };
        /* flags the screen does not show must survive a save */
        if (was.requiresLiquorLiability !== undefined) {
          o.requiresLiquorLiability = was.requiresLiquorLiability;
        }
        if (was.note !== undefined) o.note = was.note;
        return o;
      });
    });

    var num = function (id) { return el(id).value === '' ? null : Number(el(id).value); };

    out.rules = out.rules || {};
    out.rules.guards = Object.assign({}, card.rules.guards, {
      base: num('gBase'), baseUpTo: num('gUpTo'),
      perExtra: num('gPer'), daysBefore: num('gDays')
    });
    out.rules.insurance = Object.assign({}, card.rules.insurance, {
      amount: num('iAmount'), daysBefore: num('iDays'), named: el('iNamed').value
    });
    out.rules.rentDueDays = num('tRentDue');
    out.rules.memberMonths = num('tMonths');
    out.rules.minimumAge = num('tAge');
    out.rules.access = {
      from: el('tFrom').value, until: el('tUntil').value,
      clearBy: el('tClear').value, setupDayBefore: el('tSetup').value
    };
    out.rules.noSales = el('tNoSales').value;
    out.rules.cancellation = [].map.call(el('cancelrows').querySelectorAll('.rrow'), function (r) {
      var v = readRow(r);
      var c = { daysBefore: Number(v.daysBefore) || 0, refund: v.refund, note: v.note };
      if (Number(v.less)) c.less = Number(v.less);
      return c;
    });

    return out;
  }

  /* ---- saving --------------------------------------------------------- */

  function save() {
    if (!canEdit) return;
    var next = collect();

    if (!(next.rent.member >= 0) || !(next.rent.nonmember >= 0)) {
      said('Both prices have to be numbers.', true); return;
    }
    /* Somebody will one day type the member price into the wrong box. */
    if (next.rent.member > next.rent.nonmember) {
      if (!window.confirm('The member price is higher than the non-member price. Save anyway?')) return;
    }

    var btn = el('rsave');
    btn.disabled = true;
    said('Saving...');

    S.put('rates', next).then(function (saved) {
      card = R.tidy(saved);
      draw();
      said('Saved. The rate card and the quote show this now.');
    }).catch(function (err) {
      said(err.message || 'That did not save.', true);
    }).then(function () {
      btn.disabled = false;
    });
  }

  /* ---- start ---------------------------------------------------------- */

  el('rsave').addEventListener('click', save);
  el('rform').addEventListener('input', function (e) {
    if (/^g(Base|UpTo|Per)$/.test(e.target.id)) showExample();
  });
  el('rform').addEventListener('submit', function (e) { e.preventDefault(); save(); });

  function askWhetherWeMayWrite() {
    return S.me().then(function (me) { canEdit = !!(me && me.signedIn); });
  }

  Promise.all([R.load(), askWhetherWeMayWrite()]).then(function (r) {
    card = R.tidy(r[0]);
    draw();
  });

  if (window.SJVSC_AUTH) {
    window.SJVSC_AUTH.onChange(function () {
      askWhetherWeMayWrite().then(lockOrUnlock);
    });
  }
}());
