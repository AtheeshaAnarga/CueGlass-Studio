import SwiftUI
import AppKit

public struct CollapsedBubbleView: View {
    @ObservedObject public var coordinator: AppCoordinator
    @ObservedObject private var settings: SettingsStore
    @ObservedObject private var navigation: ScriptNavigationController

    public init(coordinator: AppCoordinator) {
        self.coordinator = coordinator
        self.settings = coordinator.settings
        self.navigation = coordinator.navigation
    }

    private var isDark: Bool {
        settings.themeMode == .dark
    }

    private var progressFraction: Double {
        let total = max(1, navigation.currentSectionBeats.count)
        let idx = max(1, navigation.activeBeatIndexInSection)
        return min(1.0, max(0.0, Double(idx) / Double(total)))
    }

    public var body: some View {
        Button {
            coordinator.toggleCollapse()
        } label: {
            ZStack {
                Circle()
                    .stroke(
                        isDark
                            ? Color(red: 0.22, green: 0.74, blue: 0.97).opacity(0.22)
                            : Color(red: 0.137, green: 0.388, blue: 0.851).opacity(0.16),
                        lineWidth: 2.5
                    )
                    .frame(width: 38, height: 38)

                Circle()
                    .trim(from: 0, to: CGFloat(progressFraction))
                    .stroke(
                        isDark
                            ? Color(red: 0.22, green: 0.74, blue: 0.97)
                            : Color(red: 0.137, green: 0.388, blue: 0.851),
                        style: StrokeStyle(lineWidth: 2.5, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .frame(width: 38, height: 38)

                Image(systemName: "arrow.up.left.and.arrow.down.right")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(isDark ? .white : Color(red: 0.07, green: 0.09, blue: 0.12))
            }
            .frame(width: 46, height: 46)
        }
        .buttonStyle(.plain)
        .modifier(
            LiquidGlassBackgroundModifier(
                cornerRadius: 23,
                themeMode: settings.themeMode,
                layoutMode: settings.windowLayoutMode,
                variant: settings.glassVariant,
                tintPreset: settings.glassTintPreset,
                liquidness: settings.liquidness,
                transparency: settings.glassTransparency,
                glassEffectLevel: settings.glassEffectLevel
            )
        )
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
