/* The pictures screen. One page at a time: what is on it, in the order the
   bands run in, with every sixth picture putting out another band.

   It reads data/gallery.json and shows what is in it. Pictures are added by
   putting the files in assets/img/gallery and naming them in that file, in
   the repository. */

(function () {
  var G = window.SJVSC_GALLERY;
  var store = G.all();           // replaced once the repository answers

  var pickview = document.getElementById('pickview');
  var editview = document.getElementById('editview');
  var picklist = document.getElementById('picklist');
  var glist = document.getElementById('glist');

  var pics = [];

  function show(which) {
    pickview.hidden = which !== 'pick';
    editview.hidden = which !== 'edit';
    window.scrollTo(0, 0);
  }

  function bandWord(n) {
    var b = G.bandsFor(n);
    if (!n) return 'No pictures yet.';
    return n + (n === 1 ? ' picture' : ' pictures') + ', which makes ' +
      b + (b === 1 ? ' band' : ' bands') + '.';
  }

  /* ---- the nine pages ------------------------------------------------ */

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
      li.textContent = 'Nothing here yet, so this page carries no band at all.';
      glist.appendChild(li);
      return;
    }

    pics.forEach(function (p, i) {
      var li = document.createElement('li');
      li.className = 'gitem';
      li.innerHTML =
        '<span class="gnum"></span>' +
        '<img alt="">' +
        '<span class="gcap"><b></b><span class="val"></span></span>';

      li.querySelector('.gnum').textContent = ('0' + (i + 1)).slice(-2);
      var img = li.querySelector('img');
      img.src = p.src;
      img.alt = p.caption || 'Picture ' + (i + 1);

      li.querySelector('.gcap b').textContent = 'What it shows';
      li.querySelector('.gcap .val').textContent = p.caption || '';

      glist.appendChild(li);
    });
  }

  function open(p) {
    pics = (store[p.id] || []).map(function (x) { return { src: x.src, caption: x.caption }; });
    document.getElementById('ghead').textContent = p.name;
    document.getElementById('gsee').href = p.page;
    draw();
    show('edit');
  }

  document.getElementById('gback').addEventListener('click', function () {
    drawPick();
    show('pick');
  });

  G.load().then(function (m) {
    store = m;
    drawPick();
    show('pick');
  });
}());
