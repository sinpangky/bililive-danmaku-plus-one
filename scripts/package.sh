#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXTENSION_ROOT="$ROOT/build/extension"

if [ ! -f "$EXTENSION_ROOT/manifest.json" ]; then
  echo "Build output is missing. Run npm run build first." >&2
  exit 1
fi

VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$EXTENSION_ROOT/manifest.json" | head -1 | sed 's/.*"\(.*\)"/\1/')
DIST_DIR="${1:-$ROOT/dist}"
mkdir -p "$DIST_DIR"

ARCHIVE="$DIST_DIR/danmaku-echo-v$VERSION.zip"
rm -f "$ARCHIVE"

cd "$EXTENSION_ROOT"
zip -r "$ARCHIVE" . -x "LICENSE"
cd "$ROOT"
zip "$ARCHIVE" "LICENSE"

UNZIP_OUTPUT=$(unzip -l "$ARCHIVE" 2>&1)
REQUIRED_ENTRIES=(
  "manifest.json"
  "LICENSE"
  "index.html"
  "assets/danmaku-echo-icon.png"
  "assets/icons/icon-128.png"
  "background/service-worker.js"
  "src/shared.js"
  "src/content.js"
  "src/douyin-bootstrap.js"
  "src/douyin-page-hook.js"
  "src/douyin-content.js"
  "src/douyin-content.css"
)

for entry in "${REQUIRED_ENTRIES[@]}"; do
  if ! echo "$UNZIP_OUTPUT" | grep -qF "$entry"; then
    echo "ZIP is missing required entry: $entry" >&2
    exit 1
  fi
done

if echo "$UNZIP_OUTPUT" | grep -q '\\'; then
  echo "ZIP contains non-standard backslash entry names." >&2
  exit 1
fi

HASH=$(sha256sum "$ARCHIVE" | awk '{print $1}')
echo "Created: $ARCHIVE"
echo "SHA256: $HASH"
