/* The contact form.

   It posts to /api/contact, which checks Turnstile, keeps a copy and
   emails the club. Until November 2026 this form was a mock-up that said
   it had sent and had not, so the one rule here is that the page never
   says "sent" unless the Worker has said so first.

   site.js fills the message in when somebody arrives from a hall quote;
   that happens before this script runs and nothing here undoes it. */

(function () {
  'use strict';

  var form = document.getElementById('ctform');
  if (!form) return;

  var said = document.getElementById('ctsaid');
  var send = document.getElementById('ctsend');

  function wrong(message) {
    said.textContent = message || '';
    said.hidden = !message;
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? (el.value || '').trim() : '';
  }

  function ask(id, message) {
    var el = document.getElementById(id);
    wrong(message);
    if (el) el.focus();
  }

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

    if (!val('cName')) return ask('cName', 'We need your name.');
    if (!val('cEmail')) return ask('cEmail', 'We need an email or a telephone number to answer you on.');
    if (!val('cMsg')) return ask('cMsg', 'Tell us what you need.');

    var token = turnstileToken();
    if (!token) {
      wrong('Give the box above a moment to tick, then press again.');
      return;
    }

    send.disabled = true;
    send.textContent = 'Sending…';
    wrong('');

    fetch('api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token,
        who: val('cName'),
        contact: val('cEmail'),
        topic: val('cTopic'),
        body: val('cMsg')
      })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) throw new Error(body.error || 'That did not go through.');
        return body;
      });
    }).then(function () {
      form.innerHTML =
        '<h3 style="margin:0 0 10px">Thank you &#8212; your message has gone to the club</h3>' +
        '<p style="margin:0">Somebody will be in touch on the email or number you gave. ' +
        'If it is urgent, ring (209) 495-2366.</p>';
      form.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }).catch(function (err) {
      send.disabled = false;
      send.textContent = 'Send';
      /* The challenge is spent once it has been checked, so a second
         attempt needs a fresh one. */
      if (window.turnstile && window.turnstile.reset) {
        try { window.turnstile.reset(); } catch (e) { /* nothing to do */ }
      }
      wrong((err && err.message) || 'That did not go through. Please try once more.');
    });
  });
})();
