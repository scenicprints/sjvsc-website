/* The form that asks the club to put an event on the calendar.

   Whoever is running the event fills this in. At this club that means a
   member who has been one for forty years, doing it once a year, on a
   tablet, having never seen the page before. So there is one question
   down the page, two of them are required, and the flyer comes first:
   a photograph of it usually answers the time, the price and who to ring,
   and somebody who manages only that has still told us everything.

   It posts to /api/request, which checks Turnstile, keeps a copy and
   emails the webmaster.

   A photograph off a phone is several megabytes and nothing will ever
   show it that large, so it is resized here before it is sent -- the same
   trick the Pictures screen uses. A PDF goes as it is, because a flyer is
   a thing to be printed. The ceilings are enforced again on the Worker:
   this half is a courtesy to the sender's data allowance, not a lock. */

(function () {
  'use strict';

  var form = document.getElementById('rqform');
  if (!form) return;

  var said = document.getElementById('q-said');
  var send = document.getElementById('q-send');
  var chooser = document.getElementById('q-files');
  var choose = document.getElementById('q-choose');
  var filelist = document.getElementById('q-filelist');

  var LONG_EDGE = 2000;         // a flyer is read, not glanced at
  var QUALITY = 0.86;
  var MAX_FILES = 3;
  var MAX_ONE = 8 * 1024 * 1024;

  var picked = [];              // { name, type, blob }

  /* Said loudly and next to the button, not quietly at the foot of the
     page. Somebody who cannot see why nothing happened will simply press
     it again. */
  function wrong(message) {
    said.textContent = message || '';
    said.hidden = !message;
    if (message) said.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  var val = function (id) {
    var el = document.getElementById(id);
    return el ? (el.value || '').trim() : '';
  };

  /* ---- the flyer ------------------------------------------------------

     The file input itself is hidden and a proper button stands in front of
     it. "Choose Files / No file chosen" in 11px grey is the browser's own
     control and it is the least obvious thing on any form. */

  choose.addEventListener('click', function () { chooser.click(); });

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
          else reject(new Error('That picture could not be read. Try another one.'));
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
      off.textContent = 'Remove';
      off.setAttribute('aria-label', 'Remove ' + f.name);
      off.addEventListener('click', function () {
        picked.splice(i, 1);
        drawFiles();
      });

      li.appendChild(name);
      li.appendChild(size);
      li.appendChild(off);
      filelist.appendChild(li);
    });
    choose.textContent = picked.length
      ? 'Choose another'
      : 'Choose a photograph';
  }

  chooser.addEventListener('change', function () {
    var chosen = [].slice.call(chooser.files || []);
    chooser.value = '';
    if (!chosen.length) return;

    wrong('');
    choose.disabled = true;
    choose.textContent = 'Just a moment…';

    chosen.reduce(function (chain, file) {
      return chain.then(function () {
        if (picked.length >= MAX_FILES) {
          throw new Error('Three is the most. Remove one if you want to add another.');
        }
        var isPicture = /^image\//.test(file.type);
        if (!isPicture && file.type !== 'application/pdf') {
          throw new Error(file.name + ' is not a photograph or a PDF.');
        }
        return (isPicture ? shrink(file) : Promise.resolve(file)).then(function (blob) {
          if (blob.size > MAX_ONE) {
            throw new Error(file.name + ' is too big to send. Eight megabytes is the most.');
          }
          picked.push({
            name: isPicture ? file.name.replace(/\.[^.]+$/, '') + '.jpg' : file.name,
            type: isPicture ? 'image/jpeg' : 'application/pdf',
            blob: blob,
          });
        });
      });
    }, Promise.resolve()).then(function () {
      choose.disabled = false;
      drawFiles();
    }).catch(function (err) {
      choose.disabled = false;
      drawFiles();
      wrong(err.message);
    });
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

  function ask(id, message) {
    var el = document.getElementById(id);
    wrong(message);
    if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (send.disabled) return;

    if (!val('q-title')) return ask('q-title', 'We need to know what it is called.');
    if (!val('q-date')) return ask('q-date', 'We need to know what day it is on.');

    var token = turnstileToken();
    if (!token) {
      wrong('Give the box above a moment to tick, then press again.');
      return;
    }

    send.disabled = true;
    send.textContent = 'Sending…';
    wrong('');

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
          desc: val('q-desc'),
          tickprice: val('q-price'),
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
        '<div class="rq-ask" style="border:0">' +
        '<h2 style="margin:0 0 12px">Thank you &#8212; that has gone to the webmaster</h2>' +
        '<p style="font-size:1.05rem;line-height:1.6;margin:0 0 10px">' +
        'It is with Kevin Wagner now, flyer and all. There is nothing more for you to do.</p>' +
        '<p class="rq-hint" style="margin:0">It will not be on the calendar straight away. ' +
        'A board member puts it there, and you will see it on the website when they have. ' +
        'If anything was missing, whoever reads it will be in touch.</p></div>';
      form.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }).catch(function (err) {
      send.disabled = false;
      send.textContent = 'Send it to the webmaster';
      /* The challenge is spent once it has been checked, so a second
         attempt needs a fresh one or it fails for a reason nobody can see. */
      if (window.turnstile && window.turnstile.reset) {
        try { window.turnstile.reset(); } catch (e) { /* nothing to do */ }
      }
      wrong(err.message || 'That did not go through. Please try once more.');
    });
  });
})();
