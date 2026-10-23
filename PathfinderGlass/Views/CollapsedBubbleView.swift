import SwiftUI
import AppKit

public struct CollapsedBubbleView: View {
    @ObservedObject public var coordinator: AppCoordinator
    @ObservedObject private var settings: SettingsStore

    public init(coordinator: AppCoordinator) {
        self.coordinator = coordinator
        self.settings = coordinator.settings
    }

    private var isDark: Bool {
        settings.themeMode == .dark
    }

    public var body: some View {
        AppleLiquidGlassContainer(spacing: 8) {
            Button {
                coordinator.toggleCollapse()
            } label: {
                Image(systemName: "sparkles.rectangle.stack.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .frame(width: 28, height: 28)
            }
            .appleLiquidGlassButton(prominent: false, isDark: isDark)
            .frame(width: 46, height: 46)
            .modifier(
                AppleLiquidGlassSurfaceModifier(
                    cornerRadius: 23,
                    isCapsule: true,
                    variant: settings.glassVariant,
                    tintColor: settings.glassTintPreset.swiftUIColor(isDark: isDark, opacity: 0.20),
                    interactive: true,
                    isDark: isDark,
                    liquidness: settings.liquidness
                )
            )
        }
        .help(tooltipText)
        .contextMenu {
            Button("Expand Script Panel (⌃⌥P)") {
                coordinator.toggleCollapse()
            }
            Button("Position Near Camera (⌃⌥H)") {
                coordinator.panelController?.positionNearCamera()
            }
            Button("Switch to \(isDark ? "Light" : "Dark") Liquid Glass") {
                settings.toggleTheme()
            }
            Divider()
            if coordinator.arrowCapture.isCapturing {
                Button("Pause Arrow Capture") {
                    coordinator.arrowCapture.setEnabled(false)
                }
            } else {
                Button("Enable Bare Arrow Capture") {
                    coordinator.arrowCapture.setEnabled(true)
                }
            }
            Divider()
            Button("Quit CueGlass Studio") {
                coordinator.teardown()
                NSApplication.shared.terminate(nil)
            }
        }
    }

    private var tooltipText: String {
        if let sec = coordinator.navigation.activeSection {
            return "CueGlass Studio · \(sec.numberBadge) \(sec.shortTitle) (Click to Expand)"
        }
        return "CueGlass Studio (Click to Expand)"
    }
}
