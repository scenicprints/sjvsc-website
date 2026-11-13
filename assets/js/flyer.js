/* The flyer that stands all year.

   Two things read this file. The home page shows a short band made from a
   crop of the poster's artwork, and the flyer page shows the poster
   itself. The poster never appears in the flow of the home page: it is a
   tall portrait sheet, which suits a phone and makes a skyscraper of a
   desktop screen.

   The band takes itself off the day after the event, the same way an
   event does. Otherwise July's flyer is still on the home page in
   September, which is the fault this whole site was built against. */

window.SJVSC_FLYER = (function () {

  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function today() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function at(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d) ? null : d;
  }

  /* Still worth showing? A flyer with no date stands until it is replaced,
     which is what a club with a standing poster wants. */
  function current(f) {
    if (!f || !f.src || !f.title) return false;
    var day = at(f.happens);
    if (!day) return true;
    return day >= today();
  }

  function longDate(iso) {
    var d = at(iso);
    if (!d) return '';
    return d.toLocaleDateString('en-US',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function said(f) {
    return [longDate(f.happens), f.place].filter(Boolean).join(' · ');
  }

  var CROP = { top: 'center top', middle: 'center center', bottom: 'center bottom' };

  var IS_PICTURE = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;

  function isPicture(url) { return IS_PICTURE.test(String(url || '')); }

  /* What the band is cut from. A cover if the club gave one; otherwise the
     flyer itself, but only when it is a picture -- a browser cannot crop a
     page out of a PDF, and asking the board to install something to make a
     thumbnail is not a plan. With neither, the band goes without artwork. */
  function artFor(f) {
    if (f.cover) return f.cover;
    return isPicture(f.src) ? f.src : '';
  }

  /* ---- the band on the home page ------------------------------------ */

  function band(f) {
    var holder = el('flyerband');
    if (!holder) return;
    if (!current(f)) { holder.hidden = true; return; }

    /* inside a wrap, so the band lines up with everything above it rather
       than running the full width of the window */
    var art = artFor(f);
    holder.innerHTML =
      '<div class="wrap">' +
      '<a class="flyer' + (art ? '' : ' flyer-plain') + '" href="flyer.html">' +
        (art
          ? '<span class="flyer-art" style="background-image:url(' + esc(art) +
            ');background-position:' + (CROP[f.crop] || CROP.top) + '"></span>'
          : '<span class="flyer-art flyer-art-none" aria-hidden="true"></span>') +
        '<span class="flyer-said">' +
          '<span class="eyebrow">This year</span>' +
          '<b>' + esc(f.title) + '</b>' +
          (said(f) ? '<span class="flyer-when">' + esc(said(f)) + '</span>' : '') +
          (f.note ? '<span class="flyer-note">' + esc(f.note) + '</span>' : '') +
        '</span>' +
        '<span class="flyer-go">See the flyer &#8594;</span>' +
      '</a></div>';
    holder.hidden = false;
  }

  /* ---- the poster's own page ----------------------------------------- */

  function page(f) {
    var holder = el('flyerpage');
    if (!holder) return;

    if (!f || !f.src) {
      holder.innerHTML = '<p class="lead">There is no flyer up just now. ' +
        '<a href="calendar.html">The calendar</a> has what is coming.</p>';
      return;
    }

    var over = !current(f);
    document.title = f.title + ' · Ripon Swiss Club';

    holder.innerHTML =
      (over ? '<p class="result taken" style="display:block;margin-bottom:20px">' +
        '<b>This has been and gone.</b> It is kept here until the next one goes up.</p>' : '') +
      '<div class="shead"><span class="eyebrow">The flyer</span><h1>' + esc(f.title) + '</h1></div>' +
      (said(f) ? '<p class="lead" style="margin-top:8px">' + esc(said(f)) + '</p>' : '') +
      (f.note ? '<p class="lead">' + esc(f.note) + '</p>' : '') +
      sheet(f) +
      '<p class="flyer-acts">' +
        '<a class="btn btn-red" href="' + esc(f.src) +
          '" target="_blank" rel="noopener">Open the flyer</a> ' +
        '<a class="btn" href="' + esc(f.src) + '" download>Download it</a>' +
        (f.link ? ' <a class="btn" href="' + esc(f.link) +
          '" target="_blank" rel="noopener">More about it</a>' : '') +
      '</p>';
  }

  /* A picture is shown. A document is embedded on a screen with room for
     it, and on a phone it is not: a PDF in an iframe on a small screen is
     a scrolling box inside a scrolling page, and several mobile browsers
     will only draw its first page anyway. There, the cover and the two
     buttons do the job. */
  function sheet(f) {
    if (isPicture(f.src)) {
      return '<figure class="flyer-sheet">' +
        '<img src="' + esc(f.src) + '" alt="' + esc(f.title) + ' flyer">' +
        '</figure>';
    }
    return (f.cover
        ? '<figure class="flyer-sheet flyer-sheet-cover">' +
          '<img src="' + esc(f.cover) + '" alt="The first page of the ' +
          esc(f.title) + '"></figure>'
        : '') +
      '<div class="flyer-doc"><iframe src="' + esc(f.src) +
        '" title="' + esc(f.title) + '" loading="lazy"></iframe></div>';
  }

  function load() {
    if (!window.SJVSC_STORE) return Promise.resolve(null);
    return window.SJVSC_STORE.read('flyer', null);
  }

  function start() {
    if (!el('flyerband') && !el('flyerpage')) return;
    load().then(function (f) { band(f); page(f); });
  }

  start();
  return { current: current, load: load, band: band, page: page };
}());
