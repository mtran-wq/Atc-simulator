#!/usr/bin/env bash
# Assembles the game from src/ into two files:
#   dist/meridian-approach.html  page fragment (no doctype/head/body), the form the hosted artifact is published from
#   index.html                   the same page wrapped as a standalone document you can open in a browser
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
{
  cat src/page.html
  for f in src/approach.js src/voice.js src/listen.js src/ground.js; do
    echo '<script>'; cat "$f"; echo '</script>'
  done
} > dist/meridian-approach.html
{
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>'
  cat dist/meridian-approach.html
  echo '</body></html>'
} > index.html
echo "built dist/meridian-approach.html ($(wc -c < dist/meridian-approach.html) bytes) and index.html"
