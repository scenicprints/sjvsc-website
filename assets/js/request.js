/* The form that asks the club to put an event on the calendar.

   Everything a member knows about their own event, collected once, in the
   order a person would say it. It posts to /api/request, which checks
   Turnstile, keeps a copy and emails the webmaster.

   A photograph of a flyer off a phone is several megabytes and nothing on
   screen will ever show it that large, so it is resized here before it is
   sent -- the same trick the Pictures screen uses. A PDF goes as it is,
   because a PDF cannot be resized without being re-rendered, and a flyer
   is a thing to be printed.

   The ceiling is enforced again on the Worker. This half is a courtesy to
   the member's data allowance, not a security measure: anything the page
   decides can be decided differently by whoever is holding the keyboard. */

(function () {
  'use strict';

  var form = document.getElementById('rqform');
  if (!form) return;

  var said = document.getElementById('q-said');
  var send = document.getElementById('q-send');
  var skedbox = document.getElementById('q-sked');
  var chooser = document.getElementById('q-files');
  var filelist = document.getElementById('q-filelist');

  var LONG_EDGE = 2000;         // a flyer is read, not glanced at
  var QUALITY = 0.86;
  var MAX_FILES = 3;
  var MAX_ONE = 8 * 1024 * 1024;

  var picked = [];              // { name, type, blob }

  function tell(message, bad) {
    said.textContent = message || '';
    said.style.color = bad ? 'var(--red)' : '';
  }

  var val = function (id) { return (document.getElementById(id).value || '').trim(); };

  /* ---- what happens through the day ---------------------------------- */

  function skedRow(at, what) {
    var row = document.createElement('div');
    row.className = 'rq-sked';

    var when = document.createElement('input');
    when.type = 'text';
    when.className = 'rq-at';
    when.placeholder = '1pm';
    when.value = at || '';

    var doing = document.createElement('input');
    doing.type = 'text';
    doing.className = 'rq-what';
    doing.placeholder = 'Doors open';
    doing.value = what || '';

    var off = document.createElement('button');
    off.type = 'button';
    off.className = 'btn rq-off';
    off.textContent = '×';
    off.setAttribute('aria-label', 'Take this line off');
    off.addEventListener('click', function () { row.remove(); });

    row.appendChild(when);
    row.appendChild(doing);
    row.appendChild(off);
    skedbox.appendChild(row);
    return when;
  }

  document.getElementById('q-addsked').addEventListener('click', function () {
    skedRow('', '').focus();
  });

  function readSked() {
    return [].map.call(skedbox.querySelectorAll('.rq-sked'), function (row) {
      return {
        at: row.querySelector('.rq-at').value.trim(),
        what: row.querySelector('.rq-what').value.trim(),
      };
    }).filter(function (s) { return s.at || s.what; });
  }

  /* ---- the flyer ------------------------------------------------------ */

  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, LONG_EDGE / Math.max(w, h));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('That picture could not be read.'));
        }, 'image/jpeg', QUALITY);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('That file is not a picture this browser can open.'));
      };
      img.src = url;
    });
  }

  function sizeSaid(bytes) {
    return bytes > 1048576
      ? (bytes / 1048576).toFixed(1) + ' MB'
      : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function drawFiles() {
    filelist.innerHTML = '';
    picked.forEach(function (f, i) {
      var li = document.createElement('li');
      var name = document.createElement('span');
      name.textContent = f.name;
      var size = document.createElement('i');
      size.textContent = sizeSaid(f.blob.size);
      var off = document.createElement('button');
      off.type = 'button';
      off.className = 'btn rq-off';
      off.textContent = '×';
      off.setAttribute('aria-label', 'Take ' + f.name + ' off');
      off.addEventListener('click', function () {
        picked.splice(i, 1);
        drawFiles();
      });
      li.appendChild(name);
      li.appendChild(size);
      li.appendChild(off);
      filelist.appendChild(li);
    });
  }

  chooser.addEventListener('change', function () {
    var chosen = [].slice.call(chooser.files || []);
    chooser.value = '';
    if (!chosen.length) return;

    tell('');
    var queue = chosen.reduce(function (chain, file) {
      return chain.then(function () {
        if (picked.length >= MAX_FILES) {
          throw new Error('Three files is the most.');
        }
        var isPicture = /^image\//.test(file.type);
        if (!isPicture && file.type !== 'application/pdf') {
          throw new Error(file.name + ' is not a JPEG, a PNG or a PDF.');
        }
        return (isPicture ? shrink(file) : Promise.resolve(file)).then(function (blob) {
          if (blob.size > MAX_ONE) {
            throw new Error(file.name + ' is too big. Eight megabytes is the most.');
          }
          picked.push({
            name: isPicture ? file.name.replace(/\.[^.]+$/, '') + '.jpg' : file.name,
            type: isPicture ? 'image/jpeg' : 'application/pdf',
            blob: blob,
          });
          drawFiles();
        });
      });
    }, Promise.resolve());

    queue.catch(function (err) { tell(err.message, true); drawFiles(); });
  });

  /* A blob as base64, because the rest of the request is JSON and one
     shape is easier to reason about than a multipart body. */
  function asBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
      };
      reader.onerror = function () { reject(new Error('That file could not be read.')); };
      reader.readAsDataURL(blob);
    });
  }

  /* ---- sending -------------------------------------------------------- */

  function turnstileToken() {
    if (window.turnstile && typeof window.turnstile.getResponse === 'function') {
      try { return window.turnstile.getResponse() || ''; } catch (e) { /* below */ }
    }
    var field = form.querySelector('[name="cf-turnstile-response"]');
    return field ? field.value : '';
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (send.disabled) return;

    if (!val('q-title')) { tell('The event needs a name.', true); return; }
    if (!val('q-date')) { tell('The event needs a day.', true); return; }

    var token = turnstileToken();
    if (!token) {
      tell('Wait a moment for the box above to tick, then press again.', true);
      return;
    }

    send.disabled = true;
    tell('Sending…');

    Promise.all(picked.map(function (f) {
      return asBase64(f.blob).then(function (data) {
        return { name: f.name, type: f.type, data: data };
      });
    })).then(function (files) {
      return fetch('api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          title: val('q-title'),
          date: val('q-date'),
          time: val('q-time'),
          note: val('q-note'),
          desc: val('q-desc'),
          schedule: readSked(),
          tickprice: val('q-price'),
          tickwhere: val('q-where'),
          tickto: val('q-tickto'),
          who: val('q-who'),
          contact: val('q-contact'),
          files: files,
        }),
      });
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) throw new Error(body.error || 'That did not go through.');
        return body;
      });
    }).then(function () {
      form.innerHTML =
        '<h2 style="margin:0 0 10px">That has gone to the webmaster</h2>' +
        '<p style="margin:0 0 6px">Thank you. It is with Kevin now, flyer and all.</p>' +
        '<p class="muted" style="margin:0">Nothing is on the calendar yet &#8212; a board ' +
        'member puts it there, and you will see it on the site when they do. If ' +
        'something was missing, whoever reads it will come back to you.</p>';
      form.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }).catch(function (err) {
      send.disabled = false;
      /* The challenge is spent once it has been checked, so a second
         attempt needs a fresh one or it fails for a reason the member
         cannot see. */
      if (window.turnstile && window.turnstile.reset) {
        try { window.turnstile.reset(); } catch (e) { /* nothing to do */ }
      }
      tell(err.message || 'That did not go through.', true);
    });
  });
})();
