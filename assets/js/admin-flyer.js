/* Putting the flyer up.

   One poster at a time. Choosing a file uploads it straight away and
   shows it back, so nobody saves a flyer and then wonders whether the
   picture went; Save then records what it is called and when it happens.

   The preview shows both things the visitor will see: the band as it
   will appear on the home page, cropped where the chooser says, and the
   sheet itself underneath. */

(function () {
  var S = window.SJVSC_STORE;
  var canEdit = false;
  var flyer = null;
  var pendingSrc = null;          // uploaded but not yet saved

  function el(id) { return document.getElementById(id); }

  function said(message, bad) {
    var box = el('fsaid');
    if (!box) return;
    box.textContent = message || '';
    box.classList.toggle('bad', !!bad);
  }

  var CROP = { top: 'center top', middle: 'center center', bottom: 'center bottom' };

  function src() { return pendingSrc || (flyer && flyer.src) || ''; }

  function drawPreview() {
    var holder = el('fpreview');
    if (!holder) return;
    var url = src();
    if (!url) {
      holder.innerHTML = '<p class="eempty">No poster yet. Choose one and it goes up.</p>';
      return;
    }
    holder.innerHTML =
      '<p class="hint" style="margin:0 0 8px">The band, as the home page will show it</p>' +
      '<span class="fband" style="background-image:url(' + url + ');background-position:' +
        (CROP[el('fCrop').value] || CROP.top) + '"></span>' +
      '<p class="hint" style="margin:16px 0 8px">The poster itself</p>' +
      '<img class="fsheet" src="' + url + '" alt="">';
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
    el('fsave').hidden = !canEdit;
    el('fclear').hidden = !canEdit || !flyer;
    el('signedoutnote').hidden = canEdit;
  }

  /* ---- choosing a poster --------------------------------------------

     A poster is a sheet of text, so it is not shrunk as hard as a
     photograph: 2000 on the long edge keeps the small print legible when
     somebody opens it on a phone and pinches in. */
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
          if (blob) resolve(blob); else reject(new Error('That poster could not be read.'));
        }, 'image/jpeg', 0.88);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('That file is not a picture this browser can open.'));
      };
      img.src = url;
    });
  }

  function choose() {
    var chooser = document.createElement('input');
    chooser.type = 'file';
    chooser.accept = 'image/*';
    chooser.addEventListener('change', function () {
      var file = (chooser.files || [])[0];
      if (!file) return;
      el('fpick').disabled = true;
      said('Uploading ' + file.name + '…');
      shrink(file)
        .then(function (blob) { return S.upload(blob, 'flyer', file.name); })
        .then(function (res) {
          pendingSrc = res.src;
          drawPreview();
          said('Uploaded. Press Save to put it up.');
        })
        .catch(function (err) { said(err.message || 'That did not upload.', true); })
        .then(function () { el('fpick').disabled = false; });
    });
    chooser.click();
  }

  function save() {
    if (!canEdit) return;
    var body = {
      title: el('fTitle').value.trim(),
      happens: el('fHappens').value,
      place: el('fPlace').value.trim(),
      note: el('fNote').value.trim(),
      link: el('fLink').value.trim(),
      crop: el('fCrop').value,
      src: src()
    };
    if (!body.title) { said('The flyer needs a name.', true); return; }
    if (!body.src) { said('Choose a poster first.', true); return; }

    el('fsave').disabled = true;
    said('Saving…');
    S.put('flyer', body).then(function (saved) {
      flyer = saved;
      pendingSrc = null;
      fill();
      said('Saved. It is on the home page now.');
    }).catch(function (err) {
      said(err.message || 'That did not save.', true);
    }).then(function () { el('fsave').disabled = false; });
  }

  function load() {
    return Promise.all([
      S.read('flyer', null),
      S.me()
    ]).then(function (r) {
      flyer = r[0] && r[0].src ? r[0] : null;
      canEdit = !!(r[1] && r[1].signedIn);
      fill();
    });
  }

  el('fpick').addEventListener('click', choose);
  el('fsave').addEventListener('click', save);
  el('fCrop').addEventListener('change', drawPreview);
  el('fform').addEventListener('submit', function (e) { e.preventDefault(); save(); });

  load();
  if (window.SJVSC_AUTH) {
    window.SJVSC_AUTH.onChange(function () { load(); });
  }

  /* taking it down goes through the store, so it carries the token */
  el('fclear').addEventListener('click', function () {
    if (!canEdit || !flyer) return;
    if (!window.confirm('Take the flyer down? The band on the home page goes with it.')) return;
    el('fclear').disabled = true;
    said('Taking it down…');
    S.remove('flyer', '').then(function () {
      flyer = null;
      pendingSrc = null;
      fill();
      said('Taken down. The home page shows no flyer now.');
    }).catch(function (err) {
      said(err.message || 'That did not work.', true);
    }).then(function () { el('fclear').disabled = false; });
  });
}());
