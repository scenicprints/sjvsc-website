/* The galleries at the foot of the event pages.

   A gallery is a set of bands running the full width of the window, which
   nothing else on this site does. Band one travels one way as the page is
   scrolled past it and band two travels the other, so the whole thing weaves.
   A band holds six photographs, so a ninth photograph puts out a second band
   and a thirteenth a third: the gallery grows a row rather than shrinking its
   pictures.

   A band narrower than the window is repeated until it overflows, because a
   band with nothing to travel cannot travel. The repeats are hidden from a
   screen reader, which is read the originals once.

   The pictures are files in assets/img/gallery, named in data/gallery.json.
   Both are added in the repository. */

window.SJVSC_GALLERY = (function () {
  var PER_BAND = 6;
  var MAX_PER_PAGE = 18;          // three bands, and all the room there is

  var PAGES = [
    { id: 'schwingers',   name: 'Schwinger’s Club',             page: 'schwingers-club.html' },
    { id: 'echoes',       name: 'Swiss Echoes',                      page: 'swiss-echoes.html' },
    { id: 'camp',         name: 'Kids Swiss Camp',                   page: 'kids-swiss-camp.html' },
    { id: 'schwingen',    name: 'Schwingen',                        page: 'schwingen.html' },
    { id: 'schwingfests', name: 'Schwingfests',                      page: 'event-schwingfest.html' },
    { id: 'bbq',          name: 'Members’ BBQ',                 page: 'members-bbq.html' },
    { id: 'oktoberfest',  name: 'Oktoberfest',                       page: 'event-oktoberfest.html' },
    { id: 'jass',         name: 'Jass',                              page: 'event-jass.html' },
    { id: 'almond',       name: 'Almond Blossom Parade and Dance',   page: 'almond-blossom.html' },
    { id: 'christmas',    name: 'Children’s Christmas Party',        page: 'event-childrens-christmas.html' },
    { id: 'agm',          name: 'Annual General Meeting',            page: 'event-agm.html' }
  ];

  /* The club's own photographs, which ship with the site so the galleries are
     not empty before anybody has touched the admin. Captions say what is in
     the picture and nothing more. */
  var SEED = {
    jass: [
      { src: 'assets/img/gallery/jass/625155681_10162035741157115_5195594238666282201_n.jpg',
        caption: 'Two long tables of players, from the balcony' },
      { src: 'assets/img/gallery/jass/1.jpg',
        caption: 'Down one table, under the cantonal banners' },
      { src: 'assets/img/gallery/jass/627052229_10162035740927115_7641524305463186698_n.jpg',
        caption: 'A hand being played at the end of the table' }
    ],
    echoes: [
      { src: 'assets/img/gallery/echoes/490833321_10160881230237115_8635471491323325700_n.jpg',
        caption: 'The chorus singing in front of the painted chalet' }
    ],
    almond: [
      { src: 'assets/img/gallery/almond/parade.jpg',
        caption: 'The children in front of the float before the parade' },
      { src: 'assets/img/gallery/almond/641363532_10162113973852115_5652174582833194970_n.jpg',
        caption: 'The boys in the chalet on the float' },
      { src: 'assets/img/gallery/almond/637321839_10162113973722115_2167513429647338266_n.jpg',
        caption: 'Sat on the back of the float, with the cowbell' },
      { src: 'assets/img/gallery/almond/641311169_10162113973727115_7673311204173951468_n.jpg',
        caption: 'Two of the girls in front of the float' }
    ]
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var MAP = clone(SEED);

  function all() { return MAP; }

  function load() {
    return window.SJVSC_STORE.read('gallery', SEED).then(function (m) {
      MAP = m && typeof m === 'object' ? m : clone(SEED);
      return MAP;
    });
  }


  function pics(tie) { return all()[tie] || []; }

  /* ---- the viewer ----------------------------------------------------- */

  var view = null, viewList = [], viewAt = 0, cameFrom = null;

  function buildViewer() {
    if (view) return view;
    view = document.createElement('div');
    view.className = 'gview';
    view.setAttribute('role', 'dialog');
    view.setAttribute('aria-modal', 'true');
    view.setAttribute('aria-label', 'Photograph');
    view.innerHTML =
      '<button class="gv-shut" type="button" aria-label="Close">Close</button>' +
      '<button class="gv-step gv-prev" type="button" aria-label="The one before">&#8592;</button>' +
      '<figure class="gv-stage"><img alt=""><figcaption></figcaption></figure>' +
      '<button class="gv-step gv-next" type="button" aria-label="The one after">&#8594;</button>' +
      '<div class="gv-rail" role="tablist" aria-label="The rest of the photographs"></div>';
    document.body.appendChild(view);

    view.querySelector('.gv-shut').addEventListener('click', shut);
    view.querySelector('.gv-prev').addEventListener('click', function () { step(-1); });
    view.querySelector('.gv-next').addEventListener('click', function () { step(1); });
    view.addEventListener('click', function (e) { if (e.target === view) shut(); });
    document.addEventListener('keydown', function (e) {
      if (!view || view.hidden) return;
      if (e.key === 'Escape') shut();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });
    return view;
  }

  function drawViewer() {
    var p = viewList[viewAt];
    var img = view.querySelector('img');
    img.src = p.src;
    img.alt = p.caption || 'A photograph from the club';
    view.querySelector('figcaption').textContent =
      (viewAt + 1) + ' of ' + viewList.length + (p.caption ? '  ·  ' + p.caption : '');
    [].forEach.call(view.querySelectorAll('.gv-rail button'), function (b, i) {
      if (i === viewAt) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
    var on = view.querySelector('.gv-rail [aria-current]');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function step(by) {
    viewAt = (viewAt + by + viewList.length) % viewList.length;
    drawViewer();
  }

  function shut() {
    view.hidden = true;
    document.documentElement.classList.remove('gv-open');
    if (cameFrom && cameFrom.focus) cameFrom.focus();
  }

  function openViewer(listOfPics, at, from) {
    buildViewer();
    viewList = listOfPics; viewAt = at; cameFrom = from || null;
    var rail = view.querySelector('.gv-rail');
    rail.innerHTML = '';
    viewList.forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.style.backgroundImage = 'url(' + p.src + ')';
      b.setAttribute('aria-label', 'Photograph ' + (i + 1) +
        (p.caption ? ': ' + p.caption : ''));
      b.addEventListener('click', function () { viewAt = i; drawViewer(); });
      rail.appendChild(b);
    });
    view.hidden = false;
    document.documentElement.classList.add('gv-open');
    drawViewer();
    view.querySelector('.gv-shut').focus();
  }

  /* ---- the bands ------------------------------------------------------ */

  function bandsFor(n) { return Math.max(1, Math.ceil(n / PER_BAND)); }

  function shot(p, i, offset) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'gb-shot';
    var img = document.createElement('img');
    img.src = p.src;
    img.alt = p.caption || 'A photograph from the club';
    b.appendChild(img);
    b.setAttribute('aria-label', 'Open photograph ' + (offset + i + 1));
    b.addEventListener('click', function () {
      openViewer(window.SJVSC_GALLERY.shown, offset + i, b);
    });
    return b;
  }

  /* Each photograph appears once. A band only travels if its own pictures are
     already wider than the window, and then the set is doubled so the loop
     joins without a seam. A band that fits is spread across the full width and
     holds still: a row of four photographs repeated to make something move is
     worse than a row of four photographs. */
  function layOut(band, list, offset) {
    var run = band.querySelector('.gb-run');
    run.innerHTML = '';
    list.forEach(function (p, i) { run.appendChild(shot(p, i, offset)); });

    band.classList.remove('gb-fit');
    band.dataset.span = '0';
    var span = run.scrollWidth;
    if (span <= band.clientWidth + 4) {
      band.classList.add('gb-fit');      // fills the width, nothing to travel
      return false;
    }
    /* doubled, so wrapping at one set's width is invisible */
    list.forEach(function (p, i) {
      var copy = shot(p, i, offset);
      copy.setAttribute('aria-hidden', 'true');
      copy.tabIndex = -1;
      copy.querySelector('img').alt = '';
      run.appendChild(copy);
    });
    band.dataset.span = String(span);
    return true;
  }

  function drive(bands) {
    var moving = bands.filter(function (b) { return +b.dataset.span > 0; });
    if (!moving.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var held = 0;
    moving.forEach(function (band, i) {
      band.dataset.at = i % 2 ? band.dataset.span : '0';
      ['pointerdown', 'wheel', 'touchstart'].forEach(function (ev) {
        band.addEventListener(ev, function () {
          held = Date.now();
          band.dataset.at = String(band.scrollLeft);
        }, { passive: true });
      });
    });

    /* a timer rather than requestAnimationFrame, which does not run in a
       minimised window. The timeline on the home page has the same note. */
    var STEP = 40, PACE = 2.4;        // about 60 pixels a second
    setInterval(function () {
      if (Date.now() - held < 2500) return;
      moving.forEach(function (band, i) {
        var span = +band.dataset.span;
        if (!span) return;
        var at = +band.dataset.at + (i % 2 ? -PACE : PACE);
        if (at >= span) at -= span;
        if (at < 0) at += span;
        band.dataset.at = String(at);
        band.scrollLeft = at;
      });
    }, STEP);
  }

  function render() {
    [].forEach.call(document.querySelectorAll('[data-gallery]'), function (host) {
      var list = pics(host.getAttribute('data-gallery'));
      var sec = host.closest ? (host.closest('.gsec') || host) : host;
      host.innerHTML = '';
      if (!list.length) { sec.hidden = true; return; }
      sec.hidden = false;
      host.hidden = false;
      window.SJVSC_GALLERY.shown = list;

      var bands = [];
      for (var i = 0; i < bandsFor(list.length); i++) {
        var slice = list.slice(i * PER_BAND, (i + 1) * PER_BAND);
        if (!slice.length) break;
        var band = document.createElement('div');
        band.className = 'gband';
        band.appendChild(document.createElement('div')).className = 'gb-run';
        host.appendChild(band);
        layOut(band, slice, i * PER_BAND);
        bands.push(band);
      }
      drive(bands);

      /* the window changing width can turn a band that fitted into one that
         travels, and the other way about */
      var again;
      window.addEventListener('resize', function () {
        clearTimeout(again);
        again = setTimeout(function () { render(); }, 200);
      }, { once: true });
    });
  }

  /* the pages wait for data/gallery.json, then draw the bands */
  if (typeof document !== 'undefined' && !window.SJVSC_ADMIN) {
    load().then(render);
  }

  return { PAGES: PAGES, SEED: SEED, PER_BAND: PER_BAND, MAX_PER_PAGE: MAX_PER_PAGE,
           all: all, load: load, pics: pics,
           bandsFor: bandsFor, render: render, openViewer: openViewer, shown: [] };
}());
