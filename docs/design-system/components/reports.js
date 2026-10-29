/* lynx-reports — optional report behaviour. Reports read fine without it.
   - Theme: Report Hub sets data-theme (and data-palette) on <html> before first paint; this script then leaves them alone.
     Opened anywhere else, it uses the saved choice or the system setting. [data-lr-theme-toggle] switches it.
   - Table of contents: .lr-toc-link[href="#id"] gets data-active while its section is in view.
   - Code: every .lr-code gets a Copy button in its caption. */
(function () {
  var root = document.documentElement, KEY = 'lynx-report-theme'
  function stored() { try { return localStorage.getItem(KEY) } catch (e) { return null } }
  if (!root.hasAttribute('data-hub-theme')) {
    var t = stored()
    if (t !== 'light' && t !== 'dark') t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.setAttribute('data-theme', t)
  }

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn) }
  ready(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-lr-theme-toggle]'), function (btn) {
      function label() { btn.setAttribute('aria-label', root.getAttribute('data-theme') === 'dark' ? 'Switch to light theme' : 'Switch to dark theme') }
      label()
      btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
        root.setAttribute('data-theme', next)
        try { localStorage.setItem(KEY, next) } catch (e) {}
        document.dispatchEvent(new CustomEvent('lr-theme', { detail: next }))
        label()
      })
    })

    var links = Array.prototype.slice.call(document.querySelectorAll('.lr-toc-link[href^="#"]'))
    if (links.length && 'IntersectionObserver' in window) {
      var byId = {}
      links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a })
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting || !byId[e.target.id]) return
          links.forEach(function (a) { a.removeAttribute('data-active'); a.removeAttribute('aria-current') })
          byId[e.target.id].setAttribute('data-active', 'true'); byId[e.target.id].setAttribute('aria-current', 'location')
        })
      }, { rootMargin: '-20% 0px -70% 0px' })
      Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s) })
    }

    // Chart tooltips: data-tip="value|label" on any mark. Value leads; text is set with textContent, never as HTML.
    var marks = document.querySelectorAll('.lr-chart [data-tip]')
    if (marks.length) {
      var tip = document.createElement('div'); tip.className = 'lr-tooltip'; tip.setAttribute('role', 'tooltip')
      var tv = document.createElement('strong'), tl = document.createElement('span'); tip.appendChild(tv); tip.appendChild(tl); document.body.appendChild(tip)
      function place(x, y) {
        var w = tip.offsetWidth, h = tip.offsetHeight
        tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + 'px'
        tip.style.top = (y - h - 12 < 8 ? y + 16 : y - h - 12) + 'px'
      }
      function show(el, x, y) {
        var parts = el.getAttribute('data-tip').split('|')
        tv.textContent = parts[0]; tl.textContent = parts.slice(1).join('|'); tip.setAttribute('data-show', ''); place(x, y)
      }
      function hide() { tip.removeAttribute('data-show') }
      Array.prototype.forEach.call(marks, function (el) {
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0')
        if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.getAttribute('data-tip').replace('|', ', '))
        el.addEventListener('pointermove', function (e) { show(el, e.clientX, e.clientY) })
        el.addEventListener('pointerleave', hide)
        el.addEventListener('focus', function () { var r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.top) })
        el.addEventListener('blur', hide)
      })
    }

    Array.prototype.forEach.call(document.querySelectorAll('.lr-code'), function (fig) {
      var pre = fig.querySelector('pre'); if (!pre || !navigator.clipboard) return
      var cap = fig.querySelector('figcaption')
      if (!cap) { cap = document.createElement('figcaption'); cap.appendChild(document.createElement('span')); fig.insertBefore(cap, fig.firstChild) }
      var b = document.createElement('button'); b.type = 'button'; b.className = 'lr-copy'; b.textContent = 'Copy'
      b.addEventListener('click', function () {
        // Copy the code as it reads after the change: removed lines are left out.
        var clone = pre.cloneNode(true)
        Array.prototype.forEach.call(clone.querySelectorAll('.lr-del'), function (n) { n.remove() })
        Array.prototype.forEach.call(clone.querySelectorAll('.lr-add'), function (n) { if (!/\n$/.test(n.textContent)) n.textContent += '\n' })
        navigator.clipboard.writeText(clone.textContent.replace(/\n$/, '')).then(function () {
          b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy' }, 1500)
        })
      })
      cap.appendChild(b)
    })
  })
})()
