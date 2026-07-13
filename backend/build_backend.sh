#!/bin/bash
# Script to build the backend binary on Linux/macOS
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Installing PyInstaller..."
python -m pip install pyinstaller

echo "Building standalone backend binary..."
python -m PyInstaller pyinstaller.spec --clean --noconfirm

dictionary_dir="dist/bookwalka-backend/_internal/unidic_lite/dicdir"
if [[ ! -f "$dictionary_dir/mecabrc" || ! -f "$dictionary_dir/sys.dic" || ! -f "$dictionary_dir/matrix.bin" ]]; then
  echo "ERROR: The packaged unidic_lite dictionary is incomplete: $dictionary_dir" >&2
  exit 1
fi

echo "Done! The output is inside backend/dist/bookwalka-backend"
