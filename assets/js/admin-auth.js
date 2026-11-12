/* Signing in to the admin.

   Clerk owns all of it — the sign-in box, the session, the password reset,
   and the list of who is on the board. This file does three things: load
   Clerk, put a sign-in or an account button in the bar at the top, and hand
   the rest of the admin a way to ask for a token.

   The token goes to the Worker in an Authorization header rather than
   riding on a cookie. On a development instance Clerk's session cookie
   belongs to its own domain, not ours, so a cookie would work in production
   and quietly fail here. A header works in both.

   Every admin page loads this. Pages read nothing and need none of it. */

window.SJVSC_AUTH = (function () {

  var listeners = [];
  var state = { loaded: false, signedIn: false, who: '', name: '' };

  /* store.js calls this before every write. Null means no session, and the
     Worker will answer 401, which is the right answer. */
  window.SJVSC_TOKEN = function () {
    var C = window.Clerk;
    if (!C || !C.session) return Promise.resolve(null);
    return C.session.getToken().catch(function () { return null; });
  };

  function announce() {
    listeners.forEach(function (fn) {
      try { fn(state); } catch (e) { console.error(e); }
    });
  }

  /* The bar at the top: who you are, or a way to become someone. */
  function paint() {
    var slot = document.querySelector('.awho');
    if (!slot) return;

    var old = slot.querySelector('.aauth');
    if (old) old.remove();

    var box = document.createElement('span');
    box.className = 'aauth';

    if (!state.loaded) {
      box.textContent = '';
    } else if (state.signedIn) {
      var who = document.createElement('span');
      who.className = 'awhoami';
      who.textContent = state.name || state.who;
      box.appendChild(who);

      var out = document.createElement('button');
      out.type = 'button';
      out.className = 'abtn small';
      out.textContent = 'Sign out';
      out.addEventListener('click', function () {
        window.Clerk.signOut().then(function () { window.location.reload(); });
      });
      box.appendChild(out);
    } else {
      var inbtn = document.createElement('button');
      inbtn.type = 'button';
      inbtn.className = 'abtn small';
      inbtn.textContent = 'Sign in to make changes';
      inbtn.addEventListener('click', function () {
        /* Clerk's hosted sign-in page rather than a modal. The browser
           bundle served for v6 has no UI components in it — openSignIn
           throws — and a hosted page suits a site of plain HTML anyway:
           no component to mount, no styling to keep in step, and Clerk
           looks after the sign-up, the reset and the second factor. */
        window.Clerk.redirectToSignIn({ redirectUrl: window.location.href });
      });
      box.appendChild(inbtn);
    }

    slot.insertBefore(box, slot.firstChild);
  }

  function settle() {
    var C = window.Clerk;
    var u = C && C.user;
    state.loaded = true;
    state.signedIn = !!u;
    state.who = u ? (u.primaryEmailAddress ? u.primaryEmailAddress.emailAddress : u.id) : '';
    state.name = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : '';
    paint();
    announce();
  }

  function start() {
    var C = window.Clerk;
    if (!C) { state.loaded = true; paint(); announce(); return; }
    C.load({ afterSignOutUrl: window.location.href })
      .then(function () {
        settle();
        /* a sign-in in another tab, or a session that expires under us */
        C.addListener(function () { settle(); });
      })
      .catch(function (err) {
        console.error('Clerk did not load', err);
        state.loaded = true;
        paint();
        announce();
      });
  }

  /* Clerk's script is async and may land before or after this one, so wait
     for it rather than guessing. If it never arrives — blocked, offline, a
     bad key — give up after ten seconds and leave the admin read-only,
     which is what it was before anyone signed in anyway. */
  (function wait(tries) {
    if (window.Clerk) return start();
    if (tries <= 0) {
      console.error('Clerk did not load; the admin stays read-only.');
      state.loaded = true;
      paint();
      announce();
      return;
    }
    setTimeout(function () { wait(tries - 1); }, 100);
  }(100));

  return {
    state: state,
    /* fn(state) now if Clerk has settled, and again whenever it changes */
    onChange: function (fn) {
      listeners.push(fn);
      if (state.loaded) fn(state);
    }
  };
}());
