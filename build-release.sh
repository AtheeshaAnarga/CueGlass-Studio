#!/usr/bin/env bash
set -euo pipefail

# Pathfinder Glass (CueGlass Studio) — Native macOS Release Builder (Apple Silicon arm64)
# Produces: dist/Pathfinder Glass.app (with custom Apple Tahoe Liquid Glass AppIcon.icns)

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ERROR: build-release.sh requires macOS (Darwin) with Xcode / Swift 6 toolchain." >&2
  echo "Current host OS: $(uname -s) ($(uname -m))" >&2
  exit 1
fi

if ! command -v swift >/dev/null 2>&1; then
  echo "ERROR: 'swift' compiler not found. Install Xcode or Command Line Tools." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
APP_NAME="Pathfinder Glass.app"
APP_BUNDLE="${DIST_DIR}/${APP_NAME}"

echo "==> [1/5] Running PathfinderGlass unit tests..."
swift test --package-path "${ROOT_DIR}"

echo "==> [2/5] Compiling Release arm64 binary..."
swift build -c release --arch arm64 --package-path "${ROOT_DIR}"

BIN_PATH="$(swift build -c release --arch arm64 --package-path "${ROOT_DIR}" --show-bin-path)/PathfinderGlass"
if [[ ! -f "${BIN_PATH}" ]]; then
  echo "ERROR: Release binary not found at ${BIN_PATH}" >&2
  exit 1
fi

echo "==> [3/5] Assembling '${APP_NAME}' bundle..."
rm -rf "${APP_BUNDLE}"
mkdir -p "${APP_BUNDLE}/Contents/MacOS"
mkdir -p "${APP_BUNDLE}/Contents/Resources"

cp "${BIN_PATH}" "${APP_BUNDLE}/Contents/MacOS/PathfinderGlass"
chmod +x "${APP_BUNDLE}/Contents/MacOS/PathfinderGlass"
cp "${ROOT_DIR}/Resources/Pathfinder26.md" "${APP_BUNDLE}/Contents/Resources/Pathfinder26.md"

echo "==> [4/5] Generating macOS Tahoe Liquid Glass AppIcon.icns..."
ICONSET_DIR="${DIST_DIR}/AppIcon.iconset"
rm -rf "${ICONSET_DIR}"
mkdir -p "${ICONSET_DIR}"

swift - "${ICONSET_DIR}" << 'SWIFT_ICON_EOF'
import AppKit
import CoreGraphics

let args = CommandLine.arguments
guard args.count > 1 else { exit(1) }
let iconsetPath = args[1]

func renderIcon(size: Int) -> NSBitmapImageRep? {
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: size,
        pixelsHigh: size,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .calibratedRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else { return nil }

    NSGraphicsContext.saveGraphicsState()
    guard let ctx = NSGraphicsContext(bitmapImageRep: rep) else { return nil }
    NSGraphicsContext.current = ctx
    let cg = ctx.cgContext
    let s = CGFloat(size)

    // 1. macOS Tahoe Squircle Base
    let pad = s * 0.0625
    let sqRect = CGRect(x: pad, y: pad, width: s - pad * 2, height: s - pad * 2)
    let corner = s * 0.205
    let sqPath = NSBezierPath(roundedRect: sqRect, xRadius: corner, yRadius: corner)
    sqPath.addClip()

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let baseColors = [
        CGColor(red: 0.12, green: 0.42, blue: 1.00, alpha: 1.0),
        CGColor(red: 0.05, green: 0.23, blue: 0.62, alpha: 1.0),
        CGColor(red: 0.03, green: 0.10, blue: 0.28, alpha: 1.0)
    ] as CFArray
    if let grad = CGGradient(colorsSpace: colorSpace, colors: baseColors, locations: [0.0, 0.5, 1.0]) {
        cg.drawLinearGradient(
            grad,
            start: CGPoint(x: sqRect.minX, y: sqRect.maxY),
            end: CGPoint(x: sqRect.maxX, y: sqRect.minY),
            options: []
        )
    }

    // Specular Rim Stroke
    NSColor(calibratedWhite: 1.0, alpha: 0.65).setStroke()
    sqPath.lineWidth = max(1.0, s * 0.008)
    sqPath.stroke()

    // 2. Floating Frosted Liquid Glass Teleprompter Card
    let cardRect = CGRect(x: s * 0.17, y: s * 0.20, width: s * 0.66, height: s * 0.58)
    let cardPath = NSBezierPath(roundedRect: cardRect, xRadius: s * 0.09, yRadius: s * 0.09)
    NSColor(calibratedRed: 0.94, green: 0.98, blue: 1.0, alpha: 0.88).setFill()
    cardPath.fill()
    NSColor(calibratedWhite: 1.0, alpha: 0.95).setStroke()
    cardPath.lineWidth = max(1.0, s * 0.007)
    cardPath.stroke()

    // Active Beat Focus Bar & Spoken Line
    let barRect = CGRect(x: s * 0.225, y: s * 0.49, width: s * 0.02, height: s * 0.16)
    NSColor(calibratedRed: 0.11, green: 0.31, blue: 0.85, alpha: 1.0).setFill()
    NSBezierPath(roundedRect: barRect, xRadius: s * 0.01, yRadius: s * 0.01).fill()

    let line1 = CGRect(x: s * 0.27, y: s * 0.59, width: s * 0.36, height: s * 0.035)
    NSColor(calibratedRed: 0.06, green: 0.09, blue: 0.16, alpha: 0.92).setFill()
    NSBezierPath(roundedRect: line1, xRadius: s * 0.017, yRadius: s * 0.017).fill()

    let line2 = CGRect(x: s * 0.27, y: s * 0.52, width: s * 0.46, height: s * 0.035)
    NSColor(calibratedRed: 0.12, green: 0.25, blue: 0.68, alpha: 0.90).setFill()
    NSBezierPath(roundedRect: line2, xRadius: s * 0.017, yRadius: s * 0.017).fill()

    let line3 = CGRect(x: s * 0.27, y: s * 0.41, width: s * 0.42, height: s * 0.028)
    NSColor(calibratedRed: 0.20, green: 0.26, blue: 0.33, alpha: 0.48).setFill()
    NSBezierPath(roundedRect: line3, xRadius: s * 0.014, yRadius: s * 0.014).fill()

    let cueBadge = CGRect(x: s * 0.27, y: s * 0.28, width: s * 0.28, height: s * 0.055)
    NSColor(calibratedRed: 0.96, green: 0.62, blue: 0.04, alpha: 0.28).setFill()
    NSBezierPath(roundedRect: cueBadge, xRadius: s * 0.027, yRadius: s * 0.027).fill()

    // 3. Liquid Glass Droplet Emblem (Bottom-Right)
    let dropCircle = CGRect(x: s * 0.64, y: s * 0.13, width: s * 0.22, height: s * 0.22)
    let dropPath = NSBezierPath(ovalIn: dropCircle)
    NSColor(calibratedRed: 0.18, green: 0.68, blue: 0.98, alpha: 0.96).setFill()
    dropPath.fill()
    NSColor(calibratedWhite: 1.0, alpha: 0.95).setStroke()
    dropPath.lineWidth = max(1.0, s * 0.008)
    dropPath.stroke()

    NSGraphicsContext.restoreGraphicsState()
    return rep
}

let specs: [(String, Int)] = [
    ("icon_16x16.png", 16),
    ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32),
    ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128),
    ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256),
    ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512),
    ("icon_512x512@2x.png", 1024)
]

for (filename, px) in specs {
    if let rep = renderIcon(size: px),
       let png = rep.representation(using: .png, properties: [:]) {
        let url = URL(fileURLWithPath: iconsetPath).appendingPathComponent(filename)
        try? png.write(to: url)
    }
}
SWIFT_ICON_EOF

if command -v iconutil >/dev/null 2>&1; then
  iconutil -c icns "${ICONSET_DIR}" -o "${APP_BUNDLE}/Contents/Resources/AppIcon.icns" || true
fi
rm -rf "${ICONSET_DIR}"

if [[ -f "${ROOT_DIR}/public/cueglass-icon.svg" ]]; then
  cp "${ROOT_DIR}/public/cueglass-icon.svg" "${APP_BUNDLE}/Contents/Resources/cueglass-icon.svg"
fi

cat > "${APP_BUNDLE}/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>Pathfinder Glass</string>
  <key>CFBundleExecutable</key>
  <string>PathfinderGlass</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIconName</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>lk.ac.kln.ieeecs.PathfinderGlass</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>Pathfinder Glass</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>2.1.0</string>
  <key>CFBundleVersion</key>
  <string>3</string>
  <key>LSMinimumSystemVersion</key>
  <string>15.0</string>
  <key>LSUIElement</key>
  <true/>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>NSMicrophoneUsageDescription</key>
  <string>Pathfinder Glass uses the microphone for live Siri Dictation Voice Auto-Follow so your script advances hands-free as you speak.</string>
  <key>NSSpeechRecognitionUsageDescription</key>
  <string>Pathfinder Glass uses on-device speech recognition to track spoken words in order and automatically advance to the next script line.</string>
</dict>
</plist>
EOF

echo "==> [5/5] Applying ad-hoc code signature for local Apple Silicon execution..."
codesign --force --deep --sign - "${APP_BUNDLE}"
codesign --verify --verbose=2 "${APP_BUNDLE}"

echo "SUCCESS: Built '${APP_BUNDLE}' (with embedded AppIcon.icns)"

