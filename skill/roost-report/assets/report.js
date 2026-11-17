/* Report page behaviour: highlights the current section in the contents rail, and a theme button that
   cycles System -> Light -> Dark (remembered per viewer when storage is available, under "report-theme":
   "light", "dark", or absent for System). */
(function () {
  "use strict";
  const root = document.documentElement;

  // Theme: data-theme on <html>; absent means follow the operating system.
  const KEY = "report-theme";
  const load = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const save = v => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) { /* private mode */ } };
  const apply = v => { if (v) root.dataset.theme = v; else delete root.dataset.theme; };
  const saved = load();
  // Inside a host (data-host on <html>, set before this script runs), the host owns light/dark and sets
  // data-theme itself; it writes its choice under the same key, so a report opened on its own follows it.
  const hosted = root.hasAttribute("data-host");
  if (saved && !hosted) apply(saved); // a viewer's saved choice wins; otherwise keep the page's own data-theme, if any
  document.querySelectorAll(".theme-toggle").forEach(btn => {
    const label = () => { btn.textContent = "Theme: " + ({ light: "Light", dark: "Dark" }[root.dataset.theme] || "System"); };
    label();
    btn.addEventListener("click", () => {
      const next = { "": "light", light: "dark", dark: "" }[root.dataset.theme || ""];
      apply(next); save(next);
      document.querySelectorAll(".theme-toggle").forEach(b => b.dispatchEvent(new Event("relabel")));
    });
    btn.addEventListener("relabel", label);
  });

  // Identifiers and dates never break at their hyphens: BUG-0012, T-072.4, 2026-11-01, note-00001.md.
  // Wraps each such token in <span class="nowrap"> once, on load; code blocks, SVG and scripts are left alone.
  const ID = /[\w.]*\w-\d[\w.-]*\w|[\w.]*\w-\d/g;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: n => /\w-\d/.test(n.data) && !n.parentElement.closest("pre, script, style, svg, template, textarea, .nowrap")
      ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  const hits = [];
  while (walker.nextNode()) hits.push(walker.currentNode);
  hits.forEach(node => {
    const frag = document.createDocumentFragment();
    let last = 0;
    node.data.replace(ID, (m, at) => {
      frag.append(node.data.slice(last, at));
      const span = document.createElement("span");
      span.className = "nowrap"; span.textContent = m; frag.append(span);
      last = at + m.length;
    });
    frag.append(node.data.slice(last));
    node.replaceWith(frag);
  });

  // Table colour: heat columns share one scale per table (min to max; every heat cell gets at least a faint
  // tint); a change reads its direction from its sign. Non-numbers ("–") stay plain.
  const num = el => parseFloat(el.textContent.replace(/[−–]/g, "-").replace(/[^\d.\-]/g, ""));
  document.querySelectorAll("table").forEach(t => {
    const cols = [...t.querySelectorAll("thead th")].map((th, i) => th.classList.contains("heat") ? i : -1).filter(i => i >= 0);
    if (!cols.length) return;
    const cells = [...t.querySelectorAll("tbody tr")].flatMap(r => cols.map(i => r.cells[i])).filter(c => c && !isNaN(num(c)));
    const vals = cells.map(num), lo = Math.min(...vals), hi = Math.max(...vals);
    cells.forEach((c, k) => { c.classList.add("heat"); c.style.setProperty("--v", (0.1 + 0.9 * (hi > lo ? (vals[k] - lo) / (hi - lo) : 1)).toFixed(3)); });
  });
  document.querySelectorAll(".change").forEach(el => {
    const v = num(el);
    if (v > 0) el.classList.add("up"); else if (v < 0) el.classList.add("down");
  });

  // Print: open every closed <details> (CSS can't reveal their content), close them again afterwards.
  let opened = [];
  addEventListener("beforeprint", () => { opened = [...document.querySelectorAll("details:not([open])")]; opened.forEach(d => { d.open = true; }); });
  addEventListener("afterprint", () => { opened.forEach(d => { d.open = false; }); opened = []; });

  // Contents rail: mark the section in the upper part of the viewport.
  const links = [...document.querySelectorAll(".toc a[href^='#']")];
  if (!links.length || !("IntersectionObserver" in window)) return;
  const byId = new Map(links.map(a => [decodeURIComponent(a.getAttribute("href").slice(1)), a]));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const a = byId.get(e.target.id);
      if (!a) return;
      links.forEach(l => l.classList.remove("active"));
      a.classList.add("active");
      // Keep it visible: scroll the rail itself (never the page), centring the link when it leaves the view.
      const toc = a.closest(".toc"), pad = 48;
      if (toc && toc.scrollHeight > toc.clientHeight) {
        const y = a.offsetTop; // the sticky rail is the link's offsetParent
        if (y < toc.scrollTop + pad || y + a.offsetHeight > toc.scrollTop + toc.clientHeight - pad)
          toc.scrollTo({ top: y - toc.clientHeight / 2, behavior: "smooth" });
      }
    });
  }, { rootMargin: "-15% 0px -75% 0px" });
  byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
})();
