(function () {
  var btn = document.getElementById('navToggle');
  var panel = document.getElementById('navPanel');
  if (btn && panel) {
    btn.addEventListener('click', function () {
      var open = !panel.hidden;
      panel.hidden = open;
      btn.setAttribute('aria-expanded', String(!open));
      btn.textContent = open ? 'Menu' : 'Close';
    });
  }

  // Club events block the hall. Same calendar the quote engine reads.
  var CLUB = {
    '2027-02-07': 'the Jass Party',
    '2027-02-20': 'the Almond Blossom Parade and Dance',
    '2027-03-13': 'the Schwinger Dinner and Dance',
    '2027-04-10': 'the Swiss Echoes Spring Concert',
    '2027-06-05': 'the Spring Schwingfest',
    '2027-07-24': "the Members' BBQ and Buebe Schwingfest",
    '2027-09-04': 'the Championship Schwingfest',
    '2027-10-02': 'Oktoberfest',
    '2027-12-04': "the Children's Christmas Party"
  };

  var form = document.getElementById('dateForm');
  var out = document.getElementById('result');
  if (!form || !out) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = document.getElementById('d8').value;
    if (!v) return;
    var d = new Date(v + 'T12:00:00');
    var pretty = d.toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    out.className = 'result';
    if (CLUB[v]) {
      out.classList.add('taken');
      out.innerHTML = '<b>' + pretty + '</b> is not available. The club has ' +
        CLUB[v] + ' that day.';
    } else if (d.getDay() === 6) {
      out.classList.add('open');
      out.innerHTML = '<b>' + pretty + '</b> is available. Saturday rate.';
    } else if (d.getDay() === 5 || d.getDay() === 0) {
      out.classList.add('open');
      out.innerHTML = '<b>' + pretty + '</b> is available. Friday and Sunday rate.';
    } else {
      out.classList.add('open');
      out.innerHTML = '<b>' + pretty + '</b> is available. Weekday rate.';
    }
  });
})();
