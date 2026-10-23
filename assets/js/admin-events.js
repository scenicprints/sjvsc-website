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
  var filelist = document.getElementById('filelist');
  var editing = null;

  /* the plain fields; details rows and attachments are their own thing */
  var NAMES = ['title', 'note', 'desc', 'agenda', 'image', 'date', 'time', 'from'];
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

  /* ---- details: the club writes its own headings --------------------- */

  function addRow(label, value) {
    var row = document.createElement('div');
    row.className = 'drow';
    row.innerHTML =
      '<input type="text" class="dlabel" list="commonlabels" placeholder="Where" ' +
      'aria-label="Heading" autocomplete="off">' +
      '<input type="text" class="dvalue" placeholder="110 N. Manley Road, Ripon" ' +
      'aria-label="What it says" autocomplete="off">' +
      '<button class="abtn small drem" type="button">Remove</button>';
    row.querySelector('.dlabel').value = label || '';
    row.querySelector('.dvalue').value = value || '';
    row.querySelector('.drem').addEventListener('click', function () {
      row.remove();
      if (!drows.children.length) addRow('', '');
    });
    drows.appendChild(row);
    return row;
  }

  function readRows() {
    return [].slice.call(drows.querySelectorAll('.drow')).map(function (r) {
      return { label: r.querySelector('.dlabel').value.trim(),
               value: r.querySelector('.dvalue').value.trim() };
    }).filter(function (d) { return d.label || d.value; });   // blank rows are ignored
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
    if (details.length) details.forEach(function (d) { addRow(d.label, d.value); });
    else { addRow('', ''); addRow('', ''); addRow('', ''); }

    attachments = (e && e.attachments) ? e.attachments.slice() : [];
    document.getElementById('f-attachfiles').value = '';
    drawFiles();

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

  document.getElementById('addrow').addEventListener('click', function () {
    addRow('', '').querySelector('.dlabel').focus();
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
