/* Admin home. Only the date is live here; everything else is markup. */

(function () {
  var day = document.getElementById('aday');
  if (!day) return;
  var d = new Date();
  day.textContent = d.toLocaleDateString('en-GB',
    { weekday: 'long', day: 'numeric', month: 'long' });
})();
