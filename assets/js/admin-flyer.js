/* Putting the flyer up.

   One flyer at a time, replaced when the next one arrives. It may be a
   document of any number of pages or a single poster: the club's is a
   nine-page newsletter.

   Two files, then, and only the first is required. The flyer itself is
   what opens when somebody clicks, and the picture is what the band on
   the home page is cut from. A browser cannot take a page out of a PDF,
   so when the flyer is one the picture has to be given separately -- or
   left out, and the band goes without artwork.

   Choosing a file uploads it at once and shows it back, so nobody saves
   and then wonders whether it went. Save records what it is called and
   when it happens. */

(function () {
  var S = window.SJVSC_STORE;
  var canEdit = false;
  var flyer = null;

  var pendingSrc = null;        // uploaded, not yet saved
  var pendingCover = null;
  var coverCleared = false;

  function el(id) { return document.getElementById(id); }

  function said(message, bad) {
    var box = el('fsaid');
    if (!box) return;
    box.textContent = message || '';
    box.classList.toggle('bad', !!bad);
  }

  var CROP = { top: 'center top', middle: 'center center', bottom: 'center bottom' };
  var IS_PICTURE = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;
  function isPicture(url) { return IS_PICTURE.test(String(url || '')); }

  function src() { return pendingSrc || (flyer && flyer.src) || ''; }

  function cover() {
    if (coverCleared) return '';
    return pendingCover || (flyer && flyer.cover) || '';
  }

  /* What the band is cut from: the picture if there is one, otherwise the
     flyer itself when it happens to be a picture. */
  function art() { return cover() || (isPicture(src()) ? src() : ''); }

  /* ---- what the board sees before saving ----------------------------- */

  function drawPreview() {
    var holder = el('fpreview');
    if (holder) {
      var url = src();
      if (!url) {
        holder.innerHTML = '<p class="eempty">No flyer yet. Choose one and it goes up.</p>';
      } else if (isPicture(url)) {
        holder.innerHTML = '<img class="fsheet" src="' + url + '" alt="">';
      } else {
        holder.innerHTML = '<p class="fdoc">A document. <a href="' + url +
          '" target="_blank" rel="noopener">Open it</a> to check it is the right one.</p>';
      }
    }

    var cv = el('fcoverview');
    if (cv) {
      var a = art();
      cv.innerHTML = a
        ? '<p class="hint" style="margin:0 0 8px">The band, as the home page will show it</p>' +
          '<span class="fband" style="background-image:url(' + a + ');background-position:' +
          (CROP[el('fCrop').value] || CROP.top) + '"></span>'
        : '<p class="hint" style="margin:0 0 8px">The band, with no picture behind it</p>' +
          '<span class="fband fband-none"></span>';
    }

    var clear = el('fcoverclear');
    if (clear) clear.hidden = !canEdit || !cover();
  }

  function fill() {
    var f = flyer || {};
    el('fTitle').value = f.title || '';
    el('fHappens').value = f.happens || '';
    el('fPlace').value = f.place || '';
    el('fNote').value = f.note || '';
    el('fLink').value = f.link || '';
    el('fCrop').value = f.crop || 'top';
    drawPreview();
    lockOrUnlock();
  }

  function lockOrUnlock() {
    ['fTitle', 'fHappens', 'fPlace', 'fNote', 'fLink'].forEach(function (id) {
      el(id).readOnly = !canEdit;
      el(id).classList.toggle('ro', !canEdit);
    });
    el('fCrop').disabled = !canEdit;
    el('fpick').hidden = !canEdit;
    el('fcoverpick').hidden = !canEdit;
    el('fcoverclear').hidden = !canEdit || !cover();
    el('fsave').hidden = !canEdit;
    el('fclear').hidden = !canEdit || !flyer;
    el('signedoutnote').hidden = canEdit;
  }

  /* ---- choosing a file -----------------------------------------------

     A poster is a sheet of text, so a picture is resized to 2000 on the
     long edge rather than the 1600 a photograph gets: that keeps the
     small print readable when somebody opens it on a phone and pinches
     in. A document is sent exactly as it is. */

  var LONG_EDGE = 2000;

  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, LONG_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
        if (scale === 1 && file.size < 4 * 1024 * 1024) return resolve(file);
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (blob) {
          if (blob) resolve(blob); else reject(new Error('That picture could not be read.'));
        }, 'image/jpeg', 0.88);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('That file is not a picture this browser can open.'));
      };
      img.src = url;
    });
  }

  function choose(what) {
    var forCover = what === 'cover';
    var button = el(forCover ? 'fcoverpick' : 'fpick');

    var chooser = document.createElement('input');
    chooser.type = 'file';
    chooser.accept = forCover ? 'image/*' : 'image/*,application/pdf';
    chooser.addEventListener('change', function () {
      var file = (chooser.files || [])[0];
      if (!file) return;

      button.disabled = true;
      said('Uploading ' + file.name + '...');

      var ready = (forCover || file.type.indexOf('image/') === 0)
        ? shrink(file)
        : Promise.resolve(file);

      ready
        .then(function (blob) { return S.upload(blob, 'flyer', file.name); })
        .then(function (res) {
          if (forCover) { pendingCover = res.src; coverCleared = false; }
          else { pendingSrc = res.src; }
          drawPreview();
          lockOrUnlock();
          said('Uploaded. Press Save to put it up.');
        })
        .catch(function (err) { said(err.message || 'That did not upload.', true); })
        .then(function () { button.disabled = false; });
    });
    chooser.click();
  }

  /* ---- saving --------------------------------------------------------- */

  function save() {
    if (!canEdit) return;
    var body = {
      title: el('fTitle').value.trim(),
      happens: el('fHappens').value,
      place: el('fPlace').value.trim(),
      note: el('fNote').value.trim(),
      link: el('fLink').value.trim(),
      crop: el('fCrop').value,
      src: src(),
      cover: cover()
    };
    if (!body.title) { said('The flyer needs a name.', true); return; }
    if (!body.src) { said('Choose the flyer first.', true); return; }

    el('fsave').disabled = true;
    said('Saving...');
    S.put('flyer', body).then(function (saved) {
      flyer = saved;
      pendingSrc = null;
      pendingCover = null;
      coverCleared = false;
      fill();
      said('Saved. It is on the home page now.');
    }).catch(function (err) {
      said(err.message || 'That did not save.', true);
    }).then(function () { el('fsave').disabled = false; });
  }

  function takeDown() {
    if (!canEdit || !flyer) return;
    if (!window.confirm('Take the flyer down? The band on the home page goes with it.')) return;
    el('fclear').disabled = true;
    said('Taking it down...');
    S.remove('flyer', '').then(function () {
      flyer = null;
      pendingSrc = null;
      pendingCover = null;
      coverCleared = false;
      fill();
      said('Taken down. The home page shows no flyer now.');
    }).catch(function (err) {
      said(err.message || 'That did not work.', true);
    }).then(function () { el('fclear').disabled = false; });
  }

  /* ---- start ---------------------------------------------------------- */

  function load() {
    return Promise.all([S.read('flyer', null), S.me()]).then(function (r) {
      flyer = r[0] && r[0].src ? r[0] : null;
      canEdit = !!(r[1] && r[1].signedIn);
      fill();
    });
  }

  el('fpick').addEventListener('click', function () { choose('flyer'); });
  el('fcoverpick').addEventListener('click', function () { choose('cover'); });
  el('fcoverclear').addEventListener('click', function () {
    coverCleared = true;
    pendingCover = null;
    drawPreview();
    lockOrUnlock();
    said('The band will have no picture. Press Save to keep that.');
  });
  el('fsave').addEventListener('click', save);
  el('fclear').addEventListener('click', takeDown);
  el('fCrop').addEventListener('change', drawPreview);
  el('fform').addEventListener('submit', function (e) { e.preventDefault(); save(); });

  load();
  if (window.SJVSC_AUTH) window.SJVSC_AUTH.onChange(function () { load(); });
}());
