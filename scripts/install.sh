#!/bin/sh
# Installs the roost-report skill and the `roost` CLI for Claude Code on this machine. Safe to re-run.
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
dest="$HOME/.claude/skills/roost-report"
node "$here/scripts/build-skill.mjs" >/dev/null 2>&1 || true   # refresh from the repo when run inside it
mkdir -p "$HOME/.claude/skills" "$HOME/.local/bin" "$HOME/.roost/drafts"
mkdir -p "$dest"
cp -R "$here/skill/roost-report/." "$dest/"   # overwrite in place; this script never removes files
chmod +x "$dest/bin/roost.mjs"
ln -sf "$dest/bin/roost.mjs" "$HOME/.local/bin/roost"
echo "Installed the skill at $dest and roost at ~/.local/bin/roost"
case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) echo "Add ~/.local/bin to your PATH." ;; esac
if [ ! -f "$HOME/.config/roost/env" ] && [ -z "${CF_ACCESS_CLIENT_ID:-}" ]; then
  echo "Next: create ~/.config/roost/env (chmod 600) with ROOST_URL, CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET."
fi
"$HOME/.local/bin/roost" doctor || true
