# /// script
# dependencies = ["websocket-client"]
# ///
"""Check a built report the way a reader sees it: light and dark, desktop and phone width.

Usage: uv run $SKILL/scripts/check.py <report.html> [out-dir]

Renders the report in headless Chrome at 1400px and 500px wide, forcing each theme (the operating system's
setting is ignored), and saves the page in viewport-sized slices: <out>/<width>-<theme>-NN.png. Look at them.
Prints, per variant, chart errors, sideways page scroll, untinted code windows and charts with marks drawn black (a colour that failed to resolve);
and once, the filing Roost reads (report:kind and report:project meta tags) and the top bar's host slot. Exits 1 if any are found.
Set CHROME to the browser binary if it isn't at the macOS default.
"""
import base64
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

import websocket

CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
WIDTHS, THEMES, VIEW_H = (1400, 500), ("light", "dark"), 1000

PROBE = """(() => {
  const d = document.documentElement;
  const untinted = [...document.querySelectorAll('.window:not(.src) pre')].filter(p =>
    !p.querySelector('[class*="language-"], .token, .k, .s, .c, .ln')).length;
  // A colour charts.js built wrong (e.g. "#NaNNaNNaN") is dropped by the browser, which then fills the mark
  // black; no theme uses pure black for a chart mark, so count marks that came out black.
  const badColours = [...document.querySelectorAll('.chart svg rect, .chart svg path, .chart svg circle')]
    .filter(el => getComputedStyle(el).fill === 'rgb(0, 0, 0)')
    .map(el => (el.closest('.chart').querySelector('.chart-title, figcaption, h3')?.textContent || 'chart').slice(0, 60));
  const badCharts = [...new Set(badColours)];
  // Every table card names itself: a <caption> title or a <p class="source"> footer inside .table-wrap.
  const untitled = [...document.querySelectorAll('.table-wrap')].filter(w => w.closest('template, .chart') === null &&
    !w.querySelector('caption') && !w.querySelector(':scope > .source')).length;
  // Filing and hosting: Roost lists a report by these tags and replaces its top bar with its own.
  const KINDS = ['investigation', 'architecture', 'audit', 'benchmark', 'decision', 'postmortem', 'status', 'changelog'];
  const meta = n => (document.querySelector(`meta[name="report:${n}"]`)?.content || '').trim();
  const filing = [];
  if (!KINDS.includes(meta('kind'))) filing.push(`report:kind is "${meta('kind')}", not one of ${KINDS.join(', ')}`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(meta('project'))) filing.push(`report:project is "${meta('project')}", not a lower-case slug`);
  if (meta('stream') && !/^[a-z0-9][a-z0-9-]*$/.test(meta('stream'))) filing.push(`report:stream is "${meta('stream')}", not a lower-case slug`);
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(meta('date'))) filing.push(`report:date is "${meta('date')}", not YYYY-MM-DD`);
  if (!document.querySelector('.topbar[data-slot="host-bar"]')) filing.push('the top bar has no data-slot="host-bar"');
  if (document.querySelector('.topbar .meta')?.textContent.replace(/Theme:.*$/, '').trim()) filing.push('the top bar still carries a meta line; move it to the hero (.hero-meta)');
  if (!document.querySelector('.hero .hero-meta')) filing.push('the hero has no .hero-meta line (scope · date)');
  return { errors: [...document.querySelectorAll('.chart-error')].map(e => e.textContent.slice(0, 120)),
           overflow: d.scrollWidth - window.innerWidth, untinted, badColours: badCharts, untitled, filing, height: d.scrollHeight };
})()"""


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Page:
    def __init__(self, ws_url):
        self.ws, self.n = websocket.create_connection(ws_url, timeout=30), 0

    def call(self, method, **params):
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": method, "params": params}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get("id") == self.n:
                if "error" in m:
                    raise RuntimeError(f"{method}: {m['error']}")
                return m.get("result", {})

    def js(self, expr):
        return self.call("Runtime.evaluate", expression=expr, returnByValue=True)["result"].get("value")


def main(report, out):
    out.mkdir(parents=True, exist_ok=True)
    port, profile = free_port(), tempfile.mkdtemp(prefix="report-check-")
    chrome = subprocess.Popen([CHROME, "--headless=new", "--hide-scrollbars", "--disable-gpu",
                               f"--remote-debugging-port={port}", f"--user-data-dir={profile}", "about:blank"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    failed, filed = False, False
    try:
        for _ in range(100):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json"))
                break
            except OSError:
                time.sleep(0.1)
        page = Page(next(t for t in tabs if t["type"] == "page")["webSocketDebuggerUrl"])
        page.call("Page.enable")
        for width in WIDTHS:
            page.call("Emulation.setDeviceMetricsOverride", width=width, height=VIEW_H, deviceScaleFactor=1, mobile=False)
            for theme in THEMES:
                page.call("Page.navigate", url=report.resolve().as_uri())
                time.sleep(2)  # fonts, charts and Prism run on load
                page.js(f"document.documentElement.dataset.theme = '{theme}'; document.documentElement.style.scrollBehavior = 'auto'")
                time.sleep(0.4)  # charts re-render on theme change
                r = page.js(PROBE)
                shots = []
                for i, y in enumerate(range(0, r["height"], VIEW_H)):
                    page.js(f"window.scrollTo(0, {y})")
                    time.sleep(0.15)
                    f = out / f"{width}-{theme}-{i:02d}.png"
                    f.write_bytes(base64.b64decode(page.call("Page.captureScreenshot", format="png")["data"]))
                    shots.append(f)
                bad = r["errors"] or r["overflow"] > 0 or r["untinted"] or r["badColours"] or r["untitled"]
                failed |= bool(bad)
                if not filed:  # the same in every variant: report it once
                    filed = True
                    failed |= bool(r["filing"])
                    print(f"{'FAIL' if r['filing'] else 'ok  '} filing and host slot" + "".join(f"\n     {f}" for f in r["filing"]))
                print(f"{'FAIL' if bad else 'ok  '} {width}px {theme}: {len(shots)} slices, "
                      f"chart errors {len(r['errors'])}, sideways scroll {max(0, r['overflow'])}px, "
                      f"untinted code windows {r['untinted']}, charts with black marks {len(r['badColours'])}, "
                      f"tables without title or footer {r['untitled']}")
                if r["badColours"]:
                    print(f"     black marks in: {'; '.join(r['badColours'][:5])}")
                for e in r["errors"]:
                    print(f"     chart error: {e}")
    finally:
        chrome.kill()
    print(f"screenshots: {out}")
    return 1 if failed else 0


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    sys.exit(main(src, Path(sys.argv[2]) if len(sys.argv) == 3 else src.with_name(src.stem + "-check")))
