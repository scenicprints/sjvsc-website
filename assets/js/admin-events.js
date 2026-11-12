/* The events screen. The list itself lives in events-data.js, which the
   public pages read too, so what is shown here is what they show.

   Signed out, it shows what is on the website and nothing can be altered:
   every field is fixed and there is nothing to press that could lose work.
   Signed in, the same screen is the one the board edits, and Save sends the
   event to the Worker, which decides whether to accept it.

   Which of the two you get is decided by the Worker, not by Clerk: the
   screen asks /api/me whether a write would be accepted, because that is
   the only answer that matters. */

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

  /* set from /api/me once the Worker has answered */
  var canEdit = false;
  /* the event open in the form; null while adding a new one */
  var current = null;
  var onShelf = false;

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

  /* The reverse of lock, for a board member who may write. Date boxes
     become real date pickers: the locked screen writes a day out in full
     because that is how it is read, but "Sunday 15 November 2026" is not
     something to hand back to a server. */
  function unlock(where) {
    [].forEach.call(where.querySelectorAll('input, textarea'), function (i) {
      i.readOnly = false;
      i.classList.remove('ro');
      i.placeholder = i.dataset.hint || '';
    });
    [].forEach.call(where.querySelectorAll('select'), function (sel) {
      sel.disabled = false;
      sel.classList.remove('ro');
    });
  }

  /* The repeating rows are divs, not inputs, so lock never touched them and
     unlock cannot either. Signed in, they become editable in place. */
  function editable(el) {
    if (canEdit) {
      el.contentEditable = 'true';
      el.classList.add('edit');
    }
    return el;
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
    editable(row.querySelector('.dvalue')).textContent = value || '';
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
    editable(box).textContent = label || '';
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
    var kindCell = row.querySelector('.tkind');
    if (canEdit) {
      /* a kind is one of three things, so it is picked, never typed */
      var sel = document.createElement('select');
      [['', 'Not set'], ['entry', 'Upon entry'], ['person', 'From someone']]
        .forEach(function (pair) {
          var o = document.createElement('option');
          o.value = pair[0];
          o.textContent = pair[1];
          sel.appendChild(o);
        });
      sel.value = how;
      sel.addEventListener('change', function () {
        var person = sel.value === 'person';
        row.querySelector('.twho').hidden = !person;
        row.querySelector('.tcontact').hidden = !person;
      });
      kindCell.appendChild(sel);
    } else {
      kindCell.textContent =
        how === 'entry' ? 'Upon entry' : how === 'person' ? 'From someone' : '';
    }

    /* only somebody has a name and a way to reach them */
    var who = row.querySelector('.twho');
    var contact = row.querySelector('.tcontact');
    editable(who).textContent = (seller && seller.who) || '';
    editable(contact).textContent = (seller && seller.contact) || '';
    if (how !== 'person') {
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

    editable(row.querySelector('.aname')).textContent = (a && a.name) || '';
    editable(row.querySelector('.alink')).textContent = a && a.data
      ? 'A file in the data, ' + size(a.size || 0)
      : (a && a.link) || '';

    /* A flyer, the minutes, a form to fill in. The box can still be typed
       into for something that lives elsewhere, but the usual case is a
       file on the phone of whoever is entering the event. */
    if (canEdit) {
      var pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'abtn small afpick';
      pick.textContent = 'Choose a file';
      pick.addEventListener('click', function () {
        var chooser = document.createElement('input');
        chooser.type = 'file';
        chooser.accept = 'image/*,application/pdf';
        chooser.addEventListener('change', function () {
          var file = (chooser.files || [])[0];
          if (!file) return;
          pick.disabled = true;
          said('Uploading ' + file.name + '...');
          window.SJVSC_STORE.upload(file, 'event', file.name)
            .then(function (res) {
              row.querySelector('.alink').textContent = res.src;
              var nameCell = row.querySelector('.aname');
              if (!nameCell.textContent.trim()) nameCell.textContent = res.name || file.name;
              said('Uploaded. Press Save to keep it on this event.');
            })
            .catch(function (err) { said(err.message || 'That did not upload.', true); })
            .then(function () { pick.disabled = false; });
        });
        chooser.click();
      });
      row.appendChild(pick);
    }

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
    current = (e && e.id) ? e : null;
    onShelf = !!fromShelf;
    document.getElementById('formhead').textContent =
      fromShelf ? 'A saved event' : 'This event';

    /* Locked, a day is written out in full because that is how it is read.
       Editable, it is a date box holding the value the server wants. */
    NAMES.forEach(function (k) {
      var v = (e && e[k]) ? e[k] : '';
      var isDate = DATES.indexOf(k) > -1;
      if (canEdit) {
        if (isDate) F[k].type = 'date';
        F[k].value = v;
      } else {
        if (isDate) F[k].type = 'text';
        if (v && isDate) v = D.fullDate(v);
        if (v && k === 'tickprice') v = D.priceText(v);
        F[k].value = v;
      }
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

    if (canEdit) {
      unlock(form);
      addRowButtons();
    } else {
      lock(form);
    }
    said('');
    document.getElementById('savebtn').hidden = !canEdit;
    /* nothing to delete until it has been saved once */
    document.getElementById('delbtn').hidden = !canEdit || !current;
    show('form');
  }

  /* ---- reading the form back ---------------------------------------- */

  function text(el) { return (el ? el.textContent : '').trim(); }

  function readDetails() {
    return [].map.call(drows.querySelectorAll('.dgroup'), function (g) {
      return {
        label: text(g.querySelector('.dlabel')),
        values: [].map.call(g.querySelectorAll('.dvalue'), text)
                  .filter(function (v) { return v; })
      };
    }).filter(function (d) { return d.label || d.values.length; });
  }

  function readAttachments() {
    return [].map.call(attachrows.querySelectorAll('.afrow'), function (r) {
      return { name: text(r.querySelector('.aname')), link: text(r.querySelector('.alink')) };
    }).filter(function (a) { return a.name || a.link; });
  }

  function readSellers() {
    return [].map.call(tickrows.querySelectorAll('.trow'), function (r) {
      var sel = r.querySelector('.tkind select');
      var kind = sel ? sel.value : '';
      if (kind === 'person') {
        return {
          kind: 'person',
          who: text(r.querySelector('.twho')),
          contact: text(r.querySelector('.tcontact'))
        };
      }
      return kind ? { kind: kind } : null;
    }).filter(Boolean);
  }

  function collect() {
    var out = {};
    NAMES.forEach(function (k) { out[k] = (F[k].value || '').trim(); });
    out.details = readDetails();
    out.attachments = readAttachments();
    out.ticksellers = readSellers();
    return out;
  }

  /* ---- adding a row to each of the repeating sections ---------------- */

  function addRowButtons() {
    [[drows, 'Add a heading', function () {
        var empty = drows.querySelector('.eempty');
        if (empty) empty.remove();
        addGroup('', ['']);
      }],
     [attachrows, 'Add an attachment', function () {
        var empty = attachrows.querySelector('.eempty');
        if (empty) empty.remove();
        addAttachRow({});
      }],
     [tickrows, 'Add a way to get one', function () {
        var empty = tickrows.querySelector('.eempty');
        if (empty) empty.remove();
        addTicketRow({ kind: 'entry' });
      }]
    ].forEach(function (spec) {
      var holder = spec[0];
      if (!holder || holder.parentNode.querySelector('.arowadd')) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'abtn small arowadd';
      b.textContent = spec[1];
      b.addEventListener('click', spec[2]);
      holder.parentNode.insertBefore(b, holder.nextSibling);
    });
  }

  /* ---- saying what happened ------------------------------------------ */

  function said(message, bad) {
    var box = document.getElementById('saidwhat');
    if (!box) return;
    box.textContent = message || '';
    box.classList.toggle('bad', !!bad);
  }

  function reload() {
    return Promise.all([D.load(), D.savedLoad()]).then(function (r) {
      events = r[0];
      saved = r[1];
      render();
      renderShelf();
      drawMonth();
    });
  }

  function save() {
    if (!canEdit) return;
    var body = collect();
    if (!body.title) { said('An event needs a name.', true); return; }

    var btn = document.getElementById('savebtn');
    btn.disabled = true;
    said('Saving...');

    var where = onShelf ? 'saved' : 'events';
    var job = current
      ? window.SJVSC_STORE.update(where, current.id, body)
      : window.SJVSC_STORE.create(where, body);

    job.then(function (saved2) {
      current = saved2;
      document.getElementById('delbtn').hidden = false;
      said('Saved. The website shows this now.');
      return reload();
    }).catch(function (err) {
      said(err.message || 'That did not save.', true);
    }).then(function () {
      btn.disabled = false;
    });
  }

  function remove() {
    if (!canEdit || !current) return;
    if (!window.confirm('Delete "' + current.title + '"? This cannot be undone.')) return;

    var btn = document.getElementById('delbtn');
    btn.disabled = true;
    said('Deleting...');

    window.SJVSC_STORE.remove(onShelf ? 'saved' : 'events', current.id)
      .then(function () {
        current = null;
        return reload();
      })
      .then(function () { show('list'); })
      .catch(function (err) { said(err.message || 'That did not delete.', true); })
      .then(function () { btn.disabled = false; });
  }

  document.getElementById('cancelbtn').addEventListener('click', function () { show('list'); });
  document.getElementById('backbtn').addEventListener('click', function () { show('list'); });
  document.getElementById('savebtn').addEventListener('click', save);
  document.getElementById('delbtn').addEventListener('click', remove);
  document.getElementById('addbtn').addEventListener('click', function () {
    onShelf = false;
    open(null);
    document.getElementById('formhead').textContent = 'A new event';
  });

  /* Whether this screen can write is the Worker's answer, not Clerk's. A
     signed-in visitor the Worker would refuse must not be shown a Save
     button that cannot work. */
  function askWhetherWeMayWrite() {
    return window.SJVSC_STORE.me().then(function (me) {
      canEdit = !!(me && me.signedIn);
      document.getElementById('addbtn').hidden = !canEdit;
      document.getElementById('signedoutnote').hidden = canEdit;
    });
  }

  /* nothing is drawn until the data has arrived */
  Promise.all([D.load(), D.savedLoad(), askWhetherWeMayWrite()]).then(function (r) {
    events = r[0];
    saved = r[1];
    render();
    renderShelf();
    drawMonth();
  });

  /* Clerk settles after the first paint, so ask again when it does. */
  if (window.SJVSC_AUTH) {
    window.SJVSC_AUTH.onChange(function () {
      var was = canEdit;
      askWhetherWeMayWrite().then(function () {
        if (canEdit !== was) show('list');
      });
    });
  }
})();
