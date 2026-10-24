/* The pictures screen. One page at a time: add photographs, caption them,
   move them about, take them out. The order here is the order the bands run
   in, and every sixth picture puts out another band.

   Nothing is written until Save, so a wrong file can be taken out again
   before it reaches the website. */

(function () {
  var G = window.SJVSC_GALLERY;
  var store = G.all();

  var pickview = document.getElementById('pickview');
  var editview = document.getElementById('editview');
  var picklist = document.getElementById('picklist');
  var glist = document.getElementById('glist');
  var gerr = document.getElementById('gerr');
  var gsaved = document.getElementById('gsaved');

  var page = null;          // the page being worked on
  var pics = [];            // its pictures, until Save
  var clean = '';           // what was on the page when it was opened

  function show(which) {
    pickview.hidden = which !== 'pick';
    editview.hidden = which !== 'edit';
    window.scrollTo(0, 0);
  }

  function say(msg) {
    gerr.textContent = msg || '';
    gerr.hidden = !msg;
  }

  function bandWord(n) {
    var b = G.bandsFor(n);
    if (!n) return 'No pictures yet.';
    return n + (n === 1 ? ' picture' : ' pictures') + ', which makes ' +
      b + (b === 1 ? ' band' : ' bands') + '.';
  }

  /* ---- the eight pages ------------------------------------------------ */

  function drawPick() {
    picklist.innerHTML = '';
    G.PAGES.forEach(function (p) {
      var n = (store[p.id] || []).length;
      var row = document.createElement('button');
      row.className = 'arow';
      row.type = 'button';
      row.innerHTML =
        '<span class="aic" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' +
        '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m5 16 4.5-5 3.5 4 2.5-3 3.5 4"/>' +
        '<circle cx="9" cy="9.5" r="1.4"/></svg></span>' +
        '<span class="abody"><b></b><span></span></span>' +
        '<span class="ago" aria-hidden="true">Open &#8594;</span>';
      row.querySelector('.abody b').textContent = p.name;
      row.querySelector('.abody span').textContent = bandWord(n);
      row.addEventListener('click', function () { open(p); });
      picklist.appendChild(row);
    });
  }

  /* ---- one page's pictures -------------------------------------------- */

  function draw() {
    glist.innerHTML = '';
    document.getElementById('glead').textContent =
      bandWord(pics.length) + ' Up to ' + G.MAX_PER_PAGE + ', and the first one leads.';

    if (!pics.length) {
      var li = document.createElement('li');
      li.className = 'eempty';
      li.textContent = 'Nothing here yet. Add a picture and it will appear at the foot of the page.';
      glist.appendChild(li);
      return;
    }

    pics.forEach(function (p, i) {
      var li = document.createElement('li');
      li.className = 'gitem';
      li.innerHTML =
        '<span class="gnum"></span>' +
        '<img alt="">' +
        '<span class="gcap"><label></label><input type="text" autocomplete="off"></span>' +
        '<span class="gmove">' +
        '<button class="abtn small" type="button" aria-label="Move it earlier">&#8593;</button>' +
        '<button class="abtn small" type="button" aria-label="Move it later">&#8595;</button>' +
        '</span>' +
        '<button class="abtn small danger" type="button">Remove</button>';

      li.querySelector('.gnum').textContent = ('0' + (i + 1)).slice(-2);
      var img = li.querySelector('img');
      img.src = p.src;
      img.alt = p.caption || 'Picture ' + (i + 1);

      var id = 'gcap' + i;
      var lab = li.querySelector('label');
      lab.textContent = 'What it shows';
      lab.setAttribute('for', id);
      var box = li.querySelector('input');
      box.id = id;
      box.value = p.caption || '';
      box.placeholder = 'The hall set for the Schwinger Dinner';
      box.addEventListener('input', function () { p.caption = box.value; });

      var moves = li.querySelectorAll('.gmove button');
      moves[0].disabled = i === 0;
      moves[1].disabled = i === pics.length - 1;
      moves[0].addEventListener('click', function () { swap(i, i - 1); });
      moves[1].addEventListener('click', function () { swap(i, i + 1); });

      li.querySelector('.danger').addEventListener('click', function () {
        pics.splice(i, 1);
        draw();
      });

      glist.appendChild(li);
    });
  }

  function swap(a, b) {
    var t = pics[a]; pics[a] = pics[b]; pics[b] = t;
    draw();
  }

  function mark() { clean = JSON.stringify(pics); }
  function dirty() { return JSON.stringify(pics) !== clean; }

  function open(p) {
    page = p;
    pics = (store[p.id] || []).map(function (x) { return { src: x.src, caption: x.caption }; });
    mark();
    document.getElementById('ghead').textContent = p.name;
    document.getElementById('gsee').href = p.page;
    say('');
    gsaved.hidden = true;
    draw();
    show('edit');
  }

  /* ---- adding ---------------------------------------------------------- */

  document.getElementById('gfiles').addEventListener('change', function (ev) {
    var files = [].slice.call(ev.target.files || []);
    ev.target.value = '';
    if (!files.length) return;
    say('');
    gsaved.hidden = true;

    var room = G.MAX_PER_PAGE - pics.length;
    if (room <= 0) {
      say('This page already holds ' + G.MAX_PER_PAGE + ' pictures, which is all there is room for.');
      return;
    }
    var taking = files.slice(0, room);
    var over = files.length - taking.length;
    var left = taking.length;

    taking.forEach(function (file) {
      G.shrink(file, function (src) {
        pics.push({ src: src, caption: '' });
        if (!--left) {
          draw();
          if (over) say(over + (over === 1 ? ' picture was' : ' pictures were') +
            ' left out, because this page holds ' + G.MAX_PER_PAGE + '.');
        }
      }, function () {
        if (!--left) draw();
        say('One of those could not be read as a picture.');
      });
    });
  });

  /* ---- saving ---------------------------------------------------------- */

  document.getElementById('gsave').addEventListener('click', function () {
    say('');
    var next = G.all();
    if (pics.length) next[page.id] = pics;
    else delete next[page.id];

    if (!G.save(next)) {
      say('There is no room left to keep all of this. Take a picture out and try again.');
      return;
    }
    store = next;
    mark();
    gsaved.hidden = false;
    drawPick();
  });

  document.getElementById('gclear').addEventListener('click', function () {
    pics = [];
    draw();
    say('');
    gsaved.hidden = true;
  });

  document.getElementById('gback').addEventListener('click', function () {
    if (dirty() && !window.confirm(
        'You have changed the pictures on this page and not saved them.\n\n' +
        'Go back and lose the changes?')) return;
    drawPick();
    show('pick');
  });

  /* closing the tab with pictures unsaved */
  window.addEventListener('beforeunload', function (ev) {
    if (editview.hidden || !dirty()) return;
    ev.preventDefault();
    ev.returnValue = '';
  });

  drawPick();
  show('pick');
}());
