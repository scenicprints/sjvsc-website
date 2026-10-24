/* Where the club's data lives: in this repository, in data/*.json.

   The public pages fetch those files and draw themselves from them. The admin
   fetches the same files, and Save commits them straight back to GitHub
   through its Contents API. Nothing is kept in the browser: close the tab and
   the only copy of anything is the one in the repository.

   Writing needs a token, because GitHub will not take a commit from nobody.
   The admin asks for one, holds it for the tab and never writes it anywhere.
   It is not data, it is the key, and it never reaches the repository. */

window.SJVSC_STORE = (function () {
  var REPO = 'scenicprints/sjvsc-website';
  var BRANCH = 'main';
  var KEY = 'sjvsc.admin.key';     // the token, for this tab only

  var shas = {};                   // what GitHub last told us each file was

  function token() {
    try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(t) {
    try { sessionStorage.setItem(KEY, t); } catch (e) {}
  }
  function forgetToken() {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
  }

  function path(name) { return 'data/' + name + '.json'; }

  /* Reading. The public side takes the file as Pages serves it. The admin
     takes it through the API, which is never cached and hands back the sha
     a commit needs. */
  function read(name, fallback) {
    var t = token();
    if (!t) {
      return fetch(path(name) + '?t=' + Date.now())
        .then(function (r) { return r.ok ? r.json() : fallback; })
        .catch(function () { return fallback; });
    }
    return fetch('https://api.github.com/repos/' + REPO + '/contents/' +
                 path(name) + '?ref=' + BRANCH, {
      headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json' }
    }).then(function (r) {
      if (r.status === 404) return fallback;
      if (!r.ok) throw new Error('GitHub said ' + r.status);
      return r.json().then(function (j) {
        shas[name] = j.sha;
        return JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\n/g, '')))));
      });
    });
  }

  function write(name, value, message) {
    var t = token();
    if (!t) {
      return Promise.reject(new Error(
        'Nothing was saved, because there is no GitHub key in this tab. ' +
        'Sign out and come back in with one, and this change will be committed ' +
        'to the repository.'));
    }
    var body = {
      message: message || ('Website admin: ' + name),
      content: btoa(unescape(encodeURIComponent(JSON.stringify(value, null, 2) + '\n'))),
      branch: BRANCH
    };
    if (shas[name]) body.sha = shas[name];

    return fetch('https://api.github.com/repos/' + REPO + '/contents/' + path(name), {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + t,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) {
          if (r.status === 401 || r.status === 403) {
            throw new Error('That key was refused. It needs permission to write '
              + 'to the contents of this repository.');
          }
          if (r.status === 409 || r.status === 422) {
            throw new Error('Somebody changed this file since you opened it. '
              + 'Reload the page and make the change again.');
          }
          throw new Error(j.message || ('GitHub said ' + r.status));
        }
        shas[name] = j.content.sha;
        return j;
      });
    });
  }

  return { REPO: REPO, read: read, write: write,
           token: token, setToken: setToken, forgetToken: forgetToken };
}());
