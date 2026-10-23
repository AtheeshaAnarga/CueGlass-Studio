#!/usr/bin/env bash
set -euo pipefail

# Pathfinder Glass — Local DMG Packager
# Always rebuilds Release .app and produces: dist/Pathfinder-Glass.dmg

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ERROR: package-dmg.sh requires macOS with 'hdiutil'." >&2
  exit 1
fi

if ! command -v hdiutil >/dev/null 2>&1; then
  echo "ERROR: 'hdiutil' not found." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
APP_BUNDLE="${DIST_DIR}/Pathfinder Glass.app"
DMG_PATH="${DIST_DIR}/Pathfinder-Glass.dmg"
STAGING_DIR="${DIST_DIR}/dmg-staging"

echo "==> Building latest Release app bundle..."
"${ROOT_DIR}/build-release.sh"

rm -rf "${STAGING_DIR}" "${DMG_PATH}"
mkdir -p "${STAGING_DIR}"
cp -R "${APP_BUNDLE}" "${STAGING_DIR}/"
ln -s /Applications "${STAGING_DIR}/Applications"

echo "==> Creating compressed disk image '${DMG_PATH}'..."
hdiutil create \
  -volname "Pathfinder Glass" \
  -srcfolder "${STAGING_DIR}" \
  -ov \
  -format UDZO \
  "${DMG_PATH}"

rm -rf "${STAGING_DIR}"
echo "SUCCESS: Packaged '${DMG_PATH}'"
