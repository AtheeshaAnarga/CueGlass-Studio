#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Pathfinder Glass — One-Click macOS .command Auto-Builder & DMG Exporter
# Double-click this file in Finder (or run in Terminal) on your MacBook.
# Automatically builds Release .app, exports Pathfinder-Glass.dmg, and reveals it.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

echo "=================================================================="
echo "  Pathfinder Glass — Automatic Release .app & .dmg Builder"
echo "  Working Directory: ${SCRIPT_DIR}"
echo "=================================================================="

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ERROR: This .command builder must be opened on macOS."
  exit 1
fi

# Kill any older running instance of PathfinderGlass so the new build can replace it cleanly
killall PathfinderGlass >/dev/null 2>&1 || true

chmod +x "${SCRIPT_DIR}/build-release.sh" "${SCRIPT_DIR}/package-dmg.sh" 2>/dev/null || true

"${SCRIPT_DIR}/package-dmg.sh"

DMG_OUT="${SCRIPT_DIR}/dist/Pathfinder-Glass.dmg"
APP_OUT="${SCRIPT_DIR}/dist/Pathfinder Glass.app"

echo ""
echo "=================================================================="
echo "  BUILD & DMG EXPORT COMPLETE!"
echo "  App Bundle : ${APP_OUT}"
echo "  DMG File   : ${DMG_OUT}"
echo "=================================================================="

# Reveal the exported .dmg in Finder and launch the built .app
if [[ -f "${DMG_OUT}" ]]; then
  open -R "${DMG_OUT}" || true
fi

if [[ -d "${APP_OUT}" ]]; then
  open "${APP_OUT}" || true
fi
