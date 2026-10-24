/* Where the club's data lives: in this repository, in data/*.json.

   Every page reads those files, and that is all anything does. The admin
   shows what is in them; it does not write. The files are changed by editing
   them in the repository and committing, which is the only place the data
   has ever really lived.

   Nothing is kept in the browser. */

window.SJVSC_STORE = (function () {

  function path(name) { return 'data/' + name + '.json'; }

  function read(name, fallback) {
    return fetch(path(name) + '?t=' + Date.now())
      .then(function (r) { return r.ok ? r.json() : fallback; })
      .catch(function () { return fallback; });
  }

  return { read: read, path: path };
}());
