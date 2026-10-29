// Roost report chrome behaviour (ReportPill, ReportBanner). Plain script; the report needs no React.
(function () {
  'use strict';
  var pill = document.getElementById('rh-pill');
  var dataEl = document.getElementById('rh-data');
  if (!pill || !dataEl) return;
  var data = JSON.parse(dataEl.textContent);
  var root = document.documentElement;
  var chip = pill.querySelector('[data-rh="open"]');
  var panel = pill.querySelector('.rh-panel');

  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function open(on) {
    chip.hidden = on;
    panel.hidden = !on;
    pill.setAttribute('data-hidden', 'false');
    (on ? panel.querySelector('[data-rh="close"]') : chip).focus();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-rh], [data-rh-href]');
    if (!t) return;
    var what = t.getAttribute('data-rh');
    if (t.hasAttribute('data-rh-href')) { location.href = t.getAttribute('data-rh-href'); return; }
    if (what === 'open') open(true);
    else if (what === 'close') open(false);
    else if (what === 'pin') {
      var on = t.getAttribute('data-state') !== 'on';
      t.disabled = true;
      post('/api/pin', { ref: data.ref, pinned: on }).then(function () {
        t.setAttribute('data-state', on ? 'on' : 'off');
        t.setAttribute('aria-pressed', String(on));
        t.setAttribute('aria-label', on ? 'Pinned. Unpin report' : 'Pin report');
        t.querySelector('span').textContent = on ? 'Pinned' : 'Pin';
      }).catch(function () {}).then(function () { t.disabled = false; });
    } else if (what === 'archive') {
      e.preventDefault();
      t.setAttribute('aria-disabled', 'true');
      post('/api/archive', { ref: data.ref, archived: t.getAttribute('data-archived') !== 'true' }).then(function () { location.reload(); });
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) open(false); });

  // Phones: slide away while scrolling down; back on scroll up or at the end (the ReportPill artboard's rule).
  var phone = window.matchMedia('(max-width: 759px)');
  var lastY = window.scrollY;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (!phone.matches || !panel.hidden) { lastY = y; return; }
    var atEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 24;
    if (!atEnd && y > lastY + 4 && y > 48) pill.setAttribute('data-hidden', 'true');
    else if (atEnd || y < lastY - 4) pill.setAttribute('data-hidden', 'false');
    lastY = y;
  }, { passive: true });

  // One hub-wide theme: the report's own toggle (reports.js) saves to KV instead of this origin's localStorage.
  document.addEventListener('lr-theme', function (e) {
    root.setAttribute('data-hub-theme', e.detail);
    root.classList.toggle('dark', e.detail === 'dark');
    post('/api/prefs', { theme: e.detail }).catch(function () {});
  });
})();
