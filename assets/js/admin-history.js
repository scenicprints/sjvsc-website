/* What has been happening to the website.

   One line per change, newest first. Each carries the whole thing before
   and the whole thing after, so the fields that moved are worked out here
   rather than stored as a diff — which means a change made before this
   screen existed would still read correctly, and a field added later does
   not need the log to know about it.

   It is the board's own record, so it is behind the same door as
   everything else. */

(function () {
  var S = window.SJVSC_STORE;
  var list = document.getElementById('hlist');
  var canSee = false;

  /* ---- saying when ----------------------------------------------------

     SQLite writes datetime('now') as UTC without a marker, so it has to be
     told, or every change reads hours out in California. */
  function when(at) {
    var t = new Date(String(at).replace(' ', 'T') + 'Z');
    if (isNaN(t)) return at;
    var secs = Math.round((Date.now() - t) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) { var m = Math.round(secs / 60); return m + (m === 1 ? ' minute ago' : ' minutes ago'); }
    if (secs < 86400) { var h = Math.round(secs / 3600); return h + (h === 1 ? ' hour ago' : ' hours ago'); }
    return t.toLocaleDateString('en-US',
      { weekday: 'short', day: 'numeric', month: 'long' }) +
      ', ' + t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function exact(at) {
    var t = new Date(String(at).replace(' ', 'T') + 'Z');
    return isNaN(t) ? at : t.toLocaleString('en-US');
  }

  /* ---- what moved ----------------------------------------------------

     A shallow walk of both sides. Lists and objects are compared as JSON,
     because "the details changed" is the useful answer and spelling out
     which line of which heading moved is not. */
  function differences(before, after) {
    var out = [];
    if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return out;
    var keys = {};
    Object.keys(before).forEach(function (k) { keys[k] = 1; });
    Object.keys(after).forEach(function (k) { keys[k] = 1; });

    Object.keys(keys).sort().forEach(function (k) {
      if (k === 'id') return;
      var a = before[k], b = after[k];
      var sa = typeof a === 'object' ? JSON.stringify(a) : String(a === undefined ? '' : a);
      var sb = typeof b === 'object' ? JSON.stringify(b) : String(b === undefined ? '' : b);
      if (sa === sb) return;
      out.push({ field: k, from: sa, to: sb, wasList: typeof a === 'object' || typeof b === 'object' });
    });
    return out;
  }

  function short(v, wasList) {
    if (v === '' || v === 'null' || v === 'undefined') return '(nothing)';
    if (wasList) {
      try {
        var parsed = JSON.parse(v);
        if (Array.isArray(parsed)) {
          return parsed.length + (parsed.length === 1 ? ' item' : ' items');
        }
      } catch (e) { /* fall through and show the text */ }
    }
    return v.length > 90 ? v.slice(0, 90) + '…' : v;
  }

  var VERB = { added: 'added', changed: 'changed', removed: 'removed' };

  function draw(changes) {
    list.innerHTML = '';
    if (!changes.length) {
      var none = document.createElement('p');
      none.className = 'eempty';
      none.textContent = 'Nothing has been changed yet.';
      list.appendChild(none);
      return;
    }

    changes.forEach(function (c) {
      var item = document.createElement('details');
      item.className = 'hitem';

      var head = document.createElement('summary');
      head.innerHTML =
        '<span class="hwho"></span>' +
        '<span class="hwhat"> ' + VERB[c.action] + ' ' + esc(c.kind) + ' </span>' +
        '<b class="htitle"></b>' +
        '<span class="hwhen"></span>';
      head.querySelector('.hwho').textContent = c.who_name || 'Somebody';
      head.querySelector('.htitle').textContent = c.title || c.thing || '';
      var stamp = head.querySelector('.hwhen');
      stamp.textContent = when(c.at);
      stamp.title = exact(c.at);
      item.appendChild(head);

      var body = document.createElement('div');
      body.className = 'hbody';

      var diffs = differences(c.before, c.after);
      if (c.action === 'added') {
        body.innerHTML = '<p class="muted">It did not exist before this.</p>';
      } else if (c.action === 'removed') {
        body.innerHTML = '<p class="muted">It is gone. What it was:</p>';
      }

      if (diffs.length) {
        var table = document.createElement('table');
        table.className = 'tbl htbl';
        table.innerHTML = '<thead><tr><th>What</th><th>Was</th><th>Now</th></tr></thead>';
        var tb = document.createElement('tbody');
        diffs.forEach(function (d) {
          var tr = document.createElement('tr');
          tr.innerHTML = '<td class="hfield"></td><td class="hwas"></td><td class="hnow"></td>';
          tr.querySelector('.hfield').textContent = d.field;
          tr.querySelector('.hwas').textContent = short(d.from, d.wasList);
          tr.querySelector('.hnow').textContent = short(d.to, d.wasList);
          tb.appendChild(tr);
        });
        table.appendChild(tb);
        body.appendChild(table);
      } else if (c.action === 'changed') {
        var same = document.createElement('p');
        same.className = 'muted';
        same.textContent = 'Saved, but nothing actually changed.';
        body.appendChild(same);
      }

      var snapshot = c.action === 'removed' ? c.before : c.after;
      if (snapshot) {
        var pre = document.createElement('pre');
        pre.className = 'hjson';
        pre.textContent = JSON.stringify(snapshot, null, 2);
        var more = document.createElement('details');
        more.className = 'hraw';
        more.innerHTML = '<summary>The whole thing</summary>';
        more.appendChild(pre);
        body.appendChild(more);
      }

      item.appendChild(body);
      list.appendChild(item);
    });
  }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function load() {
    return S.me().then(function (me) {
      canSee = !!(me && me.signedIn);
      document.getElementById('signedoutnote').hidden = canSee;
      if (!canSee) { list.innerHTML = ''; return; }
      return S.read('changes', []).then(function (rows) {
        draw(Array.isArray(rows) ? rows : []);
      });
    });
  }

  load();
  if (window.SJVSC_AUTH) window.SJVSC_AUTH.onChange(function () { load(); });
}());
