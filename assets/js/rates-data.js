/* The hall rental rate card, read by the rentals page and the quote engine.

   What the club charges is two numbers: $600 to a member, $1,200 to anyone
   else, for the same hall on the same terms. There is no day-of-week
   pricing and no separate charge for the grounds — an earlier version of
   this file invented both, and the club's own forms have neither.

   What the club requires is longer than what it charges, and most of it is
   not money: a certificate of insurance, a guard contract, a signature
   twenty-four months after joining. The card carries those as data too, so
   a quote can say what a renter must produce and by when, rather than only
   what it costs.

   Everything is in data/rates.json and editable in the admin. Inside,
   outside, the kitchen, the stage, the BBQ pit and the bar are all free
   today and all carry a price field, so the day the board decides the pit
   is worth $75 is a day of typing, not of programming.

   quoteFor() is arithmetic and nothing else: no document, no window. It
   runs under node, and scripts/test-rates.mjs holds it to the forms. */

/* Loaded by a <script> tag in the browser and imported by node for the
   tests, so it hangs itself on globalThis, which both of them have. */
(function (root, factory) {
  root.SJVSC_RATES = factory();
}(globalThis, function () {

  /* Used when there is no API to ask — the GitHub copy, or a page opened
     from disk. The real card lives in the database. */
  var SEED = {
    rent: { member: 600, nonmember: 1200 },
    fees: [
      { id: 'cleaning', name: 'Cleaning fee', amount: 500, who: 'all',
        refundable: false, dueDays: 10,
        note: 'Not refundable. Due ten days before the event.' },
      { id: 'deposit', name: 'Security and damage deposit', amount: 800,
        who: 'nonmember', refundable: true, dueDays: null,
        note: 'Due with the application, and it holds the date.' }
    ],
    waivers: [
      { id: 'funeral', name: 'Funeral or celebration of life', who: 'member',
        waives: 'rent', note: 'The hall is free. The cleaning fee still applies.' }
    ],
    use: [
      { id: 'inside', name: 'Inside only', price: 0 },
      { id: 'outside', name: 'Outside only', price: 0 },
      { id: 'both', name: 'Inside and outside', price: 0 }
    ],
    options: [
      { id: 'kitchen', name: 'Kitchen', price: 0 },
      { id: 'stage', name: 'Outside stage', price: 0 },
      { id: 'bbq', name: 'Outside BBQ pit', price: 0 },
      { id: 'outsidebar', name: 'Outside bar', price: 0 },
      { id: 'alcohol', name: 'Alcohol will be served', price: 0,
        requiresLiquorLiability: true }
    ],
    rules: {
      rentDueDays: 30, memberMonths: 24, minimumAge: 21,
      access: { from: '9:00 am', until: '1:00 am', clearBy: 'noon the next day',
                setupDayBefore: '9:00 am to 8:00 pm, on request' },
      insurance: { amount: 1000000, daysBefore: 10,
                   named: 'San Joaquin Valley Swiss Club, Inc.' },
      guards: { who: 'nonmember', base: 2, baseUpTo: 199, perExtra: 100, daysBefore: 10 },
      holdHarmless: { who: 'member' },
      cancellation: [
        { daysBefore: 60, refund: 'all', less: 50 },
        { daysBefore: 30, refund: 'half' },
        { daysBefore: 0, refund: 'none' }
      ]
    }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* A card from the database may be missing anything, and a quote must not
     throw because a list is absent. */
  function tidy(c) {
    var out = clone(c && typeof c === 'object' ? c : SEED);
    out.rent = out.rent || {};
    if (typeof out.rent.member !== 'number') out.rent.member = 0;
    if (typeof out.rent.nonmember !== 'number') out.rent.nonmember = 0;
    ['fees', 'waivers', 'use', 'options'].forEach(function (k) {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    out.rules = out.rules || {};
    if (!Array.isArray(out.rules.cancellation)) out.rules.cancellation = [];
    return out;
  }

  var CARD = tidy(SEED);

  function card() { return clone(CARD); }

  function load() {
    if (typeof window === 'undefined' || !window.SJVSC_STORE) {
      return Promise.resolve(card());
    }
    return window.SJVSC_STORE.read('rates', SEED).then(function (c) {
      CARD = tidy(c);
      return card();
    });
  }

  function money(n) {
    return '$' + Number(n || 0).toLocaleString('en-US',
      { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function byId(list, id) {
    for (var i = 0; i < (list || []).length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  /* Does a thing marked for members, non-members or everyone apply here? */
  function appliesTo(who, member) {
    if (!who || who === 'all') return true;
    return who === (member ? 'member' : 'nonmember');
  }

  /* Two up to 199, and another for each hundred after that: 200 takes a
     third, 300 a fourth. Written from the rule rather than a table, so
     changing the numbers in the admin changes the answer. */
  function guardsFor(c, guests) {
    var g = (c.rules && c.rules.guards) || {};
    var n = Number(guests) || 0;
    if (!g.base) return 0;
    if (n <= (g.baseUpTo || 199)) return g.base;
    var extra = Math.ceil((n - (g.baseUpTo || 199)) / (g.perExtra || 100));
    return g.base + extra;
  }

  /**
   * What a booking costs and what it obliges the renter to do.
   *
   * ask: { member, use, options: [id], guests, waiver }
   * Returns { lines, total, deposit, dueTotal, requirements, notes }
   * where lines are what is charged and deposit is held separately,
   * because money you get back is not money you have spent.
   */
  function quoteFor(c, ask) {
    c = tidy(c);
    ask = ask || {};
    var member = !!ask.member;
    var lines = [];
    var requirements = [];

    /* the hall itself, unless something waives it */
    var waiver = ask.waiver ? byId(c.waivers, ask.waiver) : null;
    if (waiver && !appliesTo(waiver.who, member)) waiver = null;

    var rent = member ? c.rent.member : c.rent.nonmember;
    if (waiver && waiver.waives === 'rent') {
      lines.push({ label: waiver.name, amount: 0, note: waiver.note || '' });
    } else {
      lines.push({
        label: 'Hall rental' + (member ? ', member rate' : ''),
        amount: rent,
        note: c.rules.rentDueDays ? 'Due ' + c.rules.rentDueDays + ' days before the event.' : ''
      });
    }

    /* what the renter is using. Free today, priced tomorrow. */
    var use = ask.use ? byId(c.use, ask.use) : null;
    if (use && use.price) lines.push({ label: use.name, amount: use.price });

    var chosen = Array.isArray(ask.options) ? ask.options : [];
    chosen.forEach(function (id) {
      var o = byId(c.options, id);
      if (o && o.price) lines.push({ label: o.name, amount: o.price, note: o.note || '' });
    });

    /* fees that are not the rent and are not refundable */
    var deposit = null;
    (c.fees || []).forEach(function (f) {
      if (!appliesTo(f.who, member)) return;
      if (f.refundable) {
        deposit = { label: f.name, amount: f.amount, note: f.note || '' };
      } else {
        lines.push({
          label: f.name,
          amount: f.amount,
          note: f.note || (f.dueDays ? 'Due ' + f.dueDays + ' days before the event.' : '')
        });
      }
    });

    var total = lines.reduce(function (sum, l) { return sum + (Number(l.amount) || 0); }, 0);

    /* ---- what has to be produced, which is not money ---- */

    var ins = c.rules.insurance || {};
    if (ins.amount) {
      requirements.push('Proof of liability insurance of at least ' + money(ins.amount) +
        (ins.named ? ', naming ' + ins.named + ' as additional insured' : '') +
        (ins.daysBefore ? ', received no later than ' + ins.daysBefore + ' days before the event' : '') + '.');
    }

    var alcohol = chosen.indexOf('alcohol') > -1;
    if (alcohol) {
      var a = byId(c.options, 'alcohol');
      if (!a || a.requiresLiquorLiability !== false) {
        requirements.push('Liquor liability cover, because alcohol is being served.');
      }
    }

    var guards = (c.rules.guards && appliesTo(c.rules.guards.who, member))
      ? guardsFor(c, ask.guests) : 0;
    if (guards) {
      var g = c.rules.guards;
      requirements.push(guards + ' licensed security ' + (guards === 1 ? 'guard' : 'guards') +
        ' for ' + (Number(ask.guests) || 0) + ' guests' +
        (g.daysBefore ? ', with the contract filed ' + g.daysBefore + ' days before the event' : '') + '.');
      if (g.note) requirements.push(g.note);
    } else if (c.rules.holdHarmless && appliesTo(c.rules.holdHarmless.who, member)) {
      requirements.push(c.rules.holdHarmless.note ||
        'A member who chooses not to have security guards signs the hold harmless statement.');
    }

    if (c.rules.memberMonths && member) {
      requirements.push('The member rate is for members of at least ' +
        c.rules.memberMonths + ' months.');
    }
    if (c.rules.minimumAge) {
      requirements.push('Whoever rents the hall must be ' + c.rules.minimumAge + ' or older.');
    }

    return {
      member: member,
      lines: lines,
      total: total,
      deposit: deposit,
      dueTotal: total + (deposit ? deposit.amount : 0),
      guards: guards,
      requirements: requirements,
      access: c.rules.access || {},
      cancellation: c.rules.cancellation || [],
      noSales: c.rules.noSales || ''
    };
  }

  return {
    SEED: SEED,
    card: card, load: load, clone: clone, tidy: tidy,
    reset: function () { return clone(SEED); },
    money: money, byId: byId, appliesTo: appliesTo,
    guardsFor: guardsFor, quoteFor: quoteFor
  };
}));
