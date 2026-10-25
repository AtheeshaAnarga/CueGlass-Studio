import SwiftUI

public struct SettingsView: View {
    @ObservedObject public var coordinator: AppCoordinator
    @ObservedObject public var settings: SettingsStore
    @Environment(\.dismiss) private var dismiss

    public init(coordinator: AppCoordinator) {
        self.coordinator = coordinator
        self.settings = coordinator.settings
    }

    private var isDark: Bool {
        settings.themeMode == .dark
    }

    public var body: some View {
        AppleLiquidGlassContainer(spacing: CGFloat(settings.glassContainerSpacing)) {
            ScrollView(.vertical, showsIndicators: true) {
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Official Apple Tahoe Liquid Glass Cap Settings")
                                .font(.system(size: 16, weight: .bold))
                            Text("NSGlassEffectView + GlassEffectContainer + .glassEffect(.regular.tint().interactive())")
                                .font(.system(size: 11.5))
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Button("Reset to Tahoe Defaults") {
                            settings.resetToAppleLiquidGlassLight()
                        }
                        .appleLiquidGlassButton(prominent: false, isDark: isDark)

                        Button("Done") { dismiss() }
                            .appleLiquidGlassButton(prominent: true, isDark: isDark)
                            .keyboardShortcut(.defaultAction)
                    }

                    Divider()

                    // 1. Official Apple Developer Liquid Glass API Parameters
                    VStack(alignment: .leading, spacing: 10) {
                        Text("OFFICIAL APPLE DEVELOPER LIQUID GLASS PARAMETERS (macOS 26 TAHOE)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)

                        HStack(spacing: 12) {
                            Label("Glass Variant", systemImage: "sparkles.rectangle.stack")
                                .font(.system(size: 12.5, weight: .semibold))
                                .frame(width: 145, alignment: .leading)
                            Picker("Glass Variant", selection: $settings.glassVariant) {
                                ForEach(AppleGlassVariant.allCases, id: \.self) { variant in
                                    Text(variant.displayName).tag(variant)
                                }
                            }
                            .pickerStyle(.segmented)
                            .labelsHidden()
                        }

                        HStack(spacing: 12) {
                            Label("Volume Tint (.tint)", systemImage: "drop.fill")
                                .font(.system(size: 12.5, weight: .semibold))
                                .frame(width: 145, alignment: .leading)
                            Picker("Tint Preset", selection: $settings.glassTintPreset) {
                                ForEach(AppleGlassTintPreset.allCases, id: \.self) { preset in
                                    Text(preset.displayName).tag(preset)
                                }
                            }
                            .pickerStyle(.segmented)
                            .labelsHidden()
                        }

                        HStack(spacing: 12) {
                            Label("Window Layout", systemImage: "macwindow")
                                .font(.system(size: 12.5, weight: .semibold))
                                .frame(width: 145, alignment: .leading)
                            Picker("Layout", selection: $settings.windowLayoutMode) {
                                ForEach(WindowSurfaceLayoutMode.allCases, id: \.self) { mode in
                                    Text(mode.displayName).tag(mode)
                                }
                            }
                            .pickerStyle(.segmented)
                            .labelsHidden()
                        }

                        HStack(spacing: 12) {
                            Label("Appearance", systemImage: isDark ? "moon.stars.fill" : "sun.max.fill")
                                .font(.system(size: 12.5, weight: .semibold))
                                .frame(width: 145, alignment: .leading)
                            Picker("Theme", selection: $settings.themeMode) {
                                ForEach(AppThemeMode.allCases, id: \.self) { mode in
                                    Text(mode.displayName).tag(mode)
                                }
                            }
                            .pickerStyle(.segmented)
                            .labelsHidden()
                        }

                        Toggle("Enable Interactive Fluid Lensing (.interactive(true)) on Buttons, Sliders & Beats", isOn: $settings.glassInteractive)
                    }
                    .padding(12)
                    .modifier(
                        AppleLiquidGlassSurfaceModifier(
                            cornerRadius: 14,
                            variant: settings.glassVariant,
                            tintColor: settings.glassTintPreset.swiftUIColor(isDark: isDark, opacity: 0.14),
                            interactive: false,
                            isDark: isDark,
                            liquidness: settings.liquidness
                        )
                    )

                    // 2. Optical Liquid Glass Cap Sliders (Rendered with AppleLiquidGlassSlider)
                    VStack(alignment: .leading, spacing: 10) {
                        Text("LIQUID GLASS CAP SLIDERS (DROPLET THUMB & REFRACTIVE TRACK)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)

                        AppleLiquidGlassSlider(
                            title: "Liquidness (Refraction & Specular Curvature)",
                            valueLabel: "\(Int(settings.liquidness))%",
                            value: $settings.liquidness,
                            in: 10...100,
                            isDark: isDark
                        )

                        AppleLiquidGlassSlider(
                            title: "Transparency (See-Through Window Alpha)",
                            valueLabel: "\(Int(settings.glassTransparency))%",
                            value: $settings.glassTransparency,
                            in: 10...95,
                            isDark: isDark
                        )

                        AppleLiquidGlassSlider(
                            title: "Glass Effect Level (Optical Blur & Vibrancy)",
                            valueLabel: "\(Int(settings.glassEffectLevel))%",
                            value: $settings.glassEffectLevel,
                            in: 15...100,
                            isDark: isDark
                        )

                        AppleLiquidGlassSlider(
                            title: "Active Beat Focus Lens Glow",
                            valueLabel: "\(Int(settings.activeBeatGlow))%",
                            value: $settings.activeBeatGlow,
                            in: 10...100,
                            isDark: isDark
                        )
                    }
                    .padding(12)
                    .modifier(
                        AppleLiquidGlassSurfaceModifier(
                            cornerRadius: 14,
                            variant: settings.glassVariant,
                            tintColor: nil,
                            interactive: false,
                            isDark: isDark,
                            liquidness: settings.liquidness
                        )
                    )

                    // 2B. Auto Voice Follow · System Audio Input & Spoken Word Darkening
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Label("AUTO VOICE FOLLOW · SYSTEM AUDIO INPUT & WORD DARKENING", systemImage: "waveform.and.mic")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.secondary)
                            Spacer()
                            Button {
                                coordinator.voiceFollow.toggleListening()
                            } label: {
                                HStack(spacing: 5) {
                                    Image(systemName: coordinator.voiceFollow.isListening ? "stop.fill" : "play.fill")
                                        .font(.system(size: 9.5, weight: .bold))
                                    Text(coordinator.voiceFollow.isListening ? "Stop Voice Follow" : "Start Voice Follow")
                                        .font(.system(size: 11, weight: .semibold))
                                }
                            }
                            .appleLiquidGlassButton(
                                prominent: coordinator.voiceFollow.isListening,
                                isDark: isDark,
                                tint: coordinator.voiceFollow.isListening ? .green : nil
                            )
                        }

                        HStack(spacing: 8) {
                            Image(systemName: "mic.badge.plus")
                                .font(.system(size: 11.5))
                                .foregroundColor(.secondary)
                            Text("System Audio Input Level (Active macOS Input Device):")
                                .font(.system(size: 11.5, weight: .medium))
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule()
                                        .fill(Color.secondary.opacity(0.2))
                                    Capsule()
                                        .fill(Color.green)
                                        .frame(width: max(4, geo.size.width * CGFloat(coordinator.voiceFollow.audioInputLevel)))
                                }
                            }
                            .frame(height: 6)
                            Text("\(Int(coordinator.voiceFollow.audioInputLevel * 100))%")
                                .font(.system(size: 10.5, weight: .semibold).monospacedDigit())
                                .frame(width: 36, alignment: .trailing)
                        }

                        Picker("Spoken Word Highlight Mode", selection: $settings.voiceDarkenWords) {
                            Text("Darken Spoken Words").tag(true)
                            Text("Stop Word Darkening (Clean View)").tag(false)
                        }
                        .pickerStyle(.segmented)

                        if settings.voiceDarkenWords {
                            AppleLiquidGlassSlider(
                                title: "Spoken Word Dimmed Opacity (Lower = Darker Spoken Words)",
                                valueLabel: "\(Int(settings.voiceDarkenOpacity))%",
                                value: $settings.voiceDarkenOpacity,
                                in: 15...75,
                                isDark: isDark
                            )
                        }
                    }
                    .padding(12)
                    .modifier(
                        AppleLiquidGlassSurfaceModifier(
                            cornerRadius: 14,
                            variant: settings.glassVariant,
                            tintColor: Color.green.opacity(isDark ? 0.10 : 0.08),
                            interactive: false,
                            isDark: isDark,
                            liquidness: settings.liquidness
                        )
                    )

                    // 3. Typography: Font Boldness, Font Size & Line Spacing
                    VStack(alignment: .leading, spacing: 10) {
                        Text("TYPOGRAPHY, FONT BOLDNESS & SIZES")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)

                        HStack(spacing: 12) {
                            Text("Font Boldness:")
                                .font(.system(size: 12.5, weight: .semibold))
                                .frame(width: 145, alignment: .leading)
                            Picker("Boldness", selection: $settings.fontWeightOption) {
                                ForEach(FontBoldnessWeight.allCases, id: \.self) { w in
                                    Text(w.displayName).tag(w)
                                }
                            }
                            .pickerStyle(.segmented)
                            .labelsHidden()
                        }

                        AppleLiquidGlassSlider(
                            title: "Font Size",
                            valueLabel: "\(Int(settings.fontSize)) pt",
                            value: $settings.fontSize,
                            in: 18...48,
                            isDark: isDark
                        )

                        AppleLiquidGlassSlider(
                            title: "Line Spacing",
                            valueLabel: String(format: "%.2f×", settings.lineHeightMultiplier),
                            value: $settings.lineHeightMultiplier,
                            in: 1.25...1.85,
                            isDark: isDark
                        )

                        Toggle("Show Categorized Stage & Production Cue Cards (*[...]*)", isOn: $settings.showOrganizerCues)
                        Toggle("Narrow Reading Measure (Focused Near-Camera Eye Line)", isOn: $settings.narrowReadingWidth)
                    }
                    .padding(12)
                    .modifier(
                        AppleLiquidGlassSurfaceModifier(
                            cornerRadius: 14,
                            variant: settings.glassVariant,
                            tintColor: nil,
                            interactive: false,
                            isDark: isDark,
                            liquidness: settings.liquidness
                        )
                    )

                    // 4. Keyboard Shortcuts & Global Hotkeys
                    HStack(alignment: .top, spacing: 20) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("FOCUSED PANEL KEYS")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.secondary)
                            shortcutRow("→ or Space", "Next Beat")
                            shortcutRow("← or Shift+Space", "Previous Beat")
                            shortcutRow("↓ / ↑", "Next / Prev Section")
                            shortcutRow("T", "Jump to Thank Speaker")
                            shortcutRow("⌘+ / ⌘-", "Adjust Font Size")
                            shortcutRow("⌘⇧T", "Toggle Light / Dark Glass")
                        }

                        Divider()

                        VStack(alignment: .leading, spacing: 6) {
                            Text("SAFE GLOBAL CHORDS (WHILE ZOOM ACTIVE)")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.secondary)
                            ForEach(coordinator.hotkeys.statuses) { status in
                                HStack {
                                    Text(status.action.shortcutLabel)
                                        .font(.system(size: 11.5, weight: .semibold, design: .monospaced))
                                    Text(status.action.displayName)
                                        .font(.system(size: 11.5))
                                    Spacer()
                                    Text(status.isRegistered ? "Active" : (status.errorMessage ?? "Conflict"))
                                        .font(.system(size: 10.5))
                                        .foregroundColor(status.isRegistered ? .green : .orange)
                                }
                            }
                        }
                    }
                    .padding(12)
                    .modifier(
                        AppleLiquidGlassSurfaceModifier(
                            cornerRadius: 14,
                            variant: settings.glassVariant,
                            tintColor: nil,
                            interactive: false,
                            isDark: isDark,
                            liquidness: settings.liquidness
                        )
                    )

                    Toggle(
                        "Capture Bare Arrows Globally (Performance Mode — OFF by default)",
                        isOn: Binding(
                            get: { coordinator.arrowCapture.isCapturing },
                            set: { coordinator.arrowCapture.setEnabled($0) }
                        )
                    )
                    if case .permissionDenied(let message) = coordinator.arrowCapture.state {
                        Text(message)
                            .font(.system(size: 11.5))
                            .foregroundColor(.orange)
                    }
                }
                .padding(20)
            }
            .frame(width: 640, height: 600)
        }
    }

    private func shortcutRow(_ key: String, _ label: String) -> some View {
        HStack {
            Text(key)
                .font(.system(size: 11.5, weight: .semibold, design: .monospaced))
                .frame(width: 115, alignment: .leading)
            Text(label)
                .font(.system(size: 11.5))
        }
    }
}
