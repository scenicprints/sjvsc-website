/* The brick on the bricks page.

   Three boxes, one a line, and a drawn brick that shows the lines as they
   would be cut: capitals, centred, twenty characters at most. The button
   under it opens an email to the club with the three lines in the body,
   so what the engraver gets is what the person saw.

   Nothing is sent anywhere by this page. The email is the person's own,
   and the club answers it. */
(function () {
  var mail = document.getElementById('bmail');
  var left = document.getElementById('bleft');
  if (!mail) return;

  var lines = [1, 2, 3].map(function (n) {
    return { box: document.getElementById('l' + n), show: document.getElementById('bl' + n) };
  });

  /* What the engraver can cut: plain letters, figures and ordinary marks.
     This is a Swiss club, so the umlauts matter and are not thrown away:
     MUELLER for Müller, BUEHLER for Bühler, the way German itself writes
     them when the dots are not to be had. Other accents lose their mark,
     so Genève is GENEVE. The first version of this dropped the letter
     altogether and turned Grüezi into GREZI, which was caught on the live
     page and not before. */
  var UMLAUT = {
    'ä': 'AE', 'ö': 'OE', 'ü': 'UE',
    'Ä': 'AE', 'Ö': 'OE', 'Ü': 'UE', 'ß': 'SS'
  };
  function cut(s) {
    var t = String(s || '').replace(/[äöüÄÖÜß]/g, function (c) {
      return UMLAUT[c];
    });
    if (t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return t.toUpperCase().replace(/[^A-Z0-9 .,'&-]/g, '').slice(0, 20);
  }

  function draw() {
    var words = [];
    lines.forEach(function (l, i) {
      var text = cut(l.box.value);
      if (text !== l.box.value.toUpperCase()) l.box.value = text;
      l.show.textContent = text || (i === 0 ? 'Your name here' : '');
      l.show.className = text ? '' : 'brick-empty';
      words.push(text);
    });
    var any = words.some(Boolean);
    var body = 'Hello,\n\nI would like to order an engraved brick for the playground walk, $150.\n\n' +
      'The three lines:\n\n' +
      words.map(function (w, i) { return '  ' + (i + 1) + '.  ' + (w || '(blank)'); }).join('\n') +
      '\n\nMy name:\nMy telephone:\n\nPlease tell me how to pay.\n\nThank you,\n';
    mail.href = 'mailto:riponswissclub.secretary@gmail.com?subject=' +
      encodeURIComponent('Engraved brick') + '&body=' + encodeURIComponent(body);
    if (left) {
      var room = lines.map(function (l) { return 20 - cut(l.box.value).length; });
      left.textContent = any
        ? 'Room left: ' + room[0] + ' on line one, ' + room[1] + ' on line two, ' + room[2] + ' on line three.'
        : 'Up to 20 characters a line, spaces included.';
    }
  }

  lines.forEach(function (l) {
    l.box.addEventListener('input', draw);
    l.box.addEventListener('change', draw);
  });
  draw();
}());
