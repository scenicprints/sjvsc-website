/* The way in to the admin.

   There is no club code any more. Everything the admin changes is committed
   to the repository, so the GitHub key IS the way in: without one nothing can
   be changed, and a made-up code on top of it protected nothing.

   The key is checked against GitHub before the admin opens, so a wrong one is
   caught at the door rather than when somebody presses Save. It is held for
   this tab only, never written to the repository, and Sign out forgets it.

   It runs from the <head> and locks the page synchronously, so the admin is
   never on screen for a frame before the key is given. */

(function () {
  var S = window.SJVSC_STORE;

  /* Sign out puts the key back in the way. Registered whether or not we are
     already in, which is the only time it can be reached. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('.awho a') : null;
    if (!a) return;
    if (S) S.forgetToken();
  });

  if (S && S.token()) return;

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
      '<p>What you change here is committed to the club&#8217;s repository, so this ' +
      'needs a GitHub key that can write to it.</p>' +
      '<label for="gate-key">GitHub key</label>' +
      '<input type="password" id="gate-key" autocomplete="off" autocapitalize="off" ' +
      'spellcheck="false" placeholder="github_pat_...">' +
      '<p class="gate-note">Held for this tab only. It is never written down and never ' +
      'reaches the repository. Signing out forgets it.</p>' +
      '<p class="gate-no" hidden></p>' +
      '<button class="abtn solid" type="submit">Go in</button>' +
      '<a class="gate-out" href="index.html">Back to the website</a>' +
      '</form>';
    document.body.appendChild(gate);

    var box = gate.querySelector('#gate-key');
    var no = gate.querySelector('.gate-no');
    var go = gate.querySelector('button');
    box.focus();
    box.addEventListener('input', function () { no.hidden = true; });

    function refuse(msg) {
      no.textContent = msg;
      no.hidden = false;
      go.disabled = false;
      go.textContent = 'Go in';
      box.select();
    }

    gate.querySelector('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var key = box.value.trim();
      if (!key) { refuse('Put the key in first.'); return; }

      go.disabled = true;
      go.textContent = 'Checking…';

      /* ask GitHub whether this key can reach the repository at all */
      fetch('https://api.github.com/repos/' + S.REPO, {
        headers: { Authorization: 'Bearer ' + key, Accept: 'application/vnd.github+json' }
      }).then(function (r) {
        if (r.status === 401) { refuse('GitHub does not know that key.'); return; }
        if (!r.ok) { refuse('That key cannot reach the repository.'); return; }
        return r.json().then(function (j) {
          if (!j.permissions || !j.permissions.push) {
            refuse('That key can read the repository but not write to it. ' +
                   'It needs Contents: read and write.');
            return;
          }
          S.setToken(key);
          gate.remove();
          document.documentElement.className =
            document.documentElement.className.replace(/\blocked\b/, '').trim();
          window.location.reload();
        });
      }, function () {
        refuse('Could not reach GitHub. Check the connection and try again.');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', draw);
  } else draw();
}());
