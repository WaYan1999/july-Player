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
    if [[ ! -x "$ASR_DIR/whisper-cli" ]]; then
      TMP_SRC_ARCHIVE="${TMPDIR:-/tmp}/whisper.cpp-${WHISPER_VERSION}.tar.gz"
      TMP_SRC_DIR="${TMPDIR:-/tmp}/whisper.cpp-${WHISPER_VERSION}"
      TMP_BUILD_DIR="${TMPDIR:-/tmp}/whisper.cpp-build-${WHISPER_VERSION}"
      rm -rf "$TMP_SRC_DIR" "$TMP_BUILD_DIR"

      if ! command -v cmake >/dev/null 2>&1; then
        echo "Installing CMake for macOS ASR runtime build..."
        brew install cmake
      fi

      echo "Building whisper.cpp macOS runtime..."
      download "$WHISPER_SRC_URL" "$TMP_SRC_ARCHIVE"
      mkdir -p "$TMP_SRC_DIR"
      tar -xzf "$TMP_SRC_ARCHIVE" -C "$TMP_SRC_DIR" --strip-components=1
      cmake -S "$TMP_SRC_DIR" -B "$TMP_BUILD_DIR" \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64" \
        -DGGML_METAL=OFF \
        -DWHISPER_BUILD_TESTS=OFF \
        -DWHISPER_BUILD_EXAMPLES=ON
      cmake --build "$TMP_BUILD_DIR" --config Release --target whisper-cli --parallel 2

      WHISPER_BIN="$(find "$TMP_BUILD_DIR" -type f -name whisper-cli -print -quit)"
      if [[ -z "$WHISPER_BIN" ]]; then
        echo "Could not find built whisper-cli binary" >&2
        exit 1
      fi
      cp "$WHISPER_BIN" "$ASR_DIR/whisper-cli"
      chmod +x "$ASR_DIR/whisper-cli"
    fi
    ;;
  *)
    echo "Skipping whisper.cpp runtime download on this platform."
    ;;
esac

echo "Offline ASR resources are ready in $ASR_DIR"
