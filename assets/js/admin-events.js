/* The events screen. The list itself lives in events-data.js, which the
   public pages read too, so a change here is the change they see.

   Edits are kept in this browser only — nothing is sent anywhere and no
   other visitor sees them. That is the right trade for a demo; the real
   version writes to the club's account behind the same screens. */

(function () {
  var D = window.SJVSC;
  var events = D.all();
  function save() { D.save(events); }

  var listview = document.getElementById('listview');
  var formview = document.getElementById('formview');
  var list = document.getElementById('elist');
  var form = document.getElementById('eform');
  var confirmBox = document.getElementById('confirm');
  var editing = null;

  /* every field on the form; only title and date have to be filled in */
  var NAMES = ['title', 'note', 'desc', 'agenda', 'papers', 'image', 'date', 'time',
               'where', 'who', 'contact', 'price', 'attach', 'from', 'until'];
  var MUST = ['title', 'date'];
  var F = {};
  NAMES.forEach(function (k) { F[k] = document.getElementById('f-' + k); });

  function iso(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
      + '-' + ('0' + d.getDate()).slice(-2);
  }
  function plusDay(s) { var d = at(s); d.setDate(d.getDate() + 1); return iso(d); }

  var at = D.at, today = D.today;
  function pretty(s) { return s ? D.pretty(s) : ''; }
  var dayName = D.fullDate;

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
      li.querySelector('.enote').textContent =
        dayName(e.date) + (e.time ? ', ' + e.time : '');
      li.querySelector('.estand').textContent = s.text;
      li.querySelector('button').addEventListener('click', function () { open(e); });
      list.appendChild(li);
    });
  }

  function show(which) {
    listview.hidden = which !== 'list';
    formview.hidden = which !== 'form';
    window.scrollTo(0, 0);
  }

  var ERRS = ['title', 'date', 'until'];
  function clearErrors() {
    ERRS.forEach(function (k) {
      document.getElementById('e-' + k).hidden = true;
      F[k].classList.remove('bad');
    });
  }

  function open(e) {
    editing = e;
    clearErrors();
    confirmBox.hidden = true;
    document.getElementById('formhead').textContent = e ? 'Change this event' : 'Add an event';
    document.getElementById('removebtn').hidden = !e;
    NAMES.forEach(function (k) { F[k].value = (e && e[k]) ? e[k] : ''; });
    show('form');
    F.title.focus();
  }

  function fail(k) {
    document.getElementById('e-' + k).hidden = false;
    F[k].classList.add('bad');
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearErrors();
    var ok = true;
    MUST.forEach(function (k) {
      if (!F[k].value.trim()) { fail(k); ok = false; }
    });
    if (F.from.value && F.until.value && F.until.value <= F.from.value) {
      fail('until'); ok = false;
    }
    if (!ok) { document.querySelector('.bad').focus(); return; }

    var e = editing;
    if (!e) {
      e = { id: 'e' + Date.now() };
      events.push(e);
    }
    NAMES.forEach(function (k) { e[k] = F[k].value.trim(); });
    // left blank, the advertising window still has to mean something
    if (!e.from) e.from = iso(today());
    if (!e.until) e.until = plusDay(e.date);
    save();
    render();
    show('list');
  });

  ERRS.forEach(function (k) {
    F[k].addEventListener('input', function () {
      document.getElementById('e-' + k).hidden = true;
      F[k].classList.remove('bad');
    });
  });

  /* choosing the day fills the advertising window in, so nobody has to */
  F.date.addEventListener('change', function () {
    if (!F.date.value) return;
    if (!F.from.value) F.from.value = iso(today());
    if (!F.until.value) F.until.value = plusDay(F.date.value);
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
    save();
    render();
    show('list');
  });

  render();
})();
