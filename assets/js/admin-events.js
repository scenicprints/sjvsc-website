/* The events screen.

   Edits are kept in this browser only — nothing is sent anywhere and no
   other visitor sees them. That is the right trade for a demo; the real
   version writes to the club's own account behind the same screens.

   The public pages still carry their events as markup, so saving here does
   not change them yet. Wiring those to this data is the next piece. */

(function () {
  var KEY = 'sjvsc.events.v1';

  var SEED = [
    { id: 'jass-fall', title: 'Fall Jass Party',
      note: 'The Swiss card game. Sunday afternoon at the hall.',
      date: '2026-11-15', time: '', from: '2026-09-20', until: '2026-11-16' },
    { id: 'childrens-christmas', title: "Children's Christmas Party",
      note: "For members' children and grandchildren.",
      date: '2026-12-05', time: '', from: '2026-10-10', until: '2026-12-06' },
    { id: 'agm', title: 'Annual General Meeting',
      note: 'Officers are elected. All members may attend.',
      date: '2026-12-10', time: '7pm', from: '2026-10-15', until: '2026-12-11' },
    { id: 'echoes-christmas', title: 'Swiss Echoes Christmas Party',
      note: 'Carols, supper and a dance.',
      date: '2026-12-12', time: '', from: '2026-10-17', until: '2026-12-13' }
  ];

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* private window, blocked storage: fall back to the seed */ }
    return SEED.slice();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(events)); } catch (e) {}
  }

  var events = load();

  var listview = document.getElementById('listview');
  var formview = document.getElementById('formview');
  var list = document.getElementById('elist');
  var form = document.getElementById('eform');
  var confirmBox = document.getElementById('confirm');
  var editing = null;

  var F = {
    title: document.getElementById('f-title'), note: document.getElementById('f-note'),
    date: document.getElementById('f-date'), time: document.getElementById('f-time'),
    from: document.getElementById('f-from'), until: document.getElementById('f-until')
  };

  function at(s) { var p = (s || '').split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function pretty(s) {
    if (!s) return '';
    return at(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function dayName(s) {
    return at(s).toLocaleDateString('en-GB',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

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
      li.querySelector('.ewhen i').textContent =
        at(e.date).toLocaleDateString('en-GB', { month: 'short' });
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

  function clearErrors() {
    ['title', 'date', 'from', 'until'].forEach(function (k) {
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
    F.title.value = e ? e.title : '';
    F.note.value = e ? e.note : '';
    F.date.value = e ? e.date : '';
    F.time.value = e ? e.time : '';
    F.from.value = e ? e.from : '';
    F.until.value = e ? e.until : '';
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
    if (!F.title.value.trim()) { fail('title'); ok = false; }
    if (!F.date.value) { fail('date'); ok = false; }
    if (!F.from.value) { fail('from'); ok = false; }
    if (!F.until.value || (F.from.value && F.until.value <= F.from.value)) {
      fail('until'); ok = false;
    }
    if (!ok) { document.querySelector('.bad').focus(); return; }

    var e = editing;
    if (!e) {
      e = { id: 'e' + Date.now() };
      events.push(e);
    }
    e.title = F.title.value.trim();
    e.note = F.note.value.trim();
    e.date = F.date.value;
    e.time = F.time.value.trim();
    e.from = F.from.value;
    e.until = F.until.value;
    save();
    render();
    show('list');
  });

  ['title', 'date', 'from', 'until'].forEach(function (k) {
    F[k].addEventListener('input', function () {
      document.getElementById('e-' + k).hidden = true;
      F[k].classList.remove('bad');
    });
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
