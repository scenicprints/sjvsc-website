/* The Jass table on the Jass page.
 *
 * The game is a page of its own: a dark, full-screen app with its own
 * stylesheet, built for a phone. On a phone that is also the best way
 * to play it, so the button is nothing but a link -- one tap in, and
 * the arrow at the top left of the table, or the phone's own back,
 * to come out again.
 *
 * On a screen wide enough to hold the table without squeezing it, the
 * same button opens the game inside this page instead, so the club's
 * page is still around it. Either way there is one way in and one way
 * out, and the game keeps the hand you were in the middle of.
 */
(function () {
  var box = document.getElementById('jtable');
  var play = document.getElementById('jplay');
  if (!box || !play) return;

  /* The game wants 740 pixels of height before its table, the three
     fans of backs and your own hand stop crowding one another, and
     enough width that the hand of nine is not shrunk to fit. A window
     that cannot give it that gets the game's own screen instead,
     where it always has the room. */
  var WIDE = 900;
  var TALL = 820;

  function room() {
    return window.innerWidth >= WIDE && window.innerHeight >= TALL;
  }

  var invite = null;

  play.addEventListener('click', function (e) {
    if (!room()) return;                    /* let the link do its job */
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    sitDown();
  });

  function sitDown() {
    invite = document.createDocumentFragment();
    while (box.firstChild) invite.appendChild(box.firstChild);

    var frame = document.createElement('iframe');
    frame.className = 'jframe';
    frame.src = 'jass-table';
    frame.title = 'Schieber Jass';

    var bar = document.createElement('div');
    bar.className = 'jbar';

    var full = document.createElement('a');
    full.className = 'btn btn-cream';
    full.href = 'jass-table';
    full.textContent = 'Open it full screen';

    var leave = document.createElement('button');
    leave.className = 'btn btn-ghost';
    leave.type = 'button';
    leave.textContent = 'Leave the table';
    leave.addEventListener('click', standUp);

    bar.appendChild(full);
    bar.appendChild(leave);

    box.style.padding = '0';
    box.style.gap = '0';
    box.appendChild(frame);
    box.appendChild(bar);
    frame.focus();
  }

  function standUp() {
    while (box.firstChild) box.removeChild(box.firstChild);
    box.style.padding = '';
    box.style.gap = '';
    if (invite) box.appendChild(invite);
    invite = null;
    play = document.getElementById('jplay');
    if (play) play.focus();
  }
})();
