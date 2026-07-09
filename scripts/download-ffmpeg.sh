#!/usr/bin/env bash
# Copies static ffmpeg + ffprobe binaries from npm packages into src-tauri/binaries/.
# Requires: npm install (already run as part of build)
#
# Usage:
#   bash scripts/download-ffmpeg.sh        # local dev
#   bash scripts/download-ffmpeg.sh --ci   # CI universal build (both archs)

set -euo pipefail

DEST="src-tauri/binaries"
mkdir -p "$DEST"

NM="node_modules"
CI_MODE="${1:-}"

if [[ "$(uname)" == "Darwin" ]]; then
  if [[ "$CI_MODE" == "--ci" ]]; then
    # Universal build needs both arch-specific AND a combined universal binary.
    # Compilation phase uses the arch-specific ones; bundling phase uses the universal.
    cp "$NM/ffprobe-static/bin/darwin/arm64/ffprobe"  "$DEST/ffprobe-aarch64-apple-darwin"
    cp "$NM/ffprobe-static/bin/darwin/x64/ffprobe"    "$DEST/ffprobe-x86_64-apple-darwin"
    cp "$NM/ffmpeg-static/ffmpeg"                      "$DEST/ffmpeg-aarch64-apple-darwin"
    cp "$NM/ffmpeg-static/ffmpeg"                      "$DEST/ffmpeg-x86_64-apple-darwin"
    chmod +x "$DEST/ffprobe-aarch64-apple-darwin" "$DEST/ffprobe-x86_64-apple-darwin" \
             "$DEST/ffmpeg-aarch64-apple-darwin"  "$DEST/ffmpeg-x86_64-apple-darwin"

    # Create universal (fat) binaries for the bundling phase.
    for BIN in ffprobe ffmpeg; do
      lipo -create "$DEST/${BIN}-aarch64-apple-darwin" "$DEST/${BIN}-x86_64-apple-darwin" \
        -output "$DEST/${BIN}-universal-apple-darwin" 2>/dev/null || \
        cp "$DEST/${BIN}-aarch64-apple-darwin" "$DEST/${BIN}-universal-apple-darwin"
      chmod +x "$DEST/${BIN}-universal-apple-darwin"
    done
  else
    ARCH=$(uname -m)
    [[ "$ARCH" == "arm64" ]] && TRIPLE="aarch64-apple-darwin" || TRIPLE="x86_64-apple-darwin"
    [[ "$ARCH" == "arm64" ]] && FFPROBE_DIR="arm64" || FFPROBE_DIR="x64"

    cp "$NM/ffprobe-static/bin/darwin/$FFPROBE_DIR/ffprobe" "$DEST/ffprobe-$TRIPLE"
    cp "$NM/ffmpeg-static/ffmpeg"                            "$DEST/ffmpeg-$TRIPLE"
    chmod +x "$DEST/ffprobe-$TRIPLE" "$DEST/ffmpeg-$TRIPLE"
  fi

  for f in "$DEST"/ff*-*-apple-darwin; do
    echo "✓ $f  ($(ls -lh "$f" | awk '{print $5}'), $(file "$f" | grep -o 'arm64\|x86_64'))"
  done

elif [[ "$(uname)" == "MINGW"* ]] || [[ "$(uname)" == "MSYS"* ]] || [[ "$(uname)" == *"NT"* ]]; then
  pick_first_working_binary() {
    local label="$1"
    shift
    local candidate=""
    for candidate in "$@"; do
      if [[ -n "$candidate" && -f "$candidate" ]] && "$candidate" -version >/dev/null 2>&1; then
        echo "$candidate"
        return 0
      fi
    done
    echo "Could not find a working $label binary." >&2
    return 1
  }

  compact_windows_binary() {
    local bin="$1"
    if command -v upx >/dev/null 2>&1; then
      local before
      before=$(wc -c < "$bin" | tr -d ' ')
      local backup="${bin}.before-upx"
      cp "$bin" "$backup"
      echo "Compressing $(basename "$bin") with UPX to keep the updater package below JulyRes upload limits..."
      if upx --best --lzma "$bin" >/dev/null 2>&1 && "$bin" -version >/dev/null 2>&1; then
        local after
        after=$(wc -c < "$bin" | tr -d ' ')
        echo "  $(basename "$bin"): ${before} -> ${after} bytes"
        rm -f "$backup"
      else
        mv "$backup" "$bin"
        echo "  UPX compression skipped/failed for $(basename "$bin"); restored the verified original." >&2
      fi
    fi
  }

  FFMPEG_SRC="$(pick_first_working_binary "ffmpeg" \
    "${FFMPEG_BIN:-}" \
    "$NM/ffmpeg-static/ffmpeg.exe" \
    /c/ProgramData/chocolatey/lib/ffmpeg/tools/ffmpeg/bin/ffmpeg.exe \
    /c/ProgramData/chocolatey/lib/ffmpeg*/tools/ffmpeg/bin/ffmpeg.exe \
    "$(command -v ffmpeg.exe 2>/dev/null || true)")"

  FFPROBE_SRC="$(pick_first_working_binary "ffprobe" \
    "${FFPROBE_BIN:-}" \
    "$NM/ffprobe-static/bin/win32/x64/ffprobe.exe" \
    /c/ProgramData/chocolatey/lib/ffmpeg/tools/ffmpeg/bin/ffprobe.exe \
    /c/ProgramData/chocolatey/lib/ffmpeg*/tools/ffmpeg/bin/ffprobe.exe \
    "$(command -v ffprobe.exe 2>/dev/null || true)")"

  cp "$FFPROBE_SRC" "$DEST/ffprobe-x86_64-pc-windows-msvc.exe"
  cp "$FFMPEG_SRC"  "$DEST/ffmpeg-x86_64-pc-windows-msvc.exe"
  compact_windows_binary "$DEST/ffprobe-x86_64-pc-windows-msvc.exe"
  compact_windows_binary "$DEST/ffmpeg-x86_64-pc-windows-msvc.exe"
  "$DEST/ffprobe-x86_64-pc-windows-msvc.exe" -version >/dev/null
  "$DEST/ffmpeg-x86_64-pc-windows-msvc.exe" -version >/dev/null
  echo "✓ $DEST/ffprobe-x86_64-pc-windows-msvc.exe"
  echo "✓ $DEST/ffmpeg-x86_64-pc-windows-msvc.exe"
fi
