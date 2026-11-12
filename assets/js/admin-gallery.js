/* The pictures screen. One page at a time: what is on it, in the order the
   bands run in, with every sixth picture putting out another band.

   It reads data/gallery.json and shows what is in it. Pictures are added by
   putting the files in assets/img/gallery and naming them in that file, in
   the repository. */

(function () {
  var G = window.SJVSC_GALLERY;
  var store = G.all();           // replaced once the repository answers

  var pickview = document.getElementById('pickview');
  var editview = document.getElementById('editview');
  var picklist = document.getElementById('picklist');
  var glist = document.getElementById('glist');

  var pics = [];

  var canEdit = false;
  var page = null;          // the page open in the editor

  function said(message, bad) {
    var box = document.getElementById('gsaid');
    if (!box) return;
    box.textContent = message || '';
    box.classList.toggle('bad', !!bad);
  }

  function show(which) {
    pickview.hidden = which !== 'pick';
    editview.hidden = which !== 'edit';
    window.scrollTo(0, 0);
  }

  function bandWord(n) {
    var b = G.bandsFor(n);
    if (!n) return 'No pictures yet.';
    return n + (n === 1 ? ' picture' : ' pictures') + ', which makes ' +
      b + (b === 1 ? ' band' : ' bands') + '.';
  }

  /* ---- the nine pages ------------------------------------------------ */

  function drawPick() {
    picklist.innerHTML = '';
    G.PAGES.forEach(function (p) {
      var n = (store[p.id] || []).length;
      var row = document.createElement('button');
      row.className = 'arow';
      row.type = 'button';
      row.innerHTML =
        '<span class="aic" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' +
        '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m5 16 4.5-5 3.5 4 2.5-3 3.5 4"/>' +
        '<circle cx="9" cy="9.5" r="1.4"/></svg></span>' +
        '<span class="abody"><b></b><span></span></span>' +
        '<span class="ago" aria-hidden="true">Open &#8594;</span>';
      row.querySelector('.abody b').textContent = p.name;
      row.querySelector('.abody span').textContent = bandWord(n);
      row.addEventListener('click', function () { open(p); });
      picklist.appendChild(row);
    });
  }

  /* ---- one page's pictures -------------------------------------------- */

  function draw() {
    glist.innerHTML = '';
    document.getElementById('glead').textContent =
      bandWord(pics.length) + ' Up to ' + G.MAX_PER_PAGE + ', and the first one leads.';

    if (!pics.length) {
      var li = document.createElement('li');
      li.className = 'eempty';
      li.textContent = 'Nothing here yet, so this page carries no band at all.';
      glist.appendChild(li);
      return;
    }

    pics.forEach(function (p, i) {
      var li = document.createElement('li');
      li.className = 'gitem';
      li.innerHTML =
        '<span class="gnum"></span>' +
        '<img alt="">' +
        '<span class="gcap"><b></b><span class="val"></span></span>';

      li.querySelector('.gnum').textContent = ('0' + (i + 1)).slice(-2);
      var img = li.querySelector('img');
      img.src = p.src;
      img.alt = p.caption || 'Picture ' + (i + 1);

      li.querySelector('.gcap b').textContent = 'What it shows';
      var cap = li.querySelector('.gcap .val');
      cap.textContent = p.caption || '';

      if (canEdit) {
        cap.contentEditable = 'true';
        cap.classList.add('edit');
        cap.addEventListener('input', function () { pics[i].caption = cap.textContent.trim(); });

        /* The first picture leads the band, so which one is first is a
           decision rather than an accident, and it has to be changeable. */
        var tools = document.createElement('span');
        tools.className = 'gtools';
        [['\u2191', 'Move it earlier', i > 0, function () { swap(i, i - 1); }],
         ['\u2193', 'Move it later', i < pics.length - 1, function () { swap(i, i + 1); }],
         ['\u00d7', 'Take it off this page', true, function () { drop(i); }]
        ].forEach(function (spec) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'abtn small';
          b.textContent = spec[0];
          b.title = spec[1];
          b.setAttribute('aria-label', spec[1]);
          b.disabled = !spec[2];
          b.addEventListener('click', spec[3]);
          tools.appendChild(b);
        });
        li.appendChild(tools);
      }

      glist.appendChild(li);
    });
  }

  function swap(a, b) {
    var t = pics[a]; pics[a] = pics[b]; pics[b] = t;
    draw();
  }

  function drop(i) {
    if (!window.confirm('Take this picture off the page?')) return;
    pics.splice(i, 1);
    draw();
  }

  /* ---- adding a picture ----------------------------------------------

     A photograph off a phone is several megabytes and far larger than any
     band will ever show, so it is resized here, in the browser, before it
     is sent. What leaves the device is a few hundred kilobytes.

     It goes to Workers KV, which is in the Cloudflare plan the club
     already has. R2 is the better tool for files and wants a subscription
     the club is not taking. */

  var LONG_EDGE = 1600;
  var QUALITY = 0.82;

  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, LONG_EDGE / Math.max(w, h));
        var cw = Math.round(w * scale), ch = Math.round(h * scale);
        var canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
        canvas.toBlob(function (blob) {
          /* A canvas that will not encode is better reported than silently
             sending the original, which could be twelve megabytes. */
          if (blob) resolve(blob); else reject(new Error('That picture could not be read.'));
        }, 'image/jpeg', QUALITY);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('That file is not a picture this browser can open.'));
      };
      img.src = url;
    });
  }

  function add() {
    if (!canEdit || !page) return;
    if (pics.length >= G.MAX_PER_PAGE) {
      said('This page already holds ' + G.MAX_PER_PAGE + ' pictures.', true);
      return;
    }

    var chooser = document.createElement('input');
    chooser.type = 'file';
    chooser.accept = 'image/*';
    chooser.multiple = true;
    chooser.addEventListener('change', function () {
      var files = [].slice.call(chooser.files || []);
      if (!files.length) return;
      var room = G.MAX_PER_PAGE - pics.length;
      if (files.length > room) {
        said('Only ' + room + ' more will fit on this page.', true);
        files = files.slice(0, room);
      }

      var btn = document.getElementById('gadd');
      btn.disabled = true;
      var done = 0;

      files.reduce(function (chain, file) {
        return chain.then(function () {
          said('Adding ' + (done + 1) + ' of ' + files.length + '...');
          return shrink(file)
            .then(function (blob) { return window.SJVSC_STORE.upload(blob, page.id, file.name); })
            .then(function (res) {
              pics.push({ src: res.src, caption: '' });
              done++;
              draw();
            });
        });
      }, Promise.resolve())
        .then(function () {
          said(done + (done === 1 ? ' picture added' : ' pictures added') +
            '. Press Save to put them on the page.');
        })
        .catch(function (err) { said(err.message || 'That did not upload.', true); })
        .then(function () { btn.disabled = false; });
    });
    chooser.click();
  }

  function save() {
    if (!canEdit || !page) return;
    var clean = pics
      .map(function (x) { return { src: String(x.src || '').trim(), caption: String(x.caption || '').trim() }; })
      .filter(function (x) { return x.src; });

    var btn = document.getElementById('gsave');
    btn.disabled = true;
    said('Saving...');

    window.SJVSC_STORE.put('gallery/' + encodeURIComponent(page.id), clean)
      .then(function () {
        store[page.id] = clean;
        pics = clean.slice();
        draw();
        said('Saved. The page shows these now.');
      })
      .catch(function (err) { said(err.message || 'That did not save.', true); })
      .then(function () { btn.disabled = false; });
  }

  function open(p) {
    page = p;
    pics = (store[p.id] || []).map(function (x) { return { src: x.src, caption: x.caption }; });
    document.getElementById('ghead').textContent = p.name;
    document.getElementById('gsee').href = p.page;
    document.getElementById('gadd').hidden = !canEdit;
    document.getElementById('gsave').hidden = !canEdit;
    document.getElementById('gsignedout').hidden = canEdit;
    said('');
    draw();
    show('edit');
  }

  document.getElementById('gback').addEventListener('click', function () {
    drawPick();
    show('pick');
  });

  document.getElementById('gadd').addEventListener('click', add);
  document.getElementById('gsave').addEventListener('click', save);

  function askWhetherWeMayWrite() {
    return window.SJVSC_STORE.me().then(function (me) {
      canEdit = !!(me && me.signedIn);
    });
  }

  Promise.all([G.load(), askWhetherWeMayWrite()]).then(function (r) {
    store = r[0];
    drawPick();
  });

  if (window.SJVSC_AUTH) {
    window.SJVSC_AUTH.onChange(function () {
      askWhetherWeMayWrite().then(function () {
        if (page) open(page); else drawPick();
      });
    });
  }
}());
