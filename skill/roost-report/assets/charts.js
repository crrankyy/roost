/* Report charts. Renders every <figure class="chart"> holding a <script type="application/json"> spec,
   and every inline <span class="spark" data-values="1,2,3">. Plain JS, no dependencies.
   Mark specs follow the dataviz skill: bars <= 24px with a 4px rounded data end, 2px lines, 8px dots with a
   2px surface ring, 2px surface gaps, hairline grid, text in ink tokens, a legend for 2+ series, a table view
   for every chart. Colours are CSS variables from charts.css, so light and dark come from CSS. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  // Sequential blue, steps 100..700 from the dataviz reference palette (7 classes).
  const SEQ = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
  const INK_ON_FILL = { dark: "#0b0b0b", light: "#ffffff" };
  let FONT = "sans-serif", ctx, tip;

  /* ---------- small helpers ---------- */
  function svgEl(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function htmlEl(tag, cls, parent, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(g, x, y, s, anchor, cls) {
    if (cls === "val") { // values sit on a surface-coloured box, so a reference line or gridline never runs through them
      const w = textW(s) + 6, x0 = anchor === "end" ? x - w + 3 : anchor === "middle" ? x - w / 2 : x - 3;
      svgEl("rect", { x: x0, y: y - 8, width: w, height: 16, rx: 3, class: "val-bg" }, g);
    }
    const t = svgEl("text", { x, y, "text-anchor": anchor || "start", "dominant-baseline": "middle", class: cls }, g);
    t.textContent = s;
    return t;
  }
  function textW(s, px) {
    ctx = ctx || document.createElement("canvas").getContext("2d");
    ctx.font = `${px || 12}px ${FONT}`;
    return ctx.measureText(String(s)).width;
  }
  function ellipsize(s, max) {
    s = String(s);
    if (textW(s) <= max) return s;
    while (s.length > 1 && textW(s + "…") > max) s = s.slice(0, -1);
    return s + "…";
  }
  function fmt(v, f) {
    f = f || {};
    if (v == null || v === "" || Number.isNaN(+v)) return "–";
    v = +v;
    const a = Math.abs(v), s = f.compact && a >= 1e4
      ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(a)
      : a.toLocaleString("en", { minimumFractionDigits: f.trim ? 0 : f.decimals ?? 0, maximumFractionDigits: f.decimals ?? 2 }); // "trim": 78, not 78.0
    const neg = v < 0 && /[1-9]/.test(s); // true minus sign, before the prefix: "−$5"; no "−0"
    return (neg ? "\u2212" : "") + (f.prefix || "") + s + (f.suffix || "");
  }
  function niceTicks(lo, hi, count) {
    if (lo === hi) { lo -= lo ? Math.abs(lo) / 2 : 1; hi += hi ? Math.abs(hi) / 2 : 1; }
    const raw = (hi - lo) / Math.max(1, count || 5), mag = 10 ** Math.floor(Math.log10(raw)), e = raw / mag;
    const step = (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * mag;
    const t = [];
    for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 2; v += step) t.push(+v.toFixed(10));
    return t;
  }
  function tickFmt(v, f, T) {
    const step = T.length > 1 ? Math.abs(T[1] - T[0]) : 1, big = Math.max(...T.map(Math.abs)) >= 1e4;
    const whole = T.every(t => Number.isInteger(t)); // whole ticks print whole ("100 ms", not "100.0 ms")
    return fmt(v, { ...f, compact: big, decimals: big ? undefined : whole ? 0 : Math.max(f.decimals ?? 0, -Math.floor(Math.log10(step) + 1e-9)) });
  }
  // Rect with chosen corners rounded (radius <= 4): [top-left, top-right, bottom-right, bottom-left].
  function rrect(x, y, w, h, c) {
    const m = Math.max(0, Math.min(4, w / 2, h / 2));
    const [a, b, d, e] = c.map(on => (on ? m : 0));
    return `M${x + a},${y}H${x + w - b}` + (b ? `A${b},${b} 0 0 1 ${x + w},${y + b}` : "") +
      `V${y + h - d}` + (d ? `A${d},${d} 0 0 1 ${x + w - d},${y + h}` : "") +
      `H${x + e}` + (e ? `A${e},${e} 0 0 1 ${x},${y + h - e}` : "") +
      `V${y + a}` + (a ? `A${a},${a} 0 0 1 ${x + a},${y}` : "") + "Z";
  }
  const END = { right: [0, 1, 1, 0], left: [1, 0, 0, 1], up: [1, 1, 0, 0], down: [0, 0, 1, 1], all: [1, 1, 1, 1], none: [0, 0, 0, 0] };
  // Colour follows the entity: an explicit slot wins, else series order. Never cycles past 8.
  function col(spec, s, k) {
    if (spec.emphasis != null) return s.name === spec.emphasis ? `var(--chart-${s.slot || 1})` : "var(--chart-other)";
    return s.slot ? `var(--chart-${s.slot})` : k < 8 ? `var(--chart-${k + 1})` : "var(--chart-other)";
  }
  const isDark = el => getComputedStyle(el).getPropertyValue("--chart-dark").trim() === "1";
  // A colour token as #rrggbb: themes write light-dark(…), so let the browser resolve it on a probe element.
  const cssVar = (el, name) => {
    const probe = el.appendChild(document.createElement("i"));
    probe.style.color = `var(${name})`;
    const rgb = getComputedStyle(probe).color.match(/\d+/g).slice(0, 3);
    probe.remove();
    return "#" + rgb.map(v => (+v).toString(16).padStart(2, "0")).join("");
  };
  function hexMix(a, b, t) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }
  function inkFor(hex) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? INK_ON_FILL.dark : INK_ON_FILL.light;
  }

  /* ---------- tooltip: values lead, names follow; same on hover and keyboard focus ---------- */
  function showTip(evt, head, rows) {
    tip = tip || htmlEl("div", "chart-tip", document.body);
    tip.replaceChildren();
    if (head) htmlEl("div", "chart-tip-head", tip, head);
    for (const r of rows) {
      const row = htmlEl("div", "chart-tip-row", tip);
      if (r.color) htmlEl("span", "chart-tip-key", row).style.setProperty("--c", r.color);
      htmlEl("b", null, row, r.value);
      if (r.name) htmlEl("span", null, row, r.name);
    }
    tip.style.display = "block";
    let x = evt.clientX, y = evt.clientY;
    if (evt.type === "focus" || evt.type === "keydown" || x == null) {
      const b = (evt.anchor || evt.target).getBoundingClientRect();
      x = b.left + b.width / 2; y = b.top;
    }
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, x + 12)) + "px";
    tip.style.top = (y - th - 12 < 8 ? y + 16 : y - th - 12) + "px";
  }
  const hideTip = () => { if (tip) tip.style.display = "none"; };
  function hover(node, head, rows, focusable) {
    node.classList.add("mark");
    if (focusable) {
      node.setAttribute("tabindex", "0");
      node.setAttribute("aria-label", [head, ...rows.map(r => (r.name ? r.name + ": " : "") + r.value)].filter(Boolean).join(", "));
    }
    const on = e => showTip(e, head, rows);
    node.addEventListener("pointermove", on);
    node.addEventListener("focus", on);
    node.addEventListener("pointerleave", hideTip);
    node.addEventListener("blur", hideTip);
  }

  /* ---------- shared pieces ---------- */
  function series(spec) {
    const S = spec.series || [];
    if (!Array.isArray(spec.labels) || !S.length) throw new Error(`"${spec.type}" needs labels[] and series[]`);
    S.forEach(s => {
      if (!Array.isArray(s.values) || s.values.length !== spec.labels.length)
        throw new Error(`series "${s.name}" needs ${spec.labels.length} values, one per label`);
    });
    return S;
  }
  const labelTable = (spec, S, f) => ({
    head: [spec.labelTitle || "", ...S.map(s => s.name)],
    rows: spec.labels.map((l, i) => [l, ...S.map(s => fmt(s.values[i], f))]),
  });
  function svgRoot(W, H, label) {
    const svg = svgEl("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": label || "chart" });
    return [svg, svgEl("g", null, svg)];
  }
  function valueAxis(g, T, sy, x0, x1, f) {
    for (const t of T) {
      const y = sy(t);
      svgEl("line", { x1: x0, x2: x1, y1: y, y2: y, class: t === 0 ? "axis" : "grid" }, g);
      text(g, x0 - 8, y, tickFmt(t, f, T), "end");
    }
  }
  function categoryLabels(g, labels, xAt, y, bandW) {
    const step = Math.max(1, Math.ceil((Math.max(...labels.map(l => textW(l))) + 12) / Math.max(1, bandW)));
    labels.forEach((l, i) => { if (i % step === 0) text(g, xAt(i), y, l, "middle"); });
  }

  /* ---------- bar (horizontal) and column (vertical): grouped, stacked, or 100% ---------- */
  function bars(spec, W, horiz) {
    const S = series(spec), L = spec.labels, f = spec.format || {}, n = S.length;
    const norm = !!spec.normalize, stacked = norm || !!spec.stacked;
    const tot = L.map((_, i) => S.reduce((a, s) => a + Math.abs(+s.values[i] || 0), 0) || 1);
    const v = (s, i) => (norm ? (+s.values[i] || 0) / tot[i] * 100 : +s.values[i] || 0);
    const vf = norm ? { suffix: "%", decimals: 0 } : f;
    const all = stacked ? L.map((_, i) => S.reduce((a, s) => a + Math.max(0, v(s, i)), 0)) : S.flatMap(s => L.map((_, i) => v(s, i)));
    // Reference lines (a budget, a target): "reference": {value, label} or a list of them; dashed, named in the legend.
    const refs = [].concat(spec.reference || []).filter(r => Number.isFinite(+r.value));
    const T = norm ? [0, 25, 50, 75, 100] : niceTicks(Math.min(0, ...all, ...refs.map(r => +r.value)), Math.max(0, ...all, ...refs.map(r => +r.value)), horiz ? Math.max(2, Math.floor(W / 120)) : 5);
    const lo = T[0], hi = T[T.length - 1];
    const showVals = (spec.showValues ?? (n === 1 && !norm)) && (horiz || stacked || n === 1); // grouped column caps collide
    const legend = n > 1 || refs.length ? [...(n > 1 ? S.map((s, k) => ({ name: s.name, color: col(spec, s, k), shape: "rect" })) : []),
      ...refs.map(r => ({ name: r.label || fmt(r.value, vf), color: "var(--ink)", shape: "ref" }))] : null;
    const tipRow = (s, k, i) => ({
      name: n > 1 ? s.name : "", color: col(spec, s, k),
      value: norm ? `${fmt(v(s, i), vf)} (${fmt(s.values[i], f)})` : fmt(s.values[i], f),
    });
    const isLast = (k, i) => S.slice(k + 1).every(t => !(v(t, i) > 0));
    let svg, g, fitW = null;

    if (horiz) {
      const bar = stacked || n === 1 ? 20 : Math.max(8, Math.min(16, 40 / n));
      const inner = stacked ? bar : n * bar + (n - 1) * 2, band = inner + 14;
      const labW = Math.min(W * 0.38, Math.max(...L.map(l => textW(l))) + 18);
      const valW = showVals ? Math.max(...L.map((_, i) => textW(fmt(stacked ? all[i] : Math.max(...S.map(s => v(s, i))), vf)))) + 10 : 0;
      const x0 = labW, x1 = W - Math.max(valW, textW(tickFmt(hi, vf, T)) / 2 + 2);
      const sx = x => x0 + (x - lo) / (hi - lo) * (x1 - x0), H = L.length * band;
      [svg, g] = svgRoot(W, H + 24, spec.title);
      for (const t of T) {
        svgEl("line", { x1: sx(t), x2: sx(t), y1: 0, y2: H, class: t === 0 ? "axis" : "grid" }, g);
        text(g, sx(t), H + 14, tickFmt(t, vf, T), "middle");
      }
      refs.forEach(r => svgEl("line", { x1: sx(+r.value), x2: sx(+r.value), y1: -4, y2: H + 4, class: "ref" }, g)); // under the bars and labels
      L.forEach((lab, i) => {
        const y = i * band + (band - inner) / 2;
        text(g, x0 - 10, i * band + band / 2, ellipsize(lab, labW - 12), "end", "lbl");
        let acc = 0;
        S.forEach((s, k) => {
          const val = v(s, i);
          if (stacked && !(val > 0)) return;
          const yy = stacked ? y : y + k * (bar + 2);
          const a = stacked ? acc : Math.min(0, val), b = stacked ? acc + val : Math.max(0, val);
          if (stacked) acc = b;
          const last = !stacked || isLast(k, i);
          const px = sx(a), pw = Math.max(1, sx(b) - sx(a) - (last ? 0 : 2));
          const m = svgEl("g", null, g);
          svgEl("rect", { x: px - 2, y: yy - 3, width: pw + 4, height: bar + 6, class: "hit" }, m);
          svgEl("path", { d: rrect(px, yy, pw, bar, END[last ? (val < 0 ? "left" : "right") : "none"]), class: "fill" }, m).style.fill = col(spec, s, k);
          hover(m, lab, [tipRow(s, k, i)], true);
          if (showVals && last) text(g, val < 0 ? px - 6 : px + pw + 6, yy + bar / 2, fmt(stacked ? acc : val, vf), val < 0 ? "end" : "start", "val");
        });
      });
    } else {
      const H = spec.height || 260, top = showVals ? 20 : 8, axisH = 22;
      const labW = Math.max(...T.map(t => textW(tickFmt(t, vf, T)))) + 10;
      // Size to the columns: each category gets a band of about 2x its columns, so a few categories make a
      // narrow, centred card instead of thin columns far apart. Many categories still fill the width.
      const BAR = stacked || n === 1 ? 48 : 28, band = (stacked ? BAR : n * BAR + (n - 1) * 2) + Math.max(40, BAR);
      fitW = Math.max(360, labW + L.length * band + 4);
      W = Math.min(W, fitW);
      const x0 = labW, x1 = W - 4, bandW = (x1 - x0) / L.length;
      const bar = stacked || n === 1 ? Math.min(BAR, bandW * 0.6) : Math.min(BAR, (bandW * 0.8 - (n - 1) * 2) / n);
      const inner = stacked ? bar : n * bar + (n - 1) * 2;
      const sy = y => top + (hi - y) / (hi - lo) * (H - top);
      [svg, g] = svgRoot(W, H + axisH, spec.title);
      valueAxis(g, T, sy, x0, x1, vf);
      categoryLabels(g, L, i => x0 + bandW * (i + 0.5), H + 14, bandW);
      refs.forEach(r => svgEl("line", { x1: x0, x2: x1, y1: sy(+r.value), y2: sy(+r.value), class: "ref" }, g)); // under the bars and labels
      L.forEach((lab, i) => {
        const x = x0 + bandW * i + (bandW - inner) / 2;
        let acc = 0;
        S.forEach((s, k) => {
          const val = v(s, i);
          if (stacked && !(val > 0)) return;
          const xx = stacked ? x : x + k * (bar + 2);
          const a = stacked ? acc : Math.min(0, val), b = stacked ? acc + val : Math.max(0, val);
          if (stacked) acc = b;
          const last = !stacked || isLast(k, i);
          const py = sy(b) + (last ? 0 : 2), ph = Math.max(1, sy(a) - sy(b) - (last ? 0 : 2));
          const m = svgEl("g", null, g);
          svgEl("rect", { x: xx - 3, y: py - 2, width: bar + 6, height: ph + 4, class: "hit" }, m);
          svgEl("path", { d: rrect(xx, py, bar, ph, END[last ? (val < 0 ? "down" : "up") : "none"]), class: "fill" }, m).style.fill = col(spec, s, k);
          hover(m, lab, [tipRow(s, k, i)], true);
          if (showVals && last && textW(fmt(stacked ? acc : val, vf)) < bandW) text(g, xx + bar / 2, val < 0 ? py + ph + 10 : py - 10, fmt(stacked ? acc : val, vf), "middle", "val");
        });
      });
    }
    return { node: svg, legend, legendAlways: refs.length > 0, table: labelTable(spec, S, f), fitW }; // a reference line is always named
  }

  /* ---------- line and area (single, multi, stacked area); crosshair + one tooltip for every series ---------- */
  function lines(spec, W, area) {
    const S = series(spec), L = spec.labels, f = spec.format || {}, n = S.length, N = L.length;
    const stacked = area && !!spec.stacked;
    const num = x => (x == null || x === "" ? null : +x);
    const cum = S.map(s => s.values.map(num));
    if (stacked) for (let k = 1; k < n; k++) cum[k] = cum[k].map((x, i) => (x ?? 0) + (cum[k - 1][i] ?? 0));
    const vals = cum.flat().filter(x => x != null);
    if (!vals.length) throw new Error("no numeric values to plot");
    const zero = area || spec.zero !== false;
    const T = niceTicks(zero ? Math.min(0, ...vals) : Math.min(...vals), zero ? Math.max(0, ...vals) : Math.max(...vals), 5);
    const lo = T[0], hi = T[T.length - 1];
    const ends = S.map((s, k) => { let i = N - 1; while (i > 0 && cum[k][i] == null) i--; return i; });
    const direct = n === 1 ? [fmt(S[0].values[ends[0]], f)] : n <= 4 ? S.map(s => s.name) : null;
    const H = spec.height || 260, top = 10;
    const labW = Math.max(...T.map(t => textW(tickFmt(t, f, T)))) + 10;
    const x0 = labW, x1 = W - (direct ? Math.min(W * 0.25, Math.max(...direct.map(d => textW(d)))) + 14 : 10);
    const px = i => (N === 1 ? (x0 + x1) / 2 : x0 + i * (x1 - x0) / (N - 1));
    const sy = y => top + (hi - y) / (hi - lo) * (H - top);
    const [svg, g] = svgRoot(W, H + 22, spec.title);
    valueAxis(g, T, sy, x0, x1, f);
    categoryLabels(g, L, px, H + 14, (x1 - x0) / Math.max(1, N - 1));
    const path = (k, base) => {
      let d = "", pen = false;
      cum[k].forEach((y, i) => { if (y == null) { pen = false; return; } d += (pen ? "L" : "M") + px(i) + "," + sy(y); pen = true; });
      if (!base) return d;
      const back = cum[k].map((_, i) => N - 1 - i).map(i => `L${px(i)},${sy(base(i))}`).join("");
      return d + back + "Z";
    };
    S.forEach((s, k) => {
      const c = col(spec, s, k);
      if (area) svgEl("path", { d: path(k, i => (stacked && k ? cum[k - 1][i] ?? 0 : Math.max(lo, 0))), class: "area" }, g).style.fill = c;
      svgEl("path", { d: path(k), class: "line" }, g).style.stroke = c;
      const e = ends[k];
      if (cum[k][e] != null) svgEl("circle", { cx: px(e), cy: sy(cum[k][e]), r: 4, class: "dot" }, g).style.fill = c;
    });
    if (direct) {
      const ys = S.map((_, k) => sy(cum[k][ends[k]] ?? lo));
      const sorted = [...ys].sort((a, b) => a - b);
      const clear = sorted.every((y, i) => !i || y - sorted[i - 1] >= 14);
      if (n === 1 || clear) direct.forEach((d, k) => text(g, px(ends[k]) + 10, ys[k], ellipsize(d, W - px(ends[k]) - 12), "start", n === 1 ? "val" : "lbl"));
    }
    // Crosshair: snaps to the nearest label; arrow keys move it when focused.
    const cross = svgEl("line", { y1: top, y2: H, class: "cross", visibility: "hidden" }, g);
    const hit = svgEl("rect", { x: x0, y: 0, width: Math.max(1, x1 - x0), height: H, class: "hit", tabindex: 0, "aria-label": `${spec.title || "chart"}: use arrow keys to read values` }, g);
    let cur = N - 1;
    const show = (i, evt) => {
      cur = Math.max(0, Math.min(N - 1, i));
      cross.setAttribute("x1", px(cur)); cross.setAttribute("x2", px(cur)); cross.setAttribute("visibility", "visible");
      const rows = S.map((s, k) => ({ name: n > 1 ? s.name : "", value: fmt(s.values[cur], f), color: col(spec, s, k) }));
      if (stacked) rows.reverse();
      showTip(evt, L[cur], rows);
    };
    const hide = () => { cross.setAttribute("visibility", "hidden"); hideTip(); };
    hit.addEventListener("pointermove", e => {
      const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * (W / r.width);
      show(Math.round((x - x0) / ((x1 - x0) / Math.max(1, N - 1))), e);
    });
    hit.addEventListener("pointerleave", hide);
    hit.addEventListener("blur", hide);
    hit.addEventListener("focus", e => show(cur, { type: "focus", target: cross, anchor: cross }));
    hit.addEventListener("keydown", e => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      show(cur + (e.key === "ArrowRight" ? 1 : -1), { type: "keydown", anchor: cross });
    });
    const legend = n > 1 ? S.map((s, k) => ({ name: s.name, color: col(spec, s, k), shape: area ? "rect" : "line" })) : null;
    return { node: svg, legend, table: labelTable(spec, S, f) };
  }

  /* ---------- scatter (<= 3 series) ---------- */
  function scatter(spec, W) {
    const S = spec.series || [];
    if (!S.length) throw new Error('scatter needs series[] with points[] ([x, y] or {x, y, label, highlight})');
    if (S.length > 3) console.warn("report charts: scatter separates at most 3 series by colour; fold the rest into one 'Other' series");
    const P = S.flatMap((s, k) => (s.points || []).map(p => (Array.isArray(p) ? { x: +p[0], y: +p[1], label: p[2], highlight: p[3] } : { ...p, x: +p.x, y: +p.y })).map(p => ({ ...p, s, k })));
    if (!P.length) throw new Error("scatter has no points");
    const xf = spec.xFormat || {}, yf = spec.yFormat || {};
    const xs = P.map(p => p.x), ys = P.map(p => p.y);
    const XT = niceTicks(spec.xZero ? Math.min(0, ...xs) : Math.min(...xs), Math.max(...xs), Math.max(2, Math.floor(W / 110)));
    const YT = niceTicks(spec.yZero ? Math.min(0, ...ys) : Math.min(...ys), Math.max(...ys), 5);
    const H = spec.height || 300, top = 8;
    const labW = Math.max(...YT.map(t => textW(tickFmt(t, yf, YT)))) + 10;
    const x0 = labW, x1 = W - 10;
    const sx = x => x0 + (x - XT[0]) / (XT[XT.length - 1] - XT[0]) * (x1 - x0);
    const sy = y => top + (YT[YT.length - 1] - y) / (YT[YT.length - 1] - YT[0]) * (H - top);
    const [svg, g] = svgRoot(W, H + 22, spec.title);
    valueAxis(g, YT, sy, x0, x1, yf);
    XT.forEach((t, i) => {
      svgEl("line", { x1: sx(t), x2: sx(t), y1: top, y2: H, class: i === 0 ? "axis" : "grid" }, g);
      text(g, sx(t), H + 14, tickFmt(t, xf, XT), "middle");
    });
    for (const p of P) {
      const m = svgEl("g", null, g), c = col(spec, p.s, p.k), cx = sx(p.x), cy = sy(p.y);
      svgEl("circle", { cx, cy, r: 12, class: "hit" }, m);
      svgEl("circle", { cx, cy, r: 4, class: "dot" }, m).style.fill = c;
      hover(m, p.label || (S.length > 1 ? p.s.name : ""), [
        { name: spec.xTitle || "x", value: fmt(p.x, xf), color: c },
        { name: spec.yTitle || "y", value: fmt(p.y, yf) },
      ], false);
      if (p.highlight && p.label) {
        const right = cx + 8 + textW(p.label) < x1;
        text(g, right ? cx + 8 : cx - 8, cy - 8, p.label, right ? "start" : "end", "lbl");
      }
    }
    return {
      node: svg,
      legend: S.length > 1 ? S.map((s, k) => ({ name: s.name, color: col(spec, s, k), shape: "dot" })) : null,
      table: { head: ["Series", spec.xTitle || "x", spec.yTitle || "y", "Label"], rows: P.map(p => [p.s.name, fmt(p.x, xf), fmt(p.y, yf), p.label || ""]) },
    };
  }

  /* ---------- histogram (raw values binned here, or precomputed bins) ---------- */
  function histogram(spec, W) {
    const f = spec.format || {};
    let B = spec.bins;
    if (!B) {
      const v = (spec.values || []).map(Number).filter(Number.isFinite);
      if (!v.length) throw new Error("histogram needs values[] or bins[{from, to, count}]");
      const E = niceTicks(Math.min(...v), Math.max(...v), spec.binCount || Math.min(30, Math.max(5, Math.ceil(Math.log2(v.length) + 1))));
      const w = E[1] - E[0];
      B = E.slice(0, -1).map((a, i) => ({ from: a, to: E[i + 1], count: 0 }));
      v.forEach(x => B[Math.min(B.length - 1, Math.floor((x - E[0]) / w))].count++);
    }
    const T = niceTicks(0, Math.max(...B.map(b => b.count)), 5);
    const H = spec.height || 240, top = 8;
    const labW = Math.max(...T.map(t => textW(tickFmt(t, {}, T)))) + 10;
    const x0 = labW, x1 = W - 8, lo = B[0].from, hi = B[B.length - 1].to;
    const sx = x => x0 + (x - lo) / (hi - lo) * (x1 - x0);
    const sy = y => top + (T[T.length - 1] - y) / (T[T.length - 1] - T[0]) * (H - top);
    const [svg, g] = svgRoot(W, H + 22, spec.title);
    valueAxis(g, T, sy, x0, x1, {});
    const edges = [...B.map(b => b.from), hi];
    const every = Math.max(1, Math.ceil((Math.max(...edges.map(e => textW(fmt(e, f)))) + 12) / ((x1 - x0) / B.length)));
    edges.forEach((e, i) => { if (i % every === 0) text(g, sx(e), H + 14, fmt(e, f), "middle"); });
    B.forEach(b => {
      const m = svgEl("g", null, g), x = sx(b.from) + 1, w = Math.max(1, sx(b.to) - sx(b.from) - 2);
      svgEl("rect", { x, y: top, width: w, height: H - top, class: "hit" }, m);
      if (b.count) svgEl("path", { d: rrect(x, sy(b.count), w, H - sy(b.count), END.up), class: "fill" }, m).style.fill = "var(--chart-1)";
      hover(m, `${fmt(b.from, f)} to ${fmt(b.to, f)}`, [{ value: fmt(b.count), name: spec.countLabel || "count", color: "var(--chart-1)" }], true);
    });
    return { node: svg, table: { head: ["From", "To", spec.countLabel || "Count"], rows: B.map(b => [fmt(b.from, f), fmt(b.to, f), fmt(b.count)]) } };
  }

  /* ---------- heatmap: sequential (7 classes of one hue) or diverging (two poles, grey midpoint) ---------- */
  function heatmap(spec, W, fig) {
    const R = spec.rows, C = spec.cols, V = spec.values, f = spec.format || {};
    if (!Array.isArray(R) || !Array.isArray(C) || !Array.isArray(V) || V.length !== R.length) throw new Error("heatmap needs rows[], cols[] and values[rows][cols]");
    const flat = V.flat().filter(x => x != null && x !== "").map(Number);
    const lo = spec.min ?? Math.min(...flat), hi = spec.max ?? Math.max(...flat), dark = isDark(fig);
    let fill;
    if (spec.diverging) {
      const mid = spec.mid ?? 0, neg = cssVar(fig, "--chart-div-neg"), pos = cssVar(fig, "--chart-div-pos"), m0 = cssVar(fig, "--chart-div-mid");
      const span = Math.max(mid - lo, hi - mid) || 1;
      fill = x => { const t = Math.max(-1, Math.min(1, (x - mid) / span)), cls = Math.round(t * 3); return cls === 0 ? m0 : hexMix(m0, cls < 0 ? neg : pos, Math.abs(cls) / 3); };
    } else {
      fill = x => { let i = Math.min(6, Math.floor((x - lo) / ((hi - lo) || 1) * 7)); if (dark) i = 6 - i; return SEQ[i]; };
    }
    const labW = Math.min(W * 0.3, Math.max(...R.map(r => textW(r))) + 18);
    const x0 = labW, cw = (W - x0) / C.length, ch = spec.cellHeight || 28, top = 22;
    const H = top + R.length * ch;
    const [svg, g] = svgRoot(W, H + 34, spec.title);
    categoryLabels(g, C, i => x0 + cw * (i + 0.5), 10, cw);
    R.forEach((r, i) => {
      text(g, x0 - 10, top + i * ch + ch / 2, ellipsize(r, labW - 12), "end", "lbl");
      C.forEach((c, j) => {
        const raw = V[i][j], has = raw != null && raw !== "", x = x0 + j * cw + 1, y = top + i * ch + 1;
        const m = svgEl("g", null, g), hex = has ? fill(+raw) : null;
        const cell = svgEl("rect", { x, y, width: Math.max(1, cw - 2), height: ch - 2, rx: 2, class: has ? "cell" : "cell empty" }, m);
        if (has) cell.style.fill = hex;
        const label = has ? fmt(raw, f) : "";
        if (has && spec.showValues !== false && textW(label) + 8 < cw - 2) {
          const t = text(m, x + (cw - 2) / 2, y + (ch - 2) / 2, label, "middle", "in");
          t.style.fill = inkFor(hex);
        }
        hover(m, `${r} · ${c}`, [{ value: has ? label : "no data", color: hex || undefined }], false);
      });
    });
    // Scale legend: the classes in order, min and max at the ends.
    const steps = spec.diverging ? [-3, -2, -1, 0, 1, 2, 3] : [0, 1, 2, 3, 4, 5, 6];
    const sw = Math.min(28, (W - x0) / 9), ly = H + 12;
    steps.forEach((s, i) => {
      const val = spec.diverging ? (spec.mid ?? 0) + s / 3 * Math.max((spec.mid ?? 0) - lo, hi - (spec.mid ?? 0)) : lo + (s + 0.5) / 7 * (hi - lo);
      svgEl("rect", { x: x0 + i * sw, y: ly, width: sw - 2, height: 8, rx: 2 }, g).style.fill = fill(val);
    });
    text(g, x0 + 7 * sw + 6, ly + 4, `${fmt(lo, f)} to ${fmt(hi, f)}${spec.diverging ? ` (mid ${fmt(spec.mid ?? 0, f)})` : ""}`, "start");
    return { node: svg, table: { head: ["", ...C], rows: R.map((r, i) => [r, ...C.map((_, j) => fmt(V[i][j], f))]) } };
  }

  /* ---------- gantt: durations on a time (ISO strings) or numeric axis ---------- */
  const TSTEPS = [1, 2, 5, 10, 15, 30].map(s => s * 1e3).concat([1, 2, 5, 10, 15, 30].map(m => m * 6e4), [1, 2, 3, 6, 12].map(h => h * 36e5), [1, 2, 7, 14, 30].map(d => d * 864e5));
  const pad = x => String(x).padStart(2, "0");
  function timeLabel(v, step) {
    const d = new Date(v);
    if (step >= 864e5) return d.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
    const hm = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    return step >= 6e4 ? hm : `${hm}:${pad(d.getUTCSeconds())}`;
  }
  function duration(ms) {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s} s`;
    if (s < 3600) return `${Math.floor(s / 60)} min ${pad(s % 60)} s`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ${pad(Math.floor(s % 3600 / 60))} min`;
    return `${Math.floor(s / 86400)} d ${Math.floor(s % 86400 / 3600)} h`;
  }
  function gantt(spec, W) {
    const tasks = spec.tasks || [];
    if (!tasks.length) throw new Error("gantt needs tasks[{name, start, end, group}]");
    const time = typeof tasks[0].start === "string";
    const t = x => (time ? Date.parse(x) : +x);
    const rows = tasks.map(k => ({ ...k, a: t(k.start), b: t(k.end) }));
    if (rows.some(r => !Number.isFinite(r.a) || !Number.isFinite(r.b))) throw new Error("gantt start/end must be ISO date strings or numbers");
    const groups = [...new Set(rows.map(r => r.group).filter(Boolean))];
    const color = r => (r.group ? (groups.indexOf(r.group) < 8 ? `var(--chart-${groups.indexOf(r.group) + 1})` : "var(--chart-other)") : "var(--chart-1)");
    const f = spec.format || {};
    const lo = Math.min(...rows.map(r => r.a)), hi = Math.max(...rows.map(r => r.b));
    const labW = Math.min(W * 0.32, Math.max(...rows.map(r => textW(r.name))) + 18);
    const x0 = labW, x1 = W - 12, count = Math.max(2, Math.floor((x1 - x0) / 90));
    let ticks, tl, dlo = lo, dhi = hi;
    if (time) {
      const step = TSTEPS.find(s => (hi - lo) / s <= count) || TSTEPS[TSTEPS.length - 1];
      ticks = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
      tl = v => timeLabel(v, step);
    } else {
      ticks = niceTicks(lo, hi, count); dlo = ticks[0]; dhi = ticks[ticks.length - 1];
      tl = v => tickFmt(v, f, ticks);
    }
    const sx = x => x0 + (x - dlo) / ((dhi - dlo) || 1) * (x1 - x0);
    const band = 28, bar = 16, H = rows.length * band;
    const [svg, g] = svgRoot(W, H + 24, spec.title);
    ticks.forEach(v => { svgEl("line", { x1: sx(v), x2: sx(v), y1: 0, y2: H, class: "grid" }, g); text(g, sx(v), H + 14, tl(v), "middle"); });
    svgEl("line", { x1: x0, x2: x1, y1: H, y2: H, class: "axis" }, g);
    rows.forEach((r, i) => {
      const y = i * band + (band - bar) / 2, x = sx(r.a), w = Math.max(2, sx(r.b) - sx(r.a));
      text(g, x0 - 10, i * band + band / 2, ellipsize(r.name, labW - 12), "end", "lbl");
      const m = svgEl("g", null, g);
      svgEl("rect", { x: x - 2, y: y - 4, width: w + 4, height: bar + 8, class: "hit" }, m);
      svgEl("path", { d: rrect(x, y, w, bar, END.all), class: "fill" }, m).style.fill = color(r);
      const len = r.b - r.a;
      hover(m, r.name, [{ value: time ? duration(len) : fmt(len, f), name: `${time ? timeLabel(r.a, 1e3) : fmt(r.a, f)} → ${time ? timeLabel(r.b, 1e3) : fmt(r.b, f)}`, color: color(r) }], true);
    });
    return {
      node: svg,
      legend: groups.length > 1 ? groups.map((gr, i) => ({ name: gr, color: i < 8 ? `var(--chart-${i + 1})` : "var(--chart-other)", shape: "rect" })) : null,
      table: { head: ["Task", "Start", "End", "Length", ...(groups.length ? ["Group"] : [])], rows: rows.map(r => [r.name, String(r.start), String(r.end), time ? duration(r.b - r.a) : fmt(r.b - r.a, f), ...(groups.length ? [r.group || ""] : [])]) },
    };
  }

  /* ---------- meter list: one ratio per row against its own limit; figures always visible ---------- */
  const STATUS = { good: "Good", warning: "Warning", serious: "Serious", critical: "Critical" };
  function meter(spec) {
    const items = spec.items || [];
    if (!items.length) throw new Error("meter needs items[{name, value, max, target, status}]");
    const f = spec.format || {};
    const list = htmlEl("div", "chart-meters");
    items.forEach(it => {
      const max = it.max ?? 100, pct = Math.max(0, Math.min(100, (+it.value / max) * 100));
      const row = htmlEl("div", "chart-meter", list);
      htmlEl("span", "chart-meter-name", row, it.name);
      const track = htmlEl("span", "chart-meter-track", row);
      const c = it.status && STATUS[it.status] ? `var(--status-${it.status})` : "var(--chart-1)";
      track.style.setProperty("--c", c);
      htmlEl("span", "chart-meter-fill", track).style.width = pct + "%";
      if (it.target != null) htmlEl("span", "chart-meter-target", track).style.left = Math.min(100, (it.target / max) * 100) + "%";
      if (it.target != null) hover(track, it.name, [{ value: fmt(it.value, f), color: c }, { value: fmt(it.target, f), name: "target" }], true);
      track.setAttribute("role", "meter");
      track.setAttribute("aria-valuenow", it.value); track.setAttribute("aria-valuemin", 0); track.setAttribute("aria-valuemax", max);
      track.setAttribute("aria-label", it.target != null ? `${it.name}, target ${fmt(it.target, f)}` : it.name);
      const fig = htmlEl("span", "chart-meter-figure", row, (spec.showMax ?? max !== 100) ? `${fmt(it.value, f)} / ${fmt(max, f)}` : fmt(it.value, f));
      const word = it.statusLabel ?? STATUS[it.status]; // "statusLabel" overrides the word ("Miss", "Done"); the colour stays the status
      if (word) htmlEl("span", "chart-meter-status", fig, word).style.setProperty("--c", c);
    });
    return { node: list };
  }

  /* ---------- segmented bar: one whole split into <= 6 parts (tall, labelled) or thin (no text) ---------- */
  function segmented(spec, W) {
    const parts = (spec.parts || []).filter(p => +p.value > 0);
    if (!parts.length) throw new Error("segmented needs parts[{name, value}]");
    if (parts.length > 6) console.warn("report charts: a segmented bar reads best with 6 parts or fewer; fold the tail into 'Other'");
    const f = spec.format || {}, total = parts.reduce((a, p) => a + +p.value, 0), thin = !!spec.thin;
    const wrap = htmlEl("div", "chart-seg" + (thin ? " thin" : ""));
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", parts.map(p => `${p.name} ${fmt(+p.value / total * 100, { decimals: 0, suffix: "%" })}`).join(", "));
    parts.forEach((p, k) => {
      const share = +p.value / total, c = col(spec, p, k);
      const b = htmlEl("span", "chart-seg-part", wrap);
      b.style.flexGrow = share; b.style.setProperty("--c", c);
      const label = spec.labelValues ? fmt(p.value, f) : fmt(share * 100, { decimals: 0, suffix: "%" });
      if (!thin && textW(label, 13) + 16 < share * W) {
        const t = htmlEl("span", "chart-seg-label", b, label);
        // White on every slot except yellow (slot 4), where near-black reads.
        if ((p.slot || k + 1) === 4) t.style.color = INK_ON_FILL.dark;
      }
      hover(b, p.name, [{ value: fmt(p.value, f), name: fmt(share * 100, { decimals: 1, suffix: "%" }), color: c }], true);
    });
    return {
      node: wrap, legendAlways: true,
      legend: parts.map((p, k) => ({ name: p.name, color: col(spec, p, k), shape: "rect" })),
      table: { head: ["Part", spec.valueTitle || "Value", "Share"], rows: parts.map(p => [p.name, fmt(p.value, f), fmt(+p.value / total * 100, { decimals: 1, suffix: "%" })]) },
    };
  }

  /* ---------- sparkline: a small trend, muted line, last point in the accent ---------- */
  function sparkSvg(values, w, h, label) {
    const v = values.map(Number).filter(Number.isFinite);
    const svg = svgEl("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": label || `trend from ${v[0]} to ${v[v.length - 1]}`, class: "spark-svg" });
    if (v.length < 2) return svg;
    const lo = Math.min(...v), hi = Math.max(...v), p = 3;
    const x = i => p + i * (w - 2 * p) / (v.length - 1), y = d => h - p - (d - lo) / ((hi - lo) || 1) * (h - 2 * p);
    svgEl("path", { d: v.map((d, i) => (i ? "L" : "M") + x(i) + "," + y(d)).join(""), class: "spark-line" }, svg);
    svgEl("circle", { cx: x(v.length - 1), cy: y(v[v.length - 1]), r: 2.5, class: "spark-dot" }, svg);
    return svg;
  }
  function sparkline(spec) {
    if (!Array.isArray(spec.values)) throw new Error("sparkline needs values[]");
    return { node: sparkSvg(spec.values, spec.width || 160, spec.height || 32, spec.title) };
  }
  function sparkInline(el) {
    el.replaceChildren(sparkSvg(el.dataset.values.split(","), el.clientWidth || 80, el.clientHeight || 20, el.getAttribute("aria-label")));
  }

  /* ---------- frame: title, subtitle, legend, axis titles, plot, source, table view ---------- */
  const TYPES = {
    bar: (s, W) => bars(s, W, true), column: (s, W) => bars(s, W, false),
    line: (s, W) => lines(s, W, false), area: (s, W) => lines(s, W, true),
    scatter, histogram, heatmap, gantt, meter, segmented, sparkline,
  };
  function render(fig) {
    const src = fig.querySelector(':scope > script[type="application/json"]');
    fig.querySelectorAll(":scope > :not(script)").forEach(n => n.remove());
    let spec;
    try {
      if (!src) throw new Error('missing <script type="application/json"> spec');
      spec = JSON.parse(src.textContent);
      if (!TYPES[spec.type]) throw new Error(`unknown chart type "${spec.type}"; use one of ${Object.keys(TYPES).join(", ")}`);
      const cs = getComputedStyle(fig); // the card's padding is not plot width
      const W = Math.max(240, Math.floor(fig.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)));
      const out = TYPES[spec.type](spec, W, fig);
      // A chart that sizes to its content (columns) caps its card at that width; the card centres itself.
      fig.style.maxWidth = out.fitW ? `${Math.ceil(out.fitW + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth))}px` : "";
      fig.classList.toggle("fit", !!out.fitW);
      // Card head: title and subtitle centred; then one row, "↑ y title" on the left and the legend on the right.
      if (spec.title || spec.subtitle) {
        const titles = htmlEl("div", "chart-titles", fig);
        if (spec.title) htmlEl("p", "chart-title", titles, spec.title);
        if (spec.subtitle) htmlEl("p", "chart-sub", titles, spec.subtitle);
      }
      const guide = htmlEl("div", "chart-guide", fig);
      if (spec.yTitle && spec.type !== "bar") htmlEl("p", "chart-axis-title", guide, "↑ " + spec.yTitle);
      if (out.legend && (out.legend.length > 1 || out.legendAlways)) {
        const ul = htmlEl("ul", "chart-legend", guide);
        out.legend.forEach(it => {
          const li = htmlEl("li", null, ul);
          htmlEl("span", "chart-key " + it.shape, li).style.setProperty("--c", it.color);
          htmlEl("span", null, li, it.name);
        });
      }
      if (!guide.children.length) guide.remove();
      htmlEl("div", "chart-plot", fig).appendChild(out.node);
      if (spec.xTitle) htmlEl("p", "chart-axis-title x", fig, spec.xTitle + " →");
      const foot = (spec.source || out.table) ? htmlEl("div", "chart-foot", fig) : null;
      if (spec.source) htmlEl("p", "chart-source", foot, "Source: " + spec.source);
      if (out.table) {
        const d = htmlEl("details", "chart-data", foot);
        htmlEl("summary", null, d, "Show data");
        // The report's own table component; a column whose filled cells are all numbers right-aligns (.num).
        const tw = htmlEl("div", "table-wrap", d), table = htmlEl("table", null, tw);
        const isNum = c => /^[−+-]?[£$€]?\d[\d,.]*\s*\S{0,4}(\s*\(.*\))?$/.test(String(c).trim());
        const numCol = out.table.head.map((_, j) => {
          const cells = out.table.rows.map(r => String(r[j] ?? "").trim()).filter(c => c && c !== "–");
          return cells.length > 0 && cells.every(isNum);
        });
        const hr = htmlEl("tr", null, htmlEl("thead", null, table));
        out.table.head.forEach((h, j) => htmlEl("th", numCol[j] ? "num" : null, hr, h));
        const tb = htmlEl("tbody", null, table);
        out.table.rows.forEach(r => { const tr = htmlEl("tr", null, tb); r.forEach((c, j) => htmlEl("td", numCol[j] ? "num" : null, tr, c)); });
      }
    } catch (e) {
      fig.querySelectorAll(":scope > :not(script)").forEach(n => n.remove());
      htmlEl("p", "chart-error", fig, "Chart error: " + e.message);
      console.error("report charts:", e, fig);
    }
  }
  function renderAll(root) {
    root = root || document;
    FONT = getComputedStyle(document.body).fontFamily || FONT;
    root.querySelectorAll("figure.chart").forEach(fig => {
      render(fig);
      if (!fig._chartRO && window.ResizeObserver) {
        let w = fig.clientWidth;
        fig._chartRO = new ResizeObserver(() => { if (Math.abs(fig.clientWidth - w) > 1) { w = fig.clientWidth; render(fig); } });
        fig._chartRO.observe(fig);
      }
    });
    root.querySelectorAll(".spark[data-values]").forEach(sparkInline);
  }

  // Heatmap colours are computed here, so re-render when the theme changes. Label widths depend on the web font.
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => renderAll());
  new MutationObserver(() => renderAll()).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (document.fonts) document.fonts.ready.then(() => renderAll());
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => renderAll());
  else renderAll();
  window.ReportCharts = { render, renderAll, niceTicks, fmt };
})();
