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

echo "==> Stopping any running instance of Pathfinder Glass..."
killall PathfinderGlass >/dev/null 2>&1 || true

echo "==> Building latest Release app bundle..."
chmod +x "${ROOT_DIR}/build-release.sh"
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

echo "==> Installing 'Pathfinder Glass.app' to /Applications..."
if [[ -w "/Applications" ]]; then
  rm -rf "/Applications/Pathfinder Glass.app"
  cp -R "${APP_BUNDLE}" "/Applications/Pathfinder Glass.app"
  xattr -cr "/Applications/Pathfinder Glass.app" 2>/dev/null || true
  echo "SUCCESS: Installed '/Applications/Pathfinder Glass.app'"
else
  echo "NOTE: /Applications is not directly writable; launching from '${APP_BUNDLE}'"
fi

echo "SUCCESS: Packaged '${DMG_PATH}'"
open -R "${DMG_PATH}" 2>/dev/null || true
if [[ -d "/Applications/Pathfinder Glass.app" ]]; then
  open "/Applications/Pathfinder Glass.app"
else
  open "${APP_BUNDLE}"
fi
