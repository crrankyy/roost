#!/usr/bin/env python3
"""Bring a report source written before the Roost filing tags up to date, in place. Rebuild it afterwards.

Usage: python3 $SKILL/scripts/roost-migrate.py <report.src.html> --kind KIND --project SLUG [--stream SLUG] [--date YYYY-MM-DD]

- adds the report:kind, report:project, report:stream (when given) and report:date meta tags after <title>;
- marks the top bar as the host slot (data-slot="host-bar") and keeps only its theme button;
- moves the top bar's meta line (scope · date · version) into the hero, as <p class="hero-meta">, after the lead.
The date defaults to the first "17 November 2026" or "2026-11-17" found in that meta line. Running it twice changes nothing.
"""
import argparse
import re
import sys
from datetime import datetime
from pathlib import Path

KINDS = ("investigation", "architecture", "audit", "benchmark", "decision", "postmortem", "status", "changelog")
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]*$")


def date_in(text: str):
    m = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", text)
    if m:
        return m.group(1)
    m = re.search(r"\b(\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})\b", text)
    return datetime.strptime(" ".join(m.groups()), "%d %B %Y").strftime("%Y-%m-%d") if m else None


def migrate(html: str, kind: str, project: str, stream, date):
    if 'name="report:kind"' in html:
        return html, "already migrated"
    bar = re.search(r'<div class="topbar"><div class="wrap">(.*?)</div></div>', html, re.S)
    if not bar:
        sys.exit('roost-migrate: no <div class="topbar"><div class="wrap"> found')
    meta = re.search(r'<span class="meta">(.*?)(<button class="theme-toggle"[^>]*>.*?</button>)?\s*</span>', bar.group(1), re.S)
    line = re.sub(r"\s+", " ", meta.group(1)).strip() if meta else ""
    button = meta.group(2) if meta and meta.group(2) else '<button class="theme-toggle" type="button">Theme: System</button>'
    date = date or date_in(line)
    if not date:
        sys.exit("roost-migrate: no date in the top bar's meta line; pass --date YYYY-MM-DD")
    new_bar = bar.group(1)
    if meta:
        new_bar = new_bar.replace(meta.group(0), f'<span class="meta">{button}</span>')
    html = html.replace(bar.group(0), f'<div class="topbar" data-slot="host-bar"><div class="wrap">{new_bar}</div></div>', 1)
    if line:
        hero = re.search(r'<header class="hero[^"]*"><div class="wrap">.*?</header>', html, re.S)
        lead = hero and re.search(r'<p class="lead">.*?</p>', hero.group(0), re.S)
        if not lead:
            sys.exit("roost-migrate: no <p class=\"lead\"> in the hero to put the meta line after")
        indent = re.search(r"\n([ \t]*)<p class=\"lead\">", hero.group(0))
        pad = indent.group(1) if indent else "    "
        new_hero = hero.group(0).replace(lead.group(0), f'{lead.group(0)}\n{pad}<p class="hero-meta">{line}</p>', 1)
        html = html.replace(hero.group(0), new_hero, 1)
    tags = [f'<meta name="report:kind" content="{kind}">', f'<meta name="report:project" content="{project}">']
    if stream:
        tags.append(f'<meta name="report:stream" content="{stream}">')
    tags.append(f'<meta name="report:date" content="{date}">')
    html = re.sub(r"(<title>.*?</title>\n?)", lambda m: m.group(1) + ("" if m.group(1).endswith("\n") else "\n") + "\n".join(tags) + "\n", html, count=1, flags=re.S)
    return html, f"{kind} · {project}{' › ' + stream if stream else ''} · {date}; meta line: {line or '(none)'}"


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("src", type=Path)
    ap.add_argument("--kind", required=True, choices=KINDS)
    ap.add_argument("--project", required=True)
    ap.add_argument("--stream")
    ap.add_argument("--date")
    a = ap.parse_args()
    for v in (a.project, a.stream):
        if v is not None and not SLUG.match(v):
            sys.exit(f"roost-migrate: {v!r} is not a lower-case slug")
    html, note = migrate(a.src.read_text(encoding="utf-8"), a.kind, a.project, a.stream, a.date)
    a.src.write_text(html, encoding="utf-8")
    print(f"{a.src}: {note}")
