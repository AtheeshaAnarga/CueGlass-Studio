import SwiftUI

public struct PreflightView: View {
    @ObservedObject public var coordinator: AppCoordinator
    @ObservedObject private var navigation: ScriptNavigationController
    @ObservedObject private var settings: SettingsStore
    @Environment(\.dismiss) private var dismiss

    public init(coordinator: AppCoordinator) {
        self.coordinator = coordinator
        self.navigation = coordinator.navigation
        self.settings = coordinator.settings
    }

    private var isDark: Bool {
        settings.themeMode == .dark
    }

    private var isFullLiquid: Bool {
        settings.windowLayoutMode == .fullLiquidGlass
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Preflight Readiness & Zoom Safety Check")
                        .font(.system(size: 16, weight: .bold))
                    Text("Verify unresolved speaker placeholders and screen-sharing settings before going live.")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
                Spacer()
                Button("Close") {
                    coordinator.closePreflightWindow()
                    dismiss()
                }
                .appleLiquidGlassButton(prominent: true, isDark: isDark, isFullLiquid: isFullLiquid)
            }

            VStack(alignment: .leading, spacing: 6) {
                Label("Zoom Screen Sharing Safety Reminder", systemImage: "video.badge.checkmark")
                    .font(.system(size: 13, weight: .semibold))
                Text("Share the individual slide or application window in Zoom rather than your entire display, and verify Zoom's participant-facing preview. Full-screen display capture can show floating overlays to attendees.")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
            .padding(12)
            .modifier(
                AppleLiquidGlassSurfaceModifier(
                    cornerRadius: 14,
                    variant: settings.glassVariant,
                    tintColor: Color.blue.opacity(0.12),
                    interactive: false,
                    isDark: isDark,
                    liquidness: settings.liquidness,
                    isFullLiquid: isFullLiquid
                )
            )

            let requiredPlaceholders = navigation.document.allPlaceholders.filter { !$0.isConditional }
            let optionalPlaceholders = navigation.document.allPlaceholders.filter { $0.isConditional }

            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Text("NEEDS CONFIRMATION (\(requiredPlaceholders.count))")
                        .font(.system(size: 10.5, weight: .bold))
                        .tracking(0.5)
                        .foregroundColor(Color(red: 0.72, green: 0.42, blue: 0.04))

                    ForEach(requiredPlaceholders) { ph in
                        let isAck = settings.rehearsalAcknowledgedPlaceholders.contains(ph.id)
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("[\(ph.label)] — \(ph.sectionTitle)")
                                    .font(.system(size: 12.5, weight: .semibold))
                                if ph.isDataScienceCritical {
                                    Text("Speaker identity/bio unconfirmed in source")
                                        .font(.system(size: 11))
                                        .foregroundColor(Color(red: 0.72, green: 0.42, blue: 0.04))
                                }
                            }
                            Spacer()
                            Button("Jump") {
                                navigation.selectBeat(ph.blockID)
                                coordinator.closePreflightWindow()
                                dismiss()
                            }
                            .appleLiquidGlassButton(prominent: true, isDark: isDark, isFullLiquid: isFullLiquid)

                            Button(isAck ? "Acknowledged" : "Dismiss for Rehearsal") {
                                if isAck {
                                    settings.rehearsalAcknowledgedPlaceholders.remove(ph.id)
                                } else {
                                    settings.rehearsalAcknowledgedPlaceholders.insert(ph.id)
                                }
                            }
                            .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
                        }
                        .padding(10)
                        .modifier(
                            AppleLiquidGlassSurfaceModifier(
                                cornerRadius: 12,
                                variant: settings.glassVariant,
                                tintColor: nil,
                                interactive: true,
                                isDark: isDark,
                                liquidness: settings.liquidness,
                                isFullLiquid: isFullLiquid
                            )
                        )
                    }

                    Text("INTENTIONALLY OPTIONAL / CONDITIONAL (\(optionalPlaceholders.count))")
                        .font(.system(size: 10.5, weight: .bold))
                        .tracking(0.5)
                        .foregroundColor(.secondary)

                    ForEach(optionalPlaceholders) { ph in
                        HStack {
                            Text("[\(ph.label)] — \(ph.sectionTitle) (Conditional cue)")
                                .font(.system(size: 12))
                            Spacer()
                            Button("View") {
                                navigation.selectBeat(ph.blockID)
                                coordinator.closePreflightWindow()
                                dismiss()
                            }
                            .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
                        }
                        .padding(6)
                    }
                }
            }
        }
        .padding(20)
        .frame(minWidth: 520, idealWidth: 640, maxWidth: .infinity, minHeight: 400, idealHeight: 520, maxHeight: .infinity)
        .modifier(
            LiquidGlassBackgroundModifier(
                cornerRadius: 0,
                themeMode: settings.themeMode,
                layoutMode: settings.windowLayoutMode,
                variant: .regular,
                tintPreset: settings.glassTintPreset,
                liquidness: settings.liquidness,
                transparency: 15,
                glassEffectLevel: 95
            )
        )
    }
}
