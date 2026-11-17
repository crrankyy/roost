#!/usr/bin/env python3
"""Inline the skill's stylesheets and scripts into a report, producing one self-contained HTML file.

Usage: python3 $SKILL/scripts/build.py <report.src.html> <report.html>

Every <link rel="stylesheet" href="X"> and <script src="X"></script> whose X is a relative path is replaced by
the file's contents, resolved against the skill's assets/ directory first, then the source file's directory.
Absolute URLs, and root paths such as /_fonts/v1/ (served by Roost), are left alone. A relative reference that resolves to nothing stops the build.
"""
import re
import sys
from pathlib import Path

ASSETS = Path(__file__).resolve().parent.parent / "assets"  # report.css, themes/, fonts/ ...
LINK = re.compile(r'<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>')
SCRIPT = re.compile(r'<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*</script>')


def build(html: str, src_dir: Path) -> str:
    def read(ref: str):
        if re.match(r"[a-z]+:|/", ref):
            return None  # absolute URL: keep the tag
        for base in (ASSETS, src_dir):
            p = base / ref
            if p.is_file():
                text = p.read_text(encoding="utf-8")
                if re.search(r"</(script|style)", text, re.I):
                    sys.exit(f"build: {p} contains a closing </script> or </style> tag; it cannot be inlined")
                return text
        sys.exit(f"build: {ref} not found in {ASSETS} or {src_dir}")

    def css(m):
        text = read(m.group(1))
        return m.group(0) if text is None else f"<style>/* {m.group(1)} */\n{text}</style>"

    def js(m):
        text = read(m.group(1))
        return m.group(0) if text is None else f"<script>/* {m.group(1)} */\n{text}</script>"

    return SCRIPT.sub(js, LINK.sub(css, html))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    result = build(src.read_text(encoding="utf-8"), src.resolve().parent)
    left = [m.group(1) for m in (*LINK.finditer(result), *SCRIPT.finditer(result)) if not re.match(r"[a-z]+:|/", m.group(1))]
    assert not left, f"local references left after inlining: {left}"
    out.write_text(result, encoding="utf-8")
    print(f"{out} {out.stat().st_size // 1024} KB")
