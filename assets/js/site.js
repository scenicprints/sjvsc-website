(function () {
  // Mobile navigation
  var btn = document.getElementById('navToggle');
  var panel = document.getElementById('navPanel');
  if (btn && panel) {
    btn.addEventListener('click', function () {
      var open = !panel.hidden;
      panel.hidden = open;
      btn.setAttribute('aria-expanded', String(!open));
      btn.textContent = open ? 'Menu' : 'Close';
    });
  }
})();

// Start each page at the top. The viewer keeps its scroll position when the
// document swaps, so a link from halfway down one page lands halfway down the next.
(function () {
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  function toTop() { if (!location.hash) window.scrollTo(0, 0); }
  toTop();
  window.addEventListener('pageshow', toTop);
  document.addEventListener('DOMContentLoaded', toTop);
})();

// Horizontal timeline
(function () {
  var track = document.getElementById('tlTrack');
  if (!track) return;
  var items = [].slice.call(track.querySelectorAll('.tlh-item'));
  var chips = [].slice.call(document.querySelectorAll('#tlYears button'));
  var prev = document.getElementById('tlPrev');
  var next = document.getElementById('tlNext');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var cur = -1, tick, anim, guard;

  function mark(i) {
    if (i === cur) return;
    cur = i;
    items.forEach(function (el, n) { el.classList.toggle('on', n === i); });
    chips.forEach(function (c, n) { c.setAttribute('aria-current', n === i ? 'true' : 'false'); });
    if (chips[i]) chips[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function edges() {
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  }
  // CSS scroll-behavior and scrollTo({behavior:'smooth'}) are both unreliable inside
  // an overflow container here, so the easing is done by hand.
  function glide(x) {
    cancelAnimationFrame(anim); clearTimeout(guard);
    if (reduce.matches) { track.scrollLeft = x; edges(); return; }
    var from = track.scrollLeft, delta = x - from, t0 = performance.now(), dur = 420, done = false;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      track.scrollLeft = from + delta * e;
      if (p < 1) { anim = requestAnimationFrame(step); } else { done = true; sync(); }
    })(performance.now());
    // Frames stop in a background or minimised window, which would strand the
    // animation part-way. Land it regardless.
    guard = setTimeout(function () {
      if (!done) { cancelAnimationFrame(anim); track.scrollLeft = x; sync(); }
    }, dur + 120);
  }
  function go(i) {
    i = Math.max(0, Math.min(items.length - 1, i));
    glide(items[i].offsetLeft - items[0].offsetLeft);
  }
  function sync() {
    var x = track.scrollLeft + items[0].offsetLeft, best = 0, bd = Infinity;
    items.forEach(function (el, n) {
      var d = Math.abs(el.offsetLeft - x);
      if (d < bd) { bd = d; best = n; }
    });
    // At maximum scroll the final card never reaches the left edge, so pin it.
    if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 2) best = items.length - 1;
    mark(best); edges();
  }
  track.addEventListener('scroll', function () {
    clearTimeout(tick);
    tick = setTimeout(sync, 50);
  });
  chips.forEach(function (c, i) { c.addEventListener('click', function () { go(i); }); });
  if (prev) prev.addEventListener('click', function () { go(cur - 1); });
  if (next) next.addEventListener('click', function () { go(cur + 1); });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
  });
  mark(0); edges();
})();
