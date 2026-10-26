import SwiftUI

public struct SettingsView: View {
    @ObservedObject public var coordinator: AppCoordinator
    @ObservedObject public var settings: SettingsStore
    @ObservedObject private var voiceFollow: VoiceAutoFollowController
    @Environment(\.dismiss) private var dismiss
    @State private var activeTab: Int = 0

    public init(coordinator: AppCoordinator) {
        self.coordinator = coordinator
        self.settings = coordinator.settings
        self.voiceFollow = coordinator.voiceFollow
    }

    private var isDark: Bool {
        settings.themeMode == .dark
    }

    private var isFullLiquid: Bool {
        settings.windowLayoutMode == .fullLiquidGlass
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Header Bar matching ShortcutsSettingsModal.tsx
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color(red: 0.137, green: 0.388, blue: 0.851))
                        .frame(width: 32, height: 32)
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Official Apple Tahoe Liquid Glass Cap Settings")
                        .font(.system(size: 15.5, weight: .bold))
                    Text("Optical Refraction · System Audio Voice Follow · Typography & Global Shortcuts")
                        .font(.system(size: 11.5))
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button("Reset to Tahoe Defaults") {
                    settings.resetToAppleLiquidGlassLight()
                }
                .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)

                Button("Done") {
                    coordinator.closeSettingsWindow()
                    dismiss()
                }
                .appleLiquidGlassButton(prominent: true, isDark: isDark, isFullLiquid: isFullLiquid)
                .keyboardShortcut(.defaultAction)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 12)

            // 3-Tab Bar + Quick Presets matching ShortcutsSettingsModal.tsx
            HStack(spacing: 8) {
                Button {
                    activeTab = 0
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "drop.fill")
                            .font(.system(size: 11))
                        Text("Tahoe Liquid Glass & Voice")
                            .font(.system(size: 11.5, weight: .semibold))
                    }
                }
                .appleLiquidGlassButton(prominent: activeTab == 0, isDark: isDark, isFullLiquid: isFullLiquid)

                Button {
                    activeTab = 1
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "textformat.size")
                            .font(.system(size: 11))
                        Text("Font Boldness & Sizes")
                            .font(.system(size: 11.5, weight: .semibold))
                    }
                }
                .appleLiquidGlassButton(prominent: activeTab == 1, isDark: isDark, isFullLiquid: isFullLiquid)

                Button {
                    activeTab = 2
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "keyboard")
                            .font(.system(size: 11))
                        Text("Shortcuts & Global Keys")
                            .font(.system(size: 11.5, weight: .semibold))
                    }
                }
                .appleLiquidGlassButton(prominent: activeTab == 2, isDark: isDark, isFullLiquid: isFullLiquid)

                Spacer()

                Button("Apple Clear Light") {
                    settings.resetToAppleLiquidGlassLight()
                }
                .font(.system(size: 11, weight: .semibold))
                .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)

                Button("Tahoe Dark Glass") {
                    settings.applyTahoeDarkGlassPreset()
                }
                .font(.system(size: 11, weight: .semibold))
                .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 12)

            Divider().opacity(isDark ? 0.18 : 0.25)

            ScrollView(.vertical, showsIndicators: true) {
                VStack(alignment: .leading, spacing: 14) {
                    if activeTab == 0 {
                        tahoeLiquidGlassAndVoiceTab
                    } else if activeTab == 1 {
                        typographyAndLayoutTab
                    } else {
                        shortcutsAndGlobalHotkeysTab
                    }
                }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .frame(minWidth: 620, idealWidth: 720, maxWidth: .infinity, minHeight: 500, idealHeight: 640, maxHeight: .infinity)
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

    // MARK: - Tab 0: Tahoe Liquid Glass & Auto Voice Follow

    private var tahoeLiquidGlassAndVoiceTab: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Card 1: Theme, Surface Layout & Apple Glass Variant
            VStack(alignment: .leading, spacing: 12) {
                Text("OFFICIAL APPLE DEVELOPER LIQUID GLASS PARAMETERS (macOS 26 TAHOE)")
                    .font(.system(size: 10.5, weight: .bold))
                    .tracking(0.5)
                    .foregroundColor(.secondary)

                // Appearance & Window Surface Mode Row
                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("Appearance Theme")
                            .font(.system(size: 11.5, weight: .semibold))
                        HStack(spacing: 6) {
                            Button {
                                settings.themeMode = .light
                            } label: {
                                HStack(spacing: 5) {
                                    Image(systemName: "sun.max.fill")
                                        .foregroundColor(settings.themeMode == .light ? .white : .orange)
                                    Text("Apple Liquid Light")
                                        .font(.system(size: 11.5, weight: .semibold))
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .appleLiquidGlassButton(prominent: settings.themeMode == .light, isDark: isDark, isFullLiquid: isFullLiquid)

                            Button {
                                settings.themeMode = .dark
                            } label: {
                                HStack(spacing: 5) {
                                    Image(systemName: "moon.stars.fill")
                                        .foregroundColor(settings.themeMode == .dark ? .white : .cyan)
                                    Text("Dark Obsidian Glass")
                                        .font(.system(size: 11.5, weight: .semibold))
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .appleLiquidGlassButton(prominent: settings.themeMode == .dark, isDark: isDark, isFullLiquid: isFullLiquid)
                        }
                    }

                    VStack(alignment: .leading, spacing: 5) {
                        Text("Window Surface Mode")
                            .font(.system(size: 11.5, weight: .semibold))
                        HStack(spacing: 6) {
                            Button {
                                settings.windowLayoutMode = .fullLiquidGlass
                            } label: {
                                Text("Liquid Glass")
                                    .font(.system(size: 11.5, weight: .semibold))
                                    .frame(maxWidth: .infinity)
                            }
                            .appleLiquidGlassButton(prominent: isFullLiquid, isDark: isDark, isFullLiquid: isFullLiquid)

                            Button {
                                settings.windowLayoutMode = .classicCard
                            } label: {
                                Text("Classic Card UI")
                                    .font(.system(size: 11.5, weight: .semibold))
                                    .frame(maxWidth: .infinity)
                            }
                            .appleLiquidGlassButton(prominent: !isFullLiquid, isDark: isDark, isFullLiquid: isFullLiquid)
                        }
                    }
                }

                // Glass Variant Pill Grid
                VStack(alignment: .leading, spacing: 5) {
                    Text("Apple Liquid Glass Material Variant")
                        .font(.system(size: 11.5, weight: .semibold))
                    HStack(spacing: 8) {
                        ForEach(AppleGlassVariant.allCases, id: \.self) { variant in
                            Button {
                                settings.glassVariant = variant
                            } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(variant.apiDeclaration)
                                        .font(.system(size: 11.5, weight: .bold, design: .monospaced))
                                    Text(variant.displayName)
                                        .font(.system(size: 10))
                                        .opacity(0.85)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            .appleLiquidGlassButton(prominent: settings.glassVariant == variant, isDark: isDark, isFullLiquid: isFullLiquid)
                        }
                    }
                }

                // Volume Tint Presets
                VStack(alignment: .leading, spacing: 5) {
                    Text("Refractive Volume Tint (.tint)")
                        .font(.system(size: 11.5, weight: .semibold))
                    HStack(spacing: 6) {
                        ForEach(AppleGlassTintPreset.allCases, id: \.self) { preset in
                            Button {
                                settings.glassTintPreset = preset
                            } label: {
                                Text(preset.displayName)
                                    .font(.system(size: 11, weight: .semibold))
                                    .frame(maxWidth: .infinity)
                            }
                            .appleLiquidGlassButton(prominent: settings.glassTintPreset == preset, isDark: isDark, isFullLiquid: isFullLiquid)
                        }
                    }
                }
            }
            .padding(14)
            .modifier(
                AppleLiquidGlassSurfaceModifier(
                    cornerRadius: 16,
                    variant: settings.glassVariant,
                    tintColor: nil,
                    interactive: false,
                    isDark: isDark,
                    liquidness: settings.liquidness,
                    isFullLiquid: isFullLiquid
                )
            )

            // Card 2: Optical Liquid Glass Cap Sliders
            VStack(alignment: .leading, spacing: 11) {
                Text("LIQUID GLASS CAP SLIDERS (REFRACTION, TRANSPARENCY & BLUR)")
                    .font(.system(size: 10.5, weight: .bold))
                    .tracking(0.5)
                    .foregroundColor(.secondary)

                HStack(spacing: 16) {
                    AppleLiquidGlassSlider(
                        title: "Liquidness (Refraction)",
                        valueLabel: "\(Int(settings.liquidness))%",
                        value: $settings.liquidness,
                        in: 10...100,
                        isDark: isDark,
                        isFullLiquid: isFullLiquid
                    )

                    AppleLiquidGlassSlider(
                        title: "Transparency (Window Alpha)",
                        valueLabel: "\(Int(settings.glassTransparency))%",
                        value: $settings.glassTransparency,
                        in: 10...95,
                        isDark: isDark,
                        isFullLiquid: isFullLiquid
                    )
                }

                HStack(spacing: 16) {
                    AppleLiquidGlassSlider(
                        title: "Glass Effect Level (Blur)",
                        valueLabel: "\(Int(settings.glassEffectLevel))%",
                        value: $settings.glassEffectLevel,
                        in: 15...100,
                        isDark: isDark,
                        isFullLiquid: isFullLiquid
                    )

                    AppleLiquidGlassSlider(
                        title: "Active Beat Focus Lens Glow",
                        valueLabel: "\(Int(settings.activeBeatGlow))%",
                        value: $settings.activeBeatGlow,
                        in: 10...100,
                        isDark: isDark,
                        isFullLiquid: isFullLiquid
                    )
                }
            }
            .padding(14)
            .modifier(
                AppleLiquidGlassSurfaceModifier(
                    cornerRadius: 16,
                    variant: settings.glassVariant,
                    tintColor: nil,
                    interactive: false,
                    isDark: isDark,
                    liquidness: settings.liquidness,
                    isFullLiquid: isFullLiquid
                )
            )

            // Card 3: Auto Voice Follow · System Audio Input & Spoken Word Darkening
            VStack(alignment: .leading, spacing: 11) {
                HStack {
                    HStack(spacing: 6) {
                        Image(systemName: "waveform.and.mic")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Color(red: 0.06, green: 0.65, blue: 0.42))
                        Text("AUTO VOICE FOLLOW · SYSTEM AUDIO INPUT & WORD DARKENING")
                            .font(.system(size: 10.5, weight: .bold))
                            .tracking(0.5)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button {
                        voiceFollow.toggleListening()
                    } label: {
                        HStack(spacing: 5) {
                            Image(systemName: voiceFollow.isListening ? "stop.fill" : "play.fill")
                                .font(.system(size: 9.5, weight: .bold))
                            Text(voiceFollow.isListening ? "Stop Voice Follow" : "Start Voice Follow")
                                .font(.system(size: 11.5, weight: .semibold))
                        }
                    }
                    .appleLiquidGlassButton(
                        prominent: true,
                        isDark: isDark,
                        tint: voiceFollow.isListening ? Color(red: 0.06, green: 0.65, blue: 0.42) : nil,
                        isFullLiquid: isFullLiquid
                    )
                }

                // System Audio Input Device Selector & Refresh
                HStack(spacing: 8) {
                    Text("Audio Input:")
                        .font(.system(size: 11.5, weight: .semibold))
                    Menu {
                        ForEach(voiceFollow.availableAudioDevices) { dev in
                            Button {
                                voiceFollow.selectedAudioDeviceID = dev.id
                            } label: {
                                HStack {
                                    Text(dev.name)
                                    if voiceFollow.selectedAudioDeviceID == dev.id {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }
                    } label: {
                        HStack {
                            Image(systemName: "mic.fill")
                                .font(.system(size: 10.5))
                            Text(
                                voiceFollow.availableAudioDevices.first(where: { $0.id == voiceFollow.selectedAudioDeviceID })?.name
                                ?? "System Default Audio Input"
                            )
                            .font(.system(size: 11.5, weight: .medium))
                            .lineLimit(1)
                            Spacer()
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.system(size: 10))
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)

                    Button("Refresh") {
                        voiceFollow.refreshAudioDevices()
                    }
                    .font(.system(size: 11, weight: .semibold))
                    .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
                }

                // Live Audio Input Level Meter + Status
                HStack(spacing: 10) {
                    Text(voiceFollow.statusMessage)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                    Spacer()
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule()
                                .fill(Color.secondary.opacity(0.22))
                            Capsule()
                                .fill(Color(red: 0.06, green: 0.72, blue: 0.48))
                                .frame(width: max(4, geo.size.width * CGFloat(voiceFollow.audioInputLevel)))
                        }
                    }
                    .frame(width: 140, height: 7)
                    Text("\(Int(voiceFollow.audioInputLevel * 100))%")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .frame(width: 38, alignment: .trailing)
                }

                // Spoken Word Darkening & Target Word Underline Pill Buttons
                HStack(spacing: 8) {
                    Button {
                        settings.voiceDarkenWords = true
                    } label: {
                        Text("Darken Spoken Words")
                            .font(.system(size: 11.5, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .appleLiquidGlassButton(prominent: settings.voiceDarkenWords, isDark: isDark, isFullLiquid: isFullLiquid)

                    Button {
                        settings.voiceDarkenWords = false
                    } label: {
                        Text("Stop Word Darkening (Clean View)")
                            .font(.system(size: 11.5, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .appleLiquidGlassButton(prominent: !settings.voiceDarkenWords, isDark: isDark, isFullLiquid: isFullLiquid)

                    Button {
                        settings.voiceShowTargetUnderline.toggle()
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: settings.voiceShowTargetUnderline ? "checkmark.circle.fill" : "circle")
                            Text("Underline Next Target Word")
                        }
                        .font(.system(size: 11.5, weight: .semibold))
                        .frame(maxWidth: .infinity)
                    }
                    .appleLiquidGlassButton(prominent: settings.voiceShowTargetUnderline, isDark: isDark, isFullLiquid: isFullLiquid)
                }

                if settings.voiceDarkenWords {
                    AppleLiquidGlassSlider(
                        title: "Spoken Word Dimmed Opacity (Lower = Darker Spoken Words)",
                        valueLabel: "\(Int(settings.voiceDarkenOpacity))%",
                        value: $settings.voiceDarkenOpacity,
                        in: 15...75,
                        isDark: isDark,
                        isFullLiquid: isFullLiquid,
                        accentTint: Color(red: 0.06, green: 0.65, blue: 0.42)
                    )
                }
            }
            .padding(14)
            .modifier(
                AppleLiquidGlassSurfaceModifier(
                    cornerRadius: 16,
                    variant: settings.glassVariant,
                    tintColor: Color.green.opacity(isDark ? 0.08 : 0.06),
                    interactive: false,
                    isDark: isDark,
                    liquidness: settings.liquidness,
                    isFullLiquid: isFullLiquid
                )
            )
        }
    }

    // MARK: - Tab 1: Typography, Font Boldness & Reading Layout

    private var typographyAndLayoutTab: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 12) {
                Text("TYPOGRAPHY, FONT BOLDNESS & SIZES")
                    .font(.system(size: 10.5, weight: .bold))
                    .tracking(0.5)
                    .foregroundColor(.secondary)

                VStack(alignment: .leading, spacing: 6) {
                    Text("Font Boldness Weight")
                        .font(.system(size: 11.5, weight: .semibold))
                    HStack(spacing: 8) {
                        ForEach(FontBoldnessWeight.allCases, id: \.self) { w in
                            Button {
                                settings.fontWeightOption = w
                            } label: {
                                Text(w.displayName)
                                    .font(.system(size: 11.5, weight: w.swiftUIWeight))
                                    .frame(maxWidth: .infinity)
                            }
                            .appleLiquidGlassButton(prominent: settings.fontWeightOption == w, isDark: isDark, isFullLiquid: isFullLiquid)
                        }
                    }
                }

                AppleLiquidGlassSlider(
                    title: "Font Size",
                    valueLabel: "\(Int(settings.fontSize)) pt",
                    value: $settings.fontSize,
                    in: 18...48,
                    isDark: isDark,
                    isFullLiquid: isFullLiquid
                )

                AppleLiquidGlassSlider(
                    title: "Line Spacing Multiplier",
                    valueLabel: String(format: "%.2f×", settings.lineHeightMultiplier),
                    value: $settings.lineHeightMultiplier,
                    in: 1.25...1.85,
                    isDark: isDark,
                    isFullLiquid: isFullLiquid
                )

                HStack(spacing: 10) {
                    Button {
                        settings.showOrganizerCues.toggle()
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: settings.showOrganizerCues ? "checkmark.square.fill" : "square")
                            Text("Show Categorized Stage & Production Cue Cards (*[...]*)")
                                .font(.system(size: 11.5, weight: .semibold))
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .appleLiquidGlassButton(prominent: settings.showOrganizerCues, isDark: isDark, isFullLiquid: isFullLiquid)

                    Button {
                        settings.narrowReadingWidth.toggle()
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: settings.narrowReadingWidth ? "checkmark.square.fill" : "square")
                            Text("Narrow Reading Measure (Near-Camera Eye Line)")
                                .font(.system(size: 11.5, weight: .semibold))
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .appleLiquidGlassButton(prominent: settings.narrowReadingWidth, isDark: isDark, isFullLiquid: isFullLiquid)
                }
            }
            .padding(14)
            .modifier(
                AppleLiquidGlassSurfaceModifier(
                    cornerRadius: 16,
                    variant: settings.glassVariant,
                    tintColor: nil,
                    interactive: false,
                    isDark: isDark,
                    liquidness: settings.liquidness,
                    isFullLiquid: isFullLiquid
                )
            )

            // Live Typography Preview Card
            VStack(alignment: .leading, spacing: 8) {
                Text("LIVE TELEPROMPTER TYPOGRAPHY PREVIEW")
                    .font(.system(size: 10.5, weight: .bold))
                    .tracking(0.5)
                    .foregroundColor(.secondary)

                Text("Good evening, everyone, and welcome to our live broadcast. Keep your eyes near the camera lens for natural eye contact.")
                    .font(.system(size: settings.fontSize, weight: settings.fontWeightOption.swiftUIWeight))
                    .lineSpacing(CGFloat(settings.fontSize * (settings.lineHeightMultiplier - 1.0)))
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(isDark ? Color.white.opacity(0.08) : Color.white.opacity(0.65))
                    )
            }
            .padding(14)
            .modifier(
                AppleLiquidGlassSurfaceModifier(
                    cornerRadius: 16,
                    variant: settings.glassVariant,
                    tintColor: nil,
                    interactive: false,
                    isDark: isDark,
                    liquidness: settings.liquidness,
                    isFullLiquid: isFullLiquid
                )
            )
        }
    }

    // MARK: - Tab 2: Shortcuts & Global Keys

    private var shortcutsAndGlobalHotkeysTab: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("FOCUSED PANEL KEYS")
                        .font(.system(size: 10.5, weight: .bold))
                        .tracking(0.5)
                        .foregroundColor(.secondary)
                    shortcutRow("→ or Space", "Next Beat")
                    shortcutRow("← or Shift+Space", "Previous Beat")
                    shortcutRow("↓ / ↑", "Next / Prev Section")
                    shortcutRow("⌘+ / ⌘-", "Adjust Font Size")
                    shortcutRow("⌘⇧T", "Toggle Light / Dark Glass")
                    shortcutRow("⌘E", "Open Script Editor")
                    shortcutRow("⌘,", "Open Cap Settings")
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Divider()

                VStack(alignment: .leading, spacing: 8) {
                    Text("SAFE GLOBAL CHORDS (WHILE ZOOM ACTIVE)")
                        .font(.system(size: 10.5, weight: .bold))
                        .tracking(0.5)
                        .foregroundColor(.secondary)
                    ForEach(coordinator.hotkeys.statuses) { status in
                        HStack {
                            Text(status.action.shortcutLabel)
                                .font(.system(size: 11.5, weight: .bold, design: .monospaced))
                                .frame(width: 60, alignment: .leading)
                            Text(status.action.displayName)
                                .font(.system(size: 11.5))
                            Spacer()
                            Text(status.isRegistered ? "Active" : (status.errorMessage ?? "Conflict"))
                                .font(.system(size: 10.5, weight: .semibold))
                                .foregroundColor(status.isRegistered ? .green : .orange)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(14)
            .modifier(
                AppleLiquidGlassSurfaceModifier(
                    cornerRadius: 16,
                    variant: settings.glassVariant,
                    tintColor: nil,
                    interactive: false,
                    isDark: isDark,
                    liquidness: settings.liquidness,
                    isFullLiquid: isFullLiquid
                )
            )

            VStack(alignment: .leading, spacing: 8) {
                Text("OPT-IN GLOBAL BARE ARROW CAPTURE (PERFORMANCE MODE)")
                    .font(.system(size: 10.5, weight: .bold))
                    .tracking(0.5)
                    .foregroundColor(.secondary)

                Button {
                    coordinator.arrowCapture.setEnabled(!coordinator.arrowCapture.isCapturing)
                } label: {
                    HStack {
                        Image(systemName: coordinator.arrowCapture.isCapturing ? "checkmark.circle.fill" : "circle")
                        Text("Capture Bare Arrows Globally (OFF by default so Zoom & Slides keep normal arrow keys)")
                            .font(.system(size: 12, weight: .semibold))
                        Spacer()
                        Text(coordinator.arrowCapture.isCapturing ? "ENABLED" : "OFF")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                    }
                }
                .appleLiquidGlassButton(prominent: coordinator.arrowCapture.isCapturing, isDark: isDark, isFullLiquid: isFullLiquid)

                if case .permissionDenied(let message) = coordinator.arrowCapture.state {
                    Text(message)
                        .font(.system(size: 11.5))
                        .foregroundColor(.orange)
                }
            }
            .padding(14)
            .modifier(
                AppleLiquidGlassSurfaceModifier(
                    cornerRadius: 16,
                    variant: settings.glassVariant,
                    tintColor: nil,
                    interactive: false,
                    isDark: isDark,
                    liquidness: settings.liquidness,
                    isFullLiquid: isFullLiquid
                )
            )
        }
    }

    private func shortcutRow(_ key: String, _ label: String) -> some View {
        HStack {
            Text(key)
                .font(.system(size: 11.5, weight: .bold, design: .monospaced))
                .frame(width: 120, alignment: .leading)
            Text(label)
                .font(.system(size: 11.5))
        }
    }
}
