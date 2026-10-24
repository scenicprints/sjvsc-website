/* The way in to the admin.

   THE CODE IS THE LINE BELOW. Change it there and nowhere else.

   This is the demo gate the plan calls for: one code, so the board can be
   handed a link without the editor being open to whoever finds it. It is NOT
   security. The code is in this file, which anybody can read, and the pages
   it guards hold nothing private: events, hall rates and photographs that are
   all on the public site anyway. The real thing is board members with an
   email and a password, and it swaps in behind this same screen.

   It runs from the <head> and locks the page synchronously, so the admin is
   never on screen for even a frame before the code is given. */

(function () {
  var CODE = 'ripon1926';
  var KEY = 'sjvsc.admin.in';

  function isIn() {
    try { return sessionStorage.getItem(KEY) === 'yes'; }
    catch (e) { return false; }
  }

  /* Sign out puts the code back in the way. Registered whether or not we are
     already in, which is the only time it can be reached. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('.awho a') : null;
    if (!a) return;
    try { sessionStorage.removeItem(KEY); } catch (err) {}
  });

  if (isIn()) return;

  document.documentElement.className += ' locked';

  function draw() {
    var gate = document.createElement('div');
    gate.className = 'gate';
    gate.innerHTML =
      '<form class="gate-box" novalidate>' +
      '<svg class="gate-mark" viewBox="0 0 32 34" aria-hidden="true">' +
      '<path d="M1 1h30v17c0 7.5-6.5 13-15 15.5C7.5 31 1 25.5 1 18Z" fill="#C8102E"/>' +
      '<path d="M13.2 6h5.6v6.2H25v5.6h-6.2V24h-5.6v-6.2H7v-5.6h6.2Z" fill="#fff"/></svg>' +
      '<h1>Website admin</h1>' +
      '<p>Enter the code the club gave you.</p>' +
      '<label for="gate-code">Code</label>' +
      '<input type="password" id="gate-code" autocomplete="off" autocapitalize="off" ' +
      'spellcheck="false" inputmode="text">' +
      '<p class="gate-no" hidden>That is not the code. Try again.</p>' +
      '<button class="abtn solid" type="submit">Go in</button>' +
      '<a class="gate-out" href="index.html">Back to the website</a>' +
      '</form>';
    document.body.appendChild(gate);

    var box = gate.querySelector('#gate-code');
    var no = gate.querySelector('.gate-no');
    box.focus();
    box.addEventListener('input', function () { no.hidden = true; });

    gate.querySelector('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (box.value.trim().toLowerCase() !== CODE) {
        no.hidden = false;
        box.select();
        return;
      }
      try { sessionStorage.setItem(KEY, 'yes'); } catch (e) {}
      gate.remove();
      document.documentElement.className =
        document.documentElement.className.replace(/\blocked\b/, '').trim();
      var first = document.querySelector('main a, main button, main input');
      if (first && first.focus) first.focus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', draw);
  } else draw();
}());
