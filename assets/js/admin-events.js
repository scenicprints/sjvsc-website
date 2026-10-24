/* The events screen. The list itself lives in events-data.js, which the
   public pages read too, so a change here is the change they see.

   Edits are kept in this browser only — nothing is sent anywhere and no
   other visitor sees them. That is the right trade for a demo; the real
   version writes to the club's account behind the same screens. */

(function () {
  var D = window.SJVSC;
  var events = D.all();          // replaced once the repository answers

  var listview = document.getElementById('listview');
  var formview = document.getElementById('formview');
  var list = document.getElementById('elist');
  var slist = document.getElementById('slist');
  var form = document.getElementById('eform');
  var confirmBox = document.getElementById('confirm');
  var drows = document.getElementById('drows');
  var tickrows = document.getElementById('tickrows');
  var attachrows = document.getElementById('attachrows');
  var editing = null;
  var onShelf = false;           // editing a saved event rather than a dated one
  var saved = D.savedAll();

  /* the plain fields; details rows and attachments are their own thing */
  var NAMES = ['title', 'note', 'desc', 'page', 'date', 'time', 'from',
               'tickfrom', 'tickto', 'tickprice'];
  var MUST = ['title', 'date'];
  var ERRS = ['title', 'date', 'attach'];
  var F = {};
  NAMES.forEach(function (k) { F[k] = document.getElementById('f-' + k); });


  var at = D.at, today = D.today;
  var dayName = D.fullDate;
  function pretty(s) { return s ? D.pretty(s) : ''; }
  function iso(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
      + '-' + ('0' + d.getDate()).slice(-2);
  }
  function plusDay(s) { var d = at(s); d.setDate(d.getDate() + 1); return iso(d); }
  function size(n) {
    return n < 1024 ? n + ' bytes'
      : n < 1048576 ? Math.round(n / 1024) + ' KB'
      : (n / 1048576).toFixed(1) + ' MB';
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
      empty.textContent = 'There are no events. Add one and it will appear on the website.';
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
        '<button class="abtn" type="button">Change</button>';
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
     each thing it says is a line in it. The plus adds a line to the same
     heading; the button at the bottom adds a heading. The heading box sits
     in the group's first line, so removing that line hands the box to the
     line that becomes first. */

  function addLine(group, value) {
    var row = document.createElement('div');
    row.className = 'drow';
    row.innerHTML =
      '<span class="dspacer"></span>' +
      '<input type="text" class="dvalue" placeholder="110 N. Manley Road, Ripon" ' +
      'aria-label="What it says" autocomplete="off">' +
      '<button class="abtn small dadd" type="button" ' +
      'aria-label="Add another line under this heading">+</button>' +
      '<button class="abtn small drem" type="button">Remove</button>';
    row.querySelector('.dvalue').value = value || '';
    row.querySelector('.dadd').addEventListener('click', function () {
      addLine(group, '').querySelector('.dvalue').focus();
    });
    row.querySelector('.drem').addEventListener('click', function () {
      var label = group.querySelector('.dlabel');
      var first = group.querySelector('.drow') === row;
      row.remove();
      var next = group.querySelector('.drow');
      if (!next) {                                  // the heading went with it
        group.remove();
        if (!drows.querySelector('.dgroup')) addGroup('', ['']);
        return;
      }
      if (first) next.replaceChild(label, next.querySelector('.dspacer'));
    });
    group.appendChild(row);
    if (group.querySelector('.drow') === row) {     // the heading box lives here
      row.replaceChild(group.querySelector('.dlabel'), row.querySelector('.dspacer'));
    }
    return row;
  }

  function addGroup(label, values) {
    var group = document.createElement('div');
    group.className = 'dgroup';
    var box = document.createElement('input');
    box.type = 'text';
    box.className = 'dlabel';
    box.setAttribute('list', 'commonlabels');
    box.placeholder = 'Where';
    box.setAttribute('aria-label', 'Heading');
    box.autocomplete = 'off';
    box.value = label || '';
    group.appendChild(box);                      // picked up by the first line
    drows.appendChild(group);
    (values && values.length ? values : ['']).forEach(function (v) { addLine(group, v); });
    return group;
  }

  function readRows() {
    return [].slice.call(drows.querySelectorAll('.dgroup')).map(function (g) {
      return {
        label: g.querySelector('.dlabel').value.trim(),
        values: [].slice.call(g.querySelectorAll('.dvalue')).map(function (i) {
          return i.value.trim();
        }).filter(function (v) { return v; })
      };
    }).filter(function (d) { return d.label || d.values.length; });   // blanks ignored
  }

  /* ---- where to get a ticket -----------------------------------------

     A ticket can be had in more than one way at once: upon entry and from
     two people is a normal answer. Each way is a row, and a row only asks
     for a name once somebody is selling them. */

  function addTicketRow(seller) {
    var row = document.createElement('div');
    row.className = 'trow';
    row.innerHTML =
      '<select class="tkind" aria-label="Where to get one">' +
      '<option value="">Choose one</option>' +
      '<option value="entry">Upon entry</option>' +
      '<option value="person">From someone</option></select>' +
      '<input type="text" class="twho" placeholder="Hans Brunner" ' +
      'aria-label="Who to ask" autocomplete="off">' +
      '<input type="text" class="tcontact" placeholder="(209) 555-0143 or an email" ' +
      'aria-label="How to reach them" autocomplete="off">' +
      '<button class="abtn small drem" type="button">Remove</button>';

    var kind = row.querySelector('.tkind');
    var who = row.querySelector('.twho');
    var contact = row.querySelector('.tcontact');

    function sync() {
      var person = kind.value === 'person';
      who.hidden = !person;
      contact.hidden = !person;
    }
    kind.addEventListener('change', sync);

    /* a telephone number is tidied up; an email is left alone */
    contact.addEventListener('blur', function () {
      contact.value = D.contactText(contact.value);
    });

    kind.value = (seller && seller.kind) || '';
    who.value = (seller && seller.who) || '';
    contact.value = (seller && seller.contact) || '';
    sync();

    row.querySelector('.drem').addEventListener('click', function () {
      row.remove();
      if (!tickrows.children.length) addTicketRow(null);
    });

    tickrows.appendChild(row);
    return row;
  }

  function readTicketRows() {
    return [].slice.call(tickrows.querySelectorAll('.trow')).map(function (r) {
      var kind = r.querySelector('.tkind').value;
      if (kind === 'person') {
        return { kind: 'person',
                 who: r.querySelector('.twho').value.trim(),
                 contact: D.contactText(r.querySelector('.tcontact').value) };
      }
      return kind ? { kind: 'entry' } : null;
    }).filter(function (x) {
      return x && (x.kind === 'entry' || x.who || x.contact);
    });
  }

  /* ---- attachments ----------------------------------------------------

     One row each: what it is called, and then either a file chosen from the
     computer or a web address. A file is kept in the browser, which has very
     little room, so a large one is refused and a link is the way round it. */

  var MAX_FILE = 400 * 1024;

  function attachError(msg) {
    var el = document.getElementById('e-attach');
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  function addAttachRow(a) {
    var row = document.createElement('div');
    row.className = 'afrow';
    row.innerHTML =
      '<input type="text" class="aname" placeholder="Minutes of the meeting" ' +
      'aria-label="What the attachment is called" autocomplete="off">' +
      '<input type="text" class="alink" placeholder="https://..." ' +
      'aria-label="Web address" autocomplete="off">' +
      '<button class="abtn small apick" type="button"></button>' +
      '<input type="file" class="afile" hidden>' +
      '<button class="abtn small danger drem" type="button">Remove</button>';

    var name = row.querySelector('.aname');
    var link = row.querySelector('.alink');
    var pick = row.querySelector('.apick');
    var file = row.querySelector('.afile');
    var held = { data: '', size: 0, type: '' };

    function show() {
      pick.textContent = held.data ? 'Take the file off' : 'Choose a file';
      link.disabled = !!held.data;
      link.placeholder = held.data ? size(held.size) + ' file attached' : 'https://...';
    }

    pick.addEventListener('click', function () {
      if (held.data) {
        held = { data: '', size: 0, type: '' };
        show();
        return;
      }
      file.click();
    });

    file.addEventListener('change', function (ev) {
      attachError('');
      var f = ev.target.files && ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      if (f.size > MAX_FILE) {
        attachError(f.name + ' is larger than ' + size(MAX_FILE) +
          '. Put it somewhere and paste the address instead.');
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () { attachError('That file could not be read.'); };
      reader.onload = function () {
        held = { data: reader.result, size: f.size, type: f.type };
        if (!name.value.trim()) name.value = f.name.replace(/\.[^.]+$/, '');
        show();
      };
      reader.readAsDataURL(f);
    });

    row.querySelector('.drem').addEventListener('click', function () {
      row.remove();
      if (!attachrows.children.length) addAttachRow(null);
    });

    name.value = (a && a.name) || '';
    link.value = (a && a.link) || '';
    if (a && a.data) held = { data: a.data, size: a.size || 0, type: a.type || '' };
    show();

    attachrows.appendChild(row);
    row.held = function () { return held; };
    return row;
  }

  function readAttachRows() {
    return [].slice.call(attachrows.querySelectorAll('.afrow')).map(function (r) {
      var h = r.held();
      var a = { name: r.querySelector('.aname').value.trim() };
      if (h.data) { a.data = h.data; a.size = h.size; a.type = h.type; }
      else a.link = r.querySelector('.alink').value.trim();
      return a;
    }).filter(function (a) { return a.name && (a.data || a.link); });
  }

  /* ---- the month -----------------------------------------------------

     The same events as the list above, laid out as a month so a clash is
     obvious before it is made. The days either side of an event are marked
     too, because that is when the hall is tied up. */

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

  /* ---- opening and saving --------------------------------------------- */

  function gather(into) {
    var e = into || {};
    NAMES.forEach(function (k) { e[k] = F[k].value.trim(); });
    e.details = readRows();
    e.ticksellers = readTicketRows();
    e.attachments = readAttachRows();
    return e;
  }

  /* the saved list, which carries no dates and reaches no reader */
  function renderShelf() {
    slist.innerHTML = '';
    if (!saved.length) {
      var empty = document.createElement('li');
      empty.className = 'eempty';
      empty.textContent = 'Nothing is saved yet. Keep an event for re-use and it will be here.';
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

  function busy(on) {
    [].forEach.call(document.querySelectorAll('#eform button, .eactions button'),
      function (b) { b.disabled = !!on; });
    document.body.style.cursor = on ? 'progress' : '';
  }

  function show(which) {
    if (which === 'list') drawMonth();
    listview.hidden = which !== 'list';
    formview.hidden = which !== 'form';
    window.scrollTo(0, 0);
  }

  function clearErrors() {
    ERRS.forEach(function (k) {
      document.getElementById('e-' + k).hidden = true;
      if (F[k]) F[k].classList.remove('bad');
    });
  }

  function open(e, fromShelf) {
    editing = e;
    onShelf = !!fromShelf;
    clearErrors();
    confirmBox.hidden = true;
    document.getElementById('kept').hidden = true;
    document.getElementById('formhead').textContent =
      onShelf ? 'A saved event' : (e ? 'Change this event' : 'Add an event');
    document.getElementById('removebtn').hidden = !e;
    document.getElementById('removebtn').textContent =
      onShelf ? 'Remove from the saved list' : 'Remove this event';
    document.getElementById('calbtn').hidden = !onShelf;
    document.getElementById('keepbtn').hidden = onShelf;

    NAMES.forEach(function (k) { F[k].value = (e && e[k]) ? e[k] : ''; });

    drows.innerHTML = '';
    var details = (e && e.details) || [];
    if (details.length) {
      details.forEach(function (d) {
        /* events saved before a heading could say more than one thing */
        addGroup(d.label, d.values || (d.value ? [d.value] : ['']));
      });
    } else addGroup('', ['']);          // one heading, one line, and that is all

    attachrows.innerHTML = '';
    attachError('');
    var files = (e && e.attachments) || [];
    if (files.length) files.forEach(function (a) { addAttachRow(a); });
    else addAttachRow(null);

    tickrows.innerHTML = '';
    var sellers = (e && e.ticksellers) || [];
    if (sellers.length) sellers.forEach(function (x) { addTicketRow(x); });
    else addTicketRow(null);

    show('form');
    F.title.focus();
  }

  function fail(k) {
    document.getElementById('e-' + k).hidden = false;
    if (F[k]) F[k].classList.add('bad');
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearErrors();
    var ok = true;
    /* a saved event has no day yet, which is the point of it */
    (onShelf ? ['title'] : MUST).forEach(function (k) {
      if (!F[k].value.trim()) { fail(k); ok = false; }
    });
    if (!ok) { document.querySelector('.bad').focus(); return; }

    if (onShelf) {
      gather(editing);
      busy(true);
      D.savedSave(saved, 'Saved event: ' + editing.title).then(function () {
        busy(false); renderShelf(); show('list');
      }, function (err) { busy(false); attachError(err.message); });
      return;
    }

    var e = editing;
    if (!e) {
      e = { id: 'e' + Date.now() };
      events.push(e);
    }
    gather(e);
    if (!e.from) e.from = iso(today());
    e.until = plusDay(e.date);                  // off the website the day after

    busy(true);
    D.save(events, 'Event: ' + e.title).then(function () {
      busy(false);
      render();
      show('list');
    }, function (err) {
      busy(false);
      attachError(err.message);
    });
  });

  ERRS.forEach(function (k) {
    if (F[k]) {
      F[k].addEventListener('input', function () {
        document.getElementById('e-' + k).hidden = true;
        F[k].classList.remove('bad');
      });
    }
  });

  /* choosing the day fills the advertising window in, so nobody has to */
  F.date.addEventListener('change', function () {
    if (F.date.value && !F.from.value) F.from.value = iso(today());
  });

  /* a bare number is a number of dollars; anything else is left alone */
  F.tickprice.addEventListener('blur', function () {
    F.tickprice.value = D.priceText(F.tickprice.value);
  });

  document.getElementById('adattach').addEventListener('click', function () {
    addAttachRow(null).querySelector('.aname').focus();
  });

  document.getElementById('adtick').addEventListener('click', function () {
    addTicketRow(null).querySelector('.tkind').focus();
  });

  document.getElementById('addrow').addEventListener('click', function () {
    addGroup('', ['']).querySelector('.dlabel').focus();
  });
  /* keep what is on the form for re-use, without touching the calendar */
  document.getElementById('keepbtn').addEventListener('click', function () {
    clearErrors();
    if (!F.title.value.trim()) { fail('title'); F.title.focus(); return; }
    var copy = gather({ id: 's' + Date.now() });
    copy.date = ''; copy.from = ''; copy.until = '';   // a saved event has no day
    saved.push(copy);
    busy(true);
    D.savedSave(saved, 'Kept for re-use: ' + copy.title).then(function () {
      busy(false);
      renderShelf();
      document.getElementById('kept').hidden = false;
    }, function (err) { busy(false); saved.pop(); attachError(err.message); });
  });

  /* a saved event becomes a real one, and stays on the shelf */
  document.getElementById('calbtn').addEventListener('click', function () {
    clearErrors();
    var missing = false;
    MUST.forEach(function (k) {
      if (!F[k].value.trim()) { fail(k); missing = true; }
    });
    if (missing) { document.querySelector('.bad').focus(); return; }

    var e = gather({ id: 'e' + Date.now() });
    e.from = e.from || iso(today());
    e.until = plusDay(e.date);
    events.push(e);
    busy(true);
    D.save(events, 'Event: ' + e.title).then(function () {
      busy(false); render(); show('list');
    }, function (err) { busy(false); events.pop(); attachError(err.message); });
  });

  document.getElementById('addbtn').addEventListener('click', function () { open(null); });
  document.getElementById('cancelbtn').addEventListener('click', function () { show('list'); });
  document.getElementById('backbtn').addEventListener('click', function () { show('list'); });
  document.getElementById('removebtn').addEventListener('click', function () {
    confirmBox.hidden = false;
    document.getElementById('reallyremove').focus();
  });
  document.getElementById('keepit').addEventListener('click', function () {
    confirmBox.hidden = true;
    document.getElementById('removebtn').focus();
  });
  document.getElementById('reallyremove').addEventListener('click', function () {
    var name = editing.title;
    busy(true);
    var job;
    if (onShelf) {
      saved = saved.filter(function (x) { return x !== editing; });
      job = D.savedSave(saved, 'Removed from the saved list: ' + name).then(renderShelf);
    } else {
      events = events.filter(function (x) { return x !== editing; });
      job = D.save(events, 'Removed event: ' + name).then(render);
    }
    job.then(function () { busy(false); show('list'); },
             function (err) { busy(false); attachError(err.message); });
  });

  /* nothing is drawn until the repository has answered */
  Promise.all([D.load(), D.savedLoad()]).then(function (r) {
    events = r[0];
    saved = r[1];
    render();
    renderShelf();
    drawMonth();
  });
})();
