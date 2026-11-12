/* Where the club's data lives: in D1, behind /api.

   Every page reads through here and gets back exactly what data/*.json used
   to hand it, so nothing above this file had to learn a new shape. The
   difference is that the admin can now write, which a file on disk could
   never allow.

   The data files are still in the repository, and this falls back to them
   when there is no API to talk to — which is what happens on the GitHub
   Pages copy, where there is no Worker. A 404 means "not deployed here, use
   the files". Any other failure is a real failure and takes the caller's
   own fallback instead, so a broken database cannot quietly masquerade as
   a working site serving last month's events.

   Writes carry no token by hand. Clerk sets a same-origin session cookie
   and credentials: 'same-origin' sends it; the Worker checks it. */

window.SJVSC_STORE = (function () {

  var API = '/api/';
  var FILE = 'data/';

  function bust(url) { return url + (url.indexOf('?') < 0 ? '?' : '&') + 't' + '=' + Date.now(); }

  function fromFile(name, fallback) {
    return fetch(bust(FILE + name + '.json'))
      .then(function (r) { return r.ok ? r.json() : fallback; })
      .catch(function () { return fallback; });
  }

  function read(name, fallback) {
    return fetch(bust(API + name))
      .then(function (r) {
        if (r.ok) return r.json();
        if (r.status === 404) return fromFile(name, fallback);
        return fallback;
      })
      .catch(function () { return fromFile(name, fallback); });
  }

  /* Every write answers the same way: the saved thing, or an Error whose
     message is the one the Worker wrote, which is already phrased for a
     person to read. */
  function send(method, url, body) {
    /* admin-auth.js provides this on the admin pages. Elsewhere there is no
       token and no write; the Worker answers 401 either way. */
    var token = window.SJVSC_TOKEN ? window.SJVSC_TOKEN() : Promise.resolve(null);

    return token.then(function (t) {
      var options = {
        method: method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
      };
      if (t) options.headers.Authorization = 'Bearer ' + t;
      if (body !== undefined) options.body = JSON.stringify(body);
      return fetch(API + url, options);
    }).then(function (r) {
      if (r.status === 204) return null;
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (r.ok) return data;
        var err = new Error(data && data.error ? data.error : 'That did not save.');
        err.status = r.status;
        throw err;
      });
    });
  }

  return {
    read: read,
    path: function (name) { return API + name; },

    /* who is signed in, if anyone — the admin asks before unlocking a form */
    /* What the Worker thinks of us, which is the answer that counts: the
       admin unlocks on this rather than on Clerk saying we are signed in,
       because only the Worker decides whether a write will be accepted. */
    me: function () {
      var token = window.SJVSC_TOKEN ? window.SJVSC_TOKEN() : Promise.resolve(null);
      return token.then(function (t) {
        var headers = {};
        if (t) headers.Authorization = 'Bearer ' + t;
        return fetch(bust(API + 'me'), { credentials: 'same-origin', headers: headers });
      })
        .then(function (r) { return r.ok ? r.json() : { signedIn: false }; })
        .catch(function () { return { signedIn: false }; });
    },

    create: function (name, body) { return send('POST', name, body); },
    update: function (name, id, body) { return send('PUT', name + '/' + encodeURIComponent(id), body); },
    remove: function (name, id) { return send('DELETE', name + '/' + encodeURIComponent(id)); },
    put: function (name, body) { return send('PUT', name, body); }
  };
}());
