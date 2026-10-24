/* The galleries at the foot of the eight event pages, and the admin store
   behind them.

   A gallery is a set of bands running the full width of the window, which
   nothing else on this site does. Band one travels one way as the page is
   scrolled past it and band two travels the other, so the whole thing weaves.
   A band holds six photographs, so a ninth photograph puts out a second band
   and a thirteenth a third: the gallery grows a row rather than shrinking its
   pictures.

   A band narrower than the window is repeated until it overflows, because a
   band with nothing to travel cannot travel. The repeats are hidden from a
   screen reader, which is read the originals once.

   In this demo the pictures live in the browser. The real version keeps them
   in the club's account; nothing on these pages would change. */

window.SJVSC_GALLERY = (function () {
  var KEY = 'sjvsc.gallery.v1';
  var PER_BAND = 6;
  var MAX_PER_PAGE = 18;          // three bands, and all the room there is
  var MAX_WIDTH = 1100, QUALITY = 0.7;

  var PAGES = [
    { id: 'schwingers',   name: 'Schwinger’s Club',             page: 'schwingers-club.html' },
    { id: 'echoes',       name: 'Swiss Echoes',                      page: 'swiss-echoes.html' },
    { id: 'camp',         name: 'Kids Swiss Camp',                   page: 'kids-swiss-camp.html' },
    { id: 'schwingfests', name: 'Schwingfests',                      page: 'event-schwingfest.html' },
    { id: 'bbq',          name: 'Members’ BBQ',                 page: 'members-bbq.html' },
    { id: 'oktoberfest',  name: 'Oktoberfest',                       page: 'event-oktoberfest.html' },
    { id: 'jass',         name: 'Jass',                              page: 'event-jass.html' },
    { id: 'almond',       name: 'Almond Blossom Parade and Dance',   page: 'almond-blossom.html' }
  ];

  function all() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function save(map) {
    try { localStorage.setItem(KEY, JSON.stringify(map)); return true; }
    catch (e) { return false; }
  }
  function pics(tie) { return all()[tie] || []; }

  /* pictures are made small before they are kept, or eight galleries will
     not fit in the room a browser gives this */
  function shrink(file, done, fail) {
    var reader = new FileReader();
    reader.onerror = fail;
    reader.onload = function () {
      var img = new Image();
      img.onerror = fail;
      img.onload = function () {
        var w = img.width, h = img.height;
        if (w > MAX_WIDTH) { h = Math.round(h * MAX_WIDTH / w); w = MAX_WIDTH; }
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        done(c.toDataURL('image/jpeg', QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

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

  function fill(band, list, offset) {
    var run = document.createElement('div');
    run.className = 'gb-run';
    /* enough copies that the band always has somewhere to travel */
    for (var copy = 0; copy < 4; copy++) {
      list.forEach(function (p, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'gb-shot';
        var img = document.createElement('img');
        img.src = p.src;
        img.alt = copy ? '' : (p.caption || 'A photograph from the club');
        img.loading = 'lazy';
        b.appendChild(img);
        if (copy) { b.setAttribute('aria-hidden', 'true'); b.tabIndex = -1; }
        else b.setAttribute('aria-label', 'Open photograph ' + (offset + i + 1));
        b.addEventListener('click', function () {
          openViewer(window.SJVSC_GALLERY.shown, offset + i, b);
        });
        run.appendChild(b);
      });
    }
    band.appendChild(run);
  }

  function drive(bands) {
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) return;                       // a band you scroll yourself
    var held = 0;
    bands.forEach(function (band) {
      ['pointerdown', 'wheel', 'touchstart'].forEach(function (ev) {
        band.addEventListener(ev, function () { held = Date.now(); }, { passive: true });
      });
    });
    function move() {
      if (Date.now() - held < 4000) return;  // somebody is pushing it themselves
      bands.forEach(function (band, i) {
        var r = band.getBoundingClientRect();
        var span = window.innerHeight + r.height;
        var seen = Math.min(1, Math.max(0, (window.innerHeight - r.top) / span));
        var room = band.scrollWidth - band.clientWidth;
        if (room <= 0) return;
        /* every other band runs the other way, so the rows weave */
        var at = (i % 2 ? 1 - seen : seen);
        band.scrollLeft = (0.15 + 0.7 * at) * room;
      });
    }
    window.addEventListener('scroll', move, { passive: true });
    window.addEventListener('resize', move);
    move();
  }

  function render() {
    [].forEach.call(document.querySelectorAll('[data-gallery]'), function (host) {
      var list = pics(host.getAttribute('data-gallery'));
      host.innerHTML = '';
      if (!list.length) { host.hidden = true; return; }
      host.hidden = false;
      window.SJVSC_GALLERY.shown = list;

      var bands = [];
      for (var i = 0; i < bandsFor(list.length); i++) {
        var slice = list.slice(i * PER_BAND, (i + 1) * PER_BAND);
        if (!slice.length) break;
        var band = document.createElement('div');
        band.className = 'gband';
        fill(band, slice, i * PER_BAND);
        host.appendChild(band);
        bands.push(band);
      }
      drive(bands);
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else render();
  }

  return { KEY: KEY, PAGES: PAGES, PER_BAND: PER_BAND, MAX_PER_PAGE: MAX_PER_PAGE,
           all: all, save: save, pics: pics, shrink: shrink,
           bandsFor: bandsFor, render: render, openViewer: openViewer, shown: [] };
}());
