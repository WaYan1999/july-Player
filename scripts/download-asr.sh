#!/usr/bin/env bash
# Downloads the offline ASR model and whisper.cpp runtime used by the player.

set -euo pipefail

ASR_DIR="src-tauri/resources/asr"
mkdir -p "$ASR_DIR"

MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin"
WHISPER_VERSION="v1.8.6"
WHISPER_ZIP_URL="https://github.com/ggml-org/whisper.cpp/releases/download/${WHISPER_VERSION}/whisper-bin-x64.zip"
WHISPER_SRC_URL="https://github.com/ggml-org/whisper.cpp/archive/refs/tags/${WHISPER_VERSION}.tar.gz"

download() {
  local url="$1"
  local dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -L --retry 3 --retry-delay 2 -o "$dest" "$url"
  else
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '$url' -OutFile '$dest'"
  fi
}

if [[ ! -s "$ASR_DIR/ggml-tiny.bin" ]]; then
  echo "Downloading Whisper tiny ASR model..."
  download "$MODEL_URL" "$ASR_DIR/ggml-tiny.bin"
fi

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*|*NT*)
    TMP_ZIP="${TMPDIR:-/tmp}/whisper-bin-x64.zip"
    TMP_DIR="${TMPDIR:-/tmp}/whisper-bin-x64"
    rm -rf "$TMP_DIR"
    echo "Downloading whisper.cpp Windows runtime..."
    download "$WHISPER_ZIP_URL" "$TMP_ZIP"
    unzip -q "$TMP_ZIP" -d "$TMP_DIR"
    cp "$TMP_DIR/Release/whisper-cli.exe" "$ASR_DIR/whisper-cli.exe"
    cp "$TMP_DIR/Release/ggml-base.dll" "$ASR_DIR/ggml-base.dll"
    cp "$TMP_DIR/Release/ggml-cpu.dll" "$ASR_DIR/ggml-cpu.dll"
    cp "$TMP_DIR/Release/ggml.dll" "$ASR_DIR/ggml.dll"
    cp "$TMP_DIR/Release/whisper.dll" "$ASR_DIR/whisper.dll"
    cp "$TMP_DIR/Release/SDL2.dll" "$ASR_DIR/SDL2.dll"
    ;;
  Darwin*)
    echo "Offline ASR model is ready. macOS whisper runtime is not bundled in CI yet."
    ;;
  *)
    echo "Skipping whisper.cpp runtime download on this platform."
    ;;
esac

echo "Offline ASR resources are ready in $ASR_DIR"
