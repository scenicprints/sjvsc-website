/* The events screen. The list itself lives in events-data.js, which the
   public pages read too, so what is shown here is what they show.

   This screen reads data/events.json and data/saved.json and shows what is in
   them. It does not change them: a GitHub Pages site is files, and the files
   are changed by editing them in the repository and committing. So every
   field here is fixed, and there is nothing to press that could lose work. */

(function () {
  var D = window.SJVSC;
  var events = D.all();          // replaced once the repository answers

  var listview = document.getElementById('listview');
  var formview = document.getElementById('formview');
  var list = document.getElementById('elist');
  var slist = document.getElementById('slist');
  var form = document.getElementById('eform');
  var drows = document.getElementById('drows');
  var tickrows = document.getElementById('tickrows');
  var attachrows = document.getElementById('attachrows');
  var saved = D.savedAll();

  /* the plain fields; details rows and attachments are their own thing */
  var NAMES = ['title', 'note', 'desc', 'page', 'date', 'time', 'from',
               'tickfrom', 'tickto', 'tickprice'];
  var DATES = ['date', 'from', 'tickfrom', 'tickto'];
  var F = {};
  NAMES.forEach(function (k) { F[k] = document.getElementById('f-' + k); });

  var at = D.at, today = D.today;
  var dayName = D.fullDate;
  function pretty(s) { return s ? D.pretty(s) : ''; }
  function iso(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
      + '-' + ('0' + d.getDate()).slice(-2);
  }
  function size(n) {
    return n < 1024 ? n + ' bytes'
      : n < 1048576 ? Math.round(n / 1024) + ' KB'
      : (n / 1048576).toFixed(1) + ' MB';
  }

  /* A box holds a value and is not to be typed in. A text box is left
     readable rather than greyed out, because the value is the point; a
     chooser has to be disabled, since nothing else stops it. An empty box
     says so, so an event with no time reads differently from one whose time
     has gone missing. */
  function lock(where) {
    [].forEach.call(where.querySelectorAll('input, textarea'), function (i) {
      i.readOnly = true;
      i.classList.add('ro');
      if (!i.value) i.placeholder = 'Nothing set';
    });
    [].forEach.call(where.querySelectorAll('select'), function (s) {
      s.disabled = true;
      s.classList.add('ro');
    });
  }

  /* a heading with nothing under it, or no headings at all */
  function nothing(where, what) {
    where.innerHTML = '';
    var p = document.createElement('p');
    p.className = 'eempty';
    p.textContent = what;
    where.appendChild(p);
  }

  /* ---- the list ----------------------------------------------------- */

  function standing(e) {
    var now = today();
    if (now < at(e.from)) return { cls: 'soon', text: 'Starts showing ' + pretty(e.from) };
    if (now > at(e.until)) return { cls: 'done', text: 'Finished showing' };
    return { cls: 'live', text: 'Showing on the website now' };
  }

  function render() {
    events.sort(function (a, b) { return at(a.date) - at(b.date); });
    list.innerHTML = '';
    if (!events.length) {
      var empty = document.createElement('li');
      empty.className = 'eempty';
      empty.textContent = 'There is nothing in data/events.json.';
      list.appendChild(empty);
      return;
    }
    events.forEach(function (e) {
      var s = standing(e);
      var li = document.createElement('li');
      li.className = 'eitem';
      li.innerHTML =
        '<span class="ewhen"><b></b><i></i></span>' +
        '<span class="ebody"><b></b><span class="enote"></span>' +
        '<span class="estand ' + s.cls + '"></span>' +
        '<span class="estand none" hidden>Not on a page, so it does not open one</span>' +
        '</span>' +
        '<button class="abtn" type="button">Open</button>';
      li.querySelector('.ewhen b').textContent = at(e.date).getDate();
      li.querySelector('.ewhen i').textContent = D.MONTH[at(e.date).getMonth()].slice(0, 3);
      li.querySelector('.ebody b').textContent = e.title;
      li.querySelector('.enote').textContent = dayName(e.date) + (e.time ? ', ' + e.time : '');
      li.querySelector('.estand').textContent = s.text;
      /* a row with no tie shows on the calendar but is not a link, because
         there is nowhere for it to go */
      li.querySelector('.estand.none').hidden = !!e.page;
      li.querySelector('button').addEventListener('click', function () { open(e); });
      list.appendChild(li);
    });
  }

  /* ---- details: the club writes its own headings ---------------------

     One heading can say more than one thing, so a heading is a group and
     each thing it says is a line in it. The heading box sits in the group's
     first line. */

  function addLine(group, value) {
    var row = document.createElement('div');
    row.className = 'drow';
    row.innerHTML = '<span class="dspacer"></span><div class="dvalue val"></div>';
    row.querySelector('.dvalue').textContent = value || '';
    group.appendChild(row);
    if (group.querySelector('.drow') === row) {     // the heading box lives here
      row.replaceChild(group.querySelector('.dlabel'), row.querySelector('.dspacer'));
    }
    return row;
  }

  function addGroup(label, values) {
    var group = document.createElement('div');
    group.className = 'dgroup';
    var box = document.createElement('div');
    box.className = 'dlabel val';
    box.textContent = label || '';
    group.appendChild(box);                      // picked up by the first line
    drows.appendChild(group);
    (values && values.length ? values : ['']).forEach(function (v) { addLine(group, v); });
    return group;
  }

  /* ---- where to get a ticket -----------------------------------------

     A ticket can be had in more than one way at once: upon entry and from
     two people is a normal answer. Each way is a row. */

  function addTicketRow(seller) {
    var row = document.createElement('div');
    row.className = 'trow';
    row.innerHTML =
      '<div class="tkind val"></div>' +
      '<div class="twho val"></div>' +
      '<div class="tcontact val"></div>';

    var how = (seller && seller.kind) || '';
    row.querySelector('.tkind').textContent =
      how === 'entry' ? 'Upon entry' : how === 'person' ? 'From someone' : '';

    /* only somebody has a name and a way to reach them */
    var who = row.querySelector('.twho');
    var contact = row.querySelector('.tcontact');
    if (how === 'person') {
      who.textContent = (seller && seller.who) || '';
      contact.textContent = (seller && seller.contact) || '';
    } else {
      who.hidden = true;
      contact.hidden = true;
    }

    tickrows.appendChild(row);
    return row;
  }

  /* ---- attachments ----------------------------------------------------

     One row each: what it is called, and then either the address it lives at
     or, where the file itself is in the data, how big it is. */

  function addAttachRow(a) {
    var row = document.createElement('div');
    row.className = 'afrow';
    row.innerHTML = '<div class="aname val"></div><div class="alink val"></div>';

    row.querySelector('.aname').textContent = (a && a.name) || '';
    row.querySelector('.alink').textContent = a && a.data
      ? 'A file in the data, ' + size(a.size || 0)
      : (a && a.link) || '';

    attachrows.appendChild(row);
    return row;
  }

  /* ---- the month -----------------------------------------------------

     The same events as the list above, laid out as a month so a clash is
     obvious. The days either side of an event are marked too, because that
     is when the hall is tied up. */

  var mogrid = document.getElementById('mogrid');
  var moAt = null;

  function drawMonth() {
    if (!mogrid) return;
    var first = new Date(moAt.getFullYear(), moAt.getMonth(), 1);
    document.getElementById('motitle').textContent =
      D.MONTH[first.getMonth()] + ' ' + first.getFullYear();

    var cur = new Date(first);
    cur.setDate(1 - first.getDay());
    var end = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    var cells = [];
    while (cur <= end || cur.getDay() !== 0) {
      cells.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
      if (cells.length > 41) break;
    }

    mogrid.innerHTML = '';
    var now = today();
    cells.forEach(function (d) {
      var out = d.getMonth() !== first.getMonth();
      var on = events.filter(function (e) { return e.date === iso(d); });
      var near = !on.length && D.blocks(d);

      var cell = document.createElement(on.length ? 'button' : 'div');
      if (on.length) cell.type = 'button';
      cell.className = 'amo-cell' + (out ? ' amo-out' : '') +
        (on.length ? ' amo-on' : (near ? ' amo-near' : '')) +
        (iso(d) === iso(now) ? ' amo-today' : '');

      var n = document.createElement('b');
      n.textContent = d.getDate();
      cell.appendChild(n);

      on.forEach(function (e) {
        var tag = document.createElement('span');
        tag.textContent = e.title;
        cell.appendChild(tag);
      });
      if (near) {
        var why = document.createElement('i');
        why.textContent = near.title;
        cell.appendChild(why);
      }
      if (on.length) {
        cell.setAttribute('aria-label', D.fullDate(iso(d)) + ': ' +
          on.map(function (e) { return e.title; }).join(', '));
        cell.addEventListener('click', function () { open(on[0]); });
      }
      mogrid.appendChild(cell);
    });
  }

  function moStep(by) {
    moAt = new Date(moAt.getFullYear(), moAt.getMonth() + by, 1);
    drawMonth();
  }

  if (mogrid) {
    moAt = new Date(today().getFullYear(), today().getMonth(), 1);
    document.getElementById('moprev').addEventListener('click', function () { moStep(-1); });
    document.getElementById('monext').addEventListener('click', function () { moStep(1); });
  }

  /* ---- opening one --------------------------------------------------- */

  /* the saved list, which carries no dates and reaches no reader */
  function renderShelf() {
    slist.innerHTML = '';
    if (!saved.length) {
      var empty = document.createElement('li');
      empty.className = 'eempty';
      empty.textContent = 'There is nothing in data/saved.json.';
      slist.appendChild(empty);
      return;
    }
    saved.forEach(function (e) {
      var li = document.createElement('li');
      li.className = 'eitem';
      li.innerHTML =
        '<span class="ebody"><b></b><span class="enote"></span></span>' +
        '<button class="abtn" type="button">Open</button>';
      li.querySelector('.ebody b').textContent = e.title || 'Untitled';
      li.querySelector('.enote').textContent = e.note || '';
      li.querySelector('button').addEventListener('click', function () { open(e, true); });
      slist.appendChild(li);
    });
  }

  function show(which) {
    if (which === 'list') drawMonth();
    listview.hidden = which !== 'list';
    formview.hidden = which !== 'form';
    window.scrollTo(0, 0);
  }

  function open(e, fromShelf) {
    document.getElementById('formhead').textContent =
      fromShelf ? 'A saved event' : 'This event';

    /* a day is written out in full, because that is how it is read */
    NAMES.forEach(function (k) {
      var v = (e && e[k]) ? e[k] : '';
      if (v && DATES.indexOf(k) > -1) v = D.fullDate(v);
      if (v && k === 'tickprice') v = D.priceText(v);
      F[k].value = v;
    });

    drows.innerHTML = '';
    var details = (e && e.details) || [];
    if (details.length) {
      details.forEach(function (d) {
        /* events written before a heading could say more than one thing */
        addGroup(d.label, d.values || (d.value ? [d.value] : ['']));
      });
    } else nothing(drows, 'Nothing else is set on this event.');

    attachrows.innerHTML = '';
    var files = (e && e.attachments) || [];
    if (files.length) files.forEach(function (a) { addAttachRow(a); });
    else nothing(attachrows, 'Nothing is attached.');

    tickrows.innerHTML = '';
    var sellers = (e && e.ticksellers) || [];
    if (sellers.length) sellers.forEach(function (x) { addTicketRow(x); });
    else nothing(tickrows, 'Nowhere is set to get one.');

    lock(form);
    show('form');
  }

  document.getElementById('cancelbtn').addEventListener('click', function () { show('list'); });
  document.getElementById('backbtn').addEventListener('click', function () { show('list'); });

  /* nothing is drawn until the repository has answered */
  Promise.all([D.load(), D.savedLoad()]).then(function (r) {
    events = r[0];
    saved = r[1];
    render();
    renderShelf();
    drawMonth();
  });
})();
