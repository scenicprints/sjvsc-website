/* The events screen. The list itself lives in events-data.js, which the
   public pages read too, so a change here is the change they see.

   Edits are kept in this browser only — nothing is sent anywhere and no
   other visitor sees them. That is the right trade for a demo; the real
   version writes to the club's account behind the same screens. */

(function () {
  var D = window.SJVSC;
  var events = D.all();

  var listview = document.getElementById('listview');
  var formview = document.getElementById('formview');
  var list = document.getElementById('elist');
  var form = document.getElementById('eform');
  var confirmBox = document.getElementById('confirm');
  var drows = document.getElementById('drows');
  var tickrows = document.getElementById('tickrows');
  var filelist = document.getElementById('filelist');
  var editing = null;

  /* the plain fields; details rows and attachments are their own thing */
  var NAMES = ['title', 'note', 'page', 'desc', 'agenda', 'image', 'date', 'time', 'from',
               'tickfrom', 'tickto', 'tickprice'];
  var MUST = ['title', 'date'];
  var ERRS = ['title', 'date', 'image', 'attach'];
  var F = {};
  NAMES.forEach(function (k) { F[k] = document.getElementById('f-' + k); });

  var attachments = [];

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
        '<span class="estand ' + s.cls + '"></span></span>' +
        '<button class="abtn" type="button">Change</button>';
      li.querySelector('.ewhen b').textContent = at(e.date).getDate();
      li.querySelector('.ewhen i').textContent = D.MONTH[at(e.date).getMonth()].slice(0, 3);
      li.querySelector('.ebody b').textContent = e.title;
      li.querySelector('.enote').textContent = dayName(e.date) + (e.time ? ', ' + e.time : '');
      li.querySelector('.estand').textContent = s.text;
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

  /* ---- attachments --------------------------------------------------- */

  var MAX_FILE = 400 * 1024;

  function drawFiles() {
    filelist.innerHTML = '';
    attachments.forEach(function (f, i) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="fname"></span><span class="fsize"></span>' +
        '<button class="abtn small" type="button">Remove</button>';
      li.querySelector('.fname').textContent = f.name;
      li.querySelector('.fsize').textContent = size(f.size);
      li.querySelector('button').addEventListener('click', function () {
        attachments.splice(i, 1);
        drawFiles();
      });
      filelist.appendChild(li);
    });
  }

  function attachError(msg) {
    var el = document.getElementById('e-attach');
    el.textContent = msg;
    el.hidden = false;
  }

  document.getElementById('f-attachfiles').addEventListener('change', function (ev) {
    document.getElementById('e-attach').hidden = true;
    var files = [].slice.call(ev.target.files || []);
    var toobig = files.filter(function (f) { return f.size > MAX_FILE; });
    files.filter(function (f) { return f.size <= MAX_FILE; }).forEach(function (f) {
      var reader = new FileReader();
      reader.onload = function () {
        attachments.push({ name: f.name, size: f.size, type: f.type, data: reader.result });
        drawFiles();
      };
      reader.readAsDataURL(f);
    });
    if (toobig.length) {
      attachError(toobig.map(function (f) { return f.name; }).join(', ')
        + (toobig.length === 1 ? ' is' : ' are') + ' larger than ' + size(MAX_FILE)
        + '. This demo keeps files in the browser, which has little room.');
    }
    ev.target.value = '';
  });

  /* ---- the picture ---------------------------------------------------- */

  var MAX = 1000, QUALITY = 0.72;
  var prev = document.getElementById('imgprev');
  var prevImg = document.getElementById('imgprevimg');

  function showPicture(src) {
    F.image.value = src || '';
    prevImg.src = src || '';
    prev.hidden = !src;
  }

  document.getElementById('f-imagefile').addEventListener('change', function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    document.getElementById('e-image').hidden = true;
    var reader = new FileReader();
    reader.onerror = function () { document.getElementById('e-image').hidden = false; };
    reader.onload = function () {
      var img = new Image();
      img.onerror = function () { document.getElementById('e-image').hidden = false; };
      img.onload = function () {
        var w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        showPicture(c.toDataURL('image/jpeg', QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('imgclear').addEventListener('click', function () {
    showPicture('');
    document.getElementById('f-imagefile').value = '';
  });

  /* ---- opening and saving --------------------------------------------- */

  function show(which) {
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

  function open(e) {
    editing = e;
    clearErrors();
    confirmBox.hidden = true;
    document.getElementById('formhead').textContent = e ? 'Change this event' : 'Add an event';
    document.getElementById('removebtn').hidden = !e;

    NAMES.forEach(function (k) { F[k].value = (e && e[k]) ? e[k] : ''; });
    document.getElementById('f-imagefile').value = '';
    showPicture(e && e.image ? e.image : '');

    drows.innerHTML = '';
    var details = (e && e.details) || [];
    if (details.length) {
      details.forEach(function (d) {
        /* events saved before a heading could say more than one thing */
        addGroup(d.label, d.values || (d.value ? [d.value] : ['']));
      });
    } else addGroup('', ['']);          // one heading, one line, and that is all

    attachments = (e && e.attachments) ? e.attachments.slice() : [];
    document.getElementById('f-attachfiles').value = '';
    drawFiles();

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
    MUST.forEach(function (k) {
      if (!F[k].value.trim()) { fail(k); ok = false; }
    });
    if (!ok) { document.querySelector('.bad').focus(); return; }

    var e = editing;
    if (!e) {
      e = { id: 'e' + Date.now() };
      events.push(e);
    }
    NAMES.forEach(function (k) { e[k] = F[k].value.trim(); });
    e.details = readRows();
    e.ticksellers = readTicketRows();
    e.attachments = attachments.slice();
    if (!e.from) e.from = iso(today());
    e.until = plusDay(e.date);                  // off the website the day after

    if (!D.save(events)) {
      attachError('There is no room left to keep all of this. '
        + 'Remove a file, or choose a smaller picture.');
      return;
    }
    render();
    show('list');
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

  document.getElementById('adtick').addEventListener('click', function () {
    addTicketRow(null).querySelector('.tkind').focus();
  });

  document.getElementById('addrow').addEventListener('click', function () {
    addGroup('', ['']).querySelector('.dlabel').focus();
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
    events = events.filter(function (x) { return x !== editing; });
    D.save(events);
    render();
    show('list');
  });

  render();
})();
