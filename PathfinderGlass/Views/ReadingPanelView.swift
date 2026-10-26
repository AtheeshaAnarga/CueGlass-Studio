import SwiftUI
import AppKit

// MARK: - Custom Tahoe Liquid Glass Design System (1:1 Visual Parity with AI Studio Preview)

public struct AppleLiquidGlassContainer<Content: View>: View {
    public let spacing: CGFloat
    @ViewBuilder public let content: () -> Content

    public init(spacing: CGFloat = 10.0, @ViewBuilder content: @escaping () -> Content) {
        self.spacing = spacing
        self.content = content
    }

    public var body: some View {
        content()
    }
}

/// Renders the exact Tahoe Liquid Glass card/pill surface from the AI Studio web preview:
/// luminous frosted crystal in Light Mode, deep obsidian slate in Dark Mode, with a 1pt specular rim.
public struct AppleLiquidGlassSurfaceModifier: ViewModifier {
    public let cornerRadius: CGFloat
    public let isCapsule: Bool
    public let variant: AppleGlassVariant
    public let tintColor: Color?
    public let interactive: Bool
    public let isDark: Bool
    public let liquidness: Double
    public let isFullLiquid: Bool

    public init(
        cornerRadius: CGFloat = 14,
        isCapsule: Bool = false,
        variant: AppleGlassVariant = .clear,
        tintColor: Color? = nil,
        interactive: Bool = false,
        isDark: Bool = false,
        liquidness: Double = 88.0,
        isFullLiquid: Bool = true
    ) {
        self.cornerRadius = cornerRadius
        self.isCapsule = isCapsule
        self.variant = variant
        self.tintColor = tintColor
        self.interactive = interactive
        self.isDark = isDark
        self.liquidness = liquidness
        self.isFullLiquid = isFullLiquid
    }

    public func body(content: Content) -> some View {
        if variant == .identity && tintColor == nil {
            content
        } else {
            let fill: Color = {
                if let tint = tintColor {
                    return tint
                }
                if !isFullLiquid {
                    return isDark
                        ? Color(red: 0.11, green: 0.14, blue: 0.21)
                        : Color(red: 0.95, green: 0.96, blue: 0.98)
                }
                return isDark
                    ? Color.white.opacity(0.065)
                    : Color.white.opacity(0.54)
            }()

            let rimColor: Color = {
                if !isFullLiquid {
                    return isDark
                        ? Color.white.opacity(0.10)
                        : Color(red: 0.82, green: 0.86, blue: 0.92)
                }
                return isDark
                    ? Color.white.opacity(0.13)
                    : Color.white.opacity(0.82)
            }()

            if isCapsule {
                content
                    .background(
                        Capsule(style: .continuous)
                            .fill(fill)
                    )
                    .overlay(
                        Capsule(style: .continuous)
                            .strokeBorder(rimColor, lineWidth: 1)
                    )
            } else {
                content
                    .background(
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .fill(fill)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .strokeBorder(rimColor, lineWidth: 1)
                    )
            }
        }
    }
}

/// Custom Tahoe Liquid Glass Button Style matching `.apple-glass-btn`, `.apple-glass-btn-dark`, and `.apple-glass-btn-prominent` in AI Studio.
public struct AppleTahoeLiquidGlassButtonStyle: ButtonStyle {
    public let isProminent: Bool
    public let isDark: Bool
    public let tintColor: Color?
    public let isFullLiquid: Bool
    public let isCompactIcon: Bool
    @State private var isHovering: Bool = false

    public init(
        isProminent: Bool = false,
        isDark: Bool = false,
        tintColor: Color? = nil,
        isFullLiquid: Bool = true,
        isCompactIcon: Bool = false
    ) {
        self.isProminent = isProminent
        self.isDark = isDark
        self.tintColor = tintColor
        self.isFullLiquid = isFullLiquid
        self.isCompactIcon = isCompactIcon
    }

    public func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed
        let baseRoyalBlue = Color(red: 0.137, green: 0.388, blue: 0.851) // #2363D9
        let prominentFill = tintColor ?? baseRoyalBlue

        let backgroundFill: Color = {
            if isProminent {
                return prominentFill.opacity(pressed ? 0.96 : (isHovering ? 0.92 : 0.88))
            }
            if isDark {
                return Color.white.opacity(pressed ? 0.18 : (isHovering ? 0.13 : 0.08))
            } else {
                return Color.white.opacity(pressed ? 0.85 : (isHovering ? 0.74 : 0.60))
            }
        }()

        let borderStroke: Color = {
            if isProminent {
                return Color.white.opacity(0.35)
            }
            if isDark {
                return Color.white.opacity(isHovering ? 0.22 : 0.13)
            } else {
                return Color.white.opacity(0.88)
            }
        }()

        let fgColor: Color = {
            if isProminent {
                return .white
            }
            if let customTint = tintColor {
                return customTint
            }
            return isDark
                ? Color(red: 0.93, green: 0.96, blue: 1.0)
                : Color(red: 0.09, green: 0.12, blue: 0.18)
        }()

        return configuration.label
            .padding(.horizontal, isCompactIcon ? 6 : 10)
            .padding(.vertical, isCompactIcon ? 5 : 5.5)
            .background(
                RoundedRectangle(cornerRadius: isFullLiquid ? 10 : 8, style: .continuous)
                    .fill(backgroundFill)
            )
            .overlay(
                RoundedRectangle(cornerRadius: isFullLiquid ? 10 : 8, style: .continuous)
                    .strokeBorder(borderStroke, lineWidth: 1)
            )
            .foregroundColor(fgColor)
            .scaleEffect(pressed ? 0.97 : 1.0)
            .animation(.easeOut(duration: 0.12), value: pressed)
            .animation(.easeOut(duration: 0.12), value: isHovering)
            .onHover { hovering in
                isHovering = hovering
            }
    }
}

public extension View {
    @ViewBuilder
    func appleLiquidGlassButton(
        prominent: Bool = false,
        isDark: Bool = false,
        tint: Color? = nil,
        isFullLiquid: Bool = true,
        compactIcon: Bool = false
    ) -> some View {
        self.buttonStyle(
            AppleTahoeLiquidGlassButtonStyle(
                isProminent: prominent,
                isDark: isDark,
                tintColor: tint,
                isFullLiquid: isFullLiquid,
                isCompactIcon: compactIcon
            )
        )
    }

    @ViewBuilder
    func appleLiquidGlassID<ID: Hashable & Sendable>(_ id: ID, in namespace: Namespace.ID) -> some View {
        self
    }
}

/// Clean Tahoe Liquid Glass Slider matching the AI Studio preview (label + monospaced value pill + crisp slider track).
public struct AppleLiquidGlassSlider: View {
    public let title: String
    public let valueLabel: String
    @Binding public var value: Double
    public let range: ClosedRange<Double>
    public let isDark: Bool
    public let isFullLiquid: Bool
    public let accentTint: Color

    public init(
        title: String,
        valueLabel: String,
        value: Binding<Double>,
        in range: ClosedRange<Double>,
        isDark: Bool = false,
        isFullLiquid: Bool = true,
        accentTint: Color = Color(red: 0.137, green: 0.388, blue: 0.851)
    ) {
        self.title = title
        self.valueLabel = valueLabel
        self._value = value
        self.range = range
        self.isDark = isDark
        self.isFullLiquid = isFullLiquid
        self.accentTint = accentTint
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(title)
                    .font(.system(size: 11.5, weight: .medium))
                    .foregroundColor(isDark ? Color(red: 0.88, green: 0.92, blue: 0.98) : Color(red: 0.12, green: 0.16, blue: 0.23))
                Spacer()
                Text(valueLabel)
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(isDark ? Color(red: 0.45, green: 0.78, blue: 1.0) : accentTint)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 2)
                    .background(
                        Capsule(style: .continuous)
                            .fill(accentTint.opacity(isDark ? 0.20 : 0.12))
                    )
            }
            Slider(value: $value, in: range)
                .tint(accentTint)
                .controlSize(.small)
        }
    }
}

/// Window/Popover background modifier matching `glassPhysics` in `src/App.tsx`.
public struct LiquidGlassBackgroundModifier: ViewModifier {
    public let cornerRadius: CGFloat
    public let themeMode: AppThemeMode
    public let layoutMode: WindowSurfaceLayoutMode
    public let variant: AppleGlassVariant
    public let tintPreset: AppleGlassTintPreset
    public let liquidness: Double
    public let transparency: Double
    public let glassEffectLevel: Double

    public init(
        cornerRadius: CGFloat,
        themeMode: AppThemeMode,
        layoutMode: WindowSurfaceLayoutMode = .fullLiquidGlass,
        variant: AppleGlassVariant = .clear,
        tintPreset: AppleGlassTintPreset = .crystalNeutral,
        liquidness: Double = 88.0,
        transparency: Double = 82.0,
        glassEffectLevel: Double = 92.0
    ) {
        self.cornerRadius = cornerRadius
        self.themeMode = themeMode
        self.layoutMode = layoutMode
        self.variant = variant
        self.tintPreset = tintPreset
        self.liquidness = liquidness
        self.transparency = transparency
        self.glassEffectLevel = glassEffectLevel
    }

    private var isDark: Bool {
        themeMode == .dark
    }

    private var surfaceAlpha: Double {
        if layoutMode == .classicCard {
            return 0.97
        }
        if isDark {
            let base = (variant == .regular) ? 0.72 : 0.60
            return min(max(base + (1.0 - transparency / 100.0) * 0.25, 0.35), 0.92)
        } else {
            let base = (variant == .regular) ? 0.84 : (variant == .identity ? 0.56 : 0.76)
            return min(max(base + (1.0 - transparency / 100.0) * 0.18, 0.50), 0.95)
        }
    }

    public func body(content: Content) -> some View {
        let r = layoutMode == .classicCard ? 18.0 : cornerRadius
        let topColor: Color = isDark
            ? Color(red: 0.063, green: 0.090, blue: 0.149).opacity(surfaceAlpha)
            : Color(red: 0.988, green: 0.996, blue: 1.0).opacity(surfaceAlpha)
        let bottomColor: Color = {
            if let tinted = tintPreset.swiftUIColor(isDark: isDark, opacity: surfaceAlpha * 0.92),
               tintPreset != .crystalNeutral {
                return tinted
            }
            return isDark
                ? Color(red: 0.043, green: 0.063, blue: 0.110).opacity(surfaceAlpha * 0.95)
                : Color(red: 0.965, green: 0.980, blue: 1.0).opacity(surfaceAlpha * 0.94)
        }()
        let borderColor: Color = isDark
            ? Color.white.opacity(0.15)
            : Color.white.opacity(0.85)

        return content
            .background(
                RoundedRectangle(cornerRadius: r, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [topColor, bottomColor],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: r, style: .continuous)
                    .strokeBorder(borderColor, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: r, style: .continuous))
            .environment(\.colorScheme, isDark ? .dark : .light)
    }
}

public struct ReadingPanelView: View {
    @ObservedObject public var coordinator: AppCoordinator
    @ObservedObject private var navigation: ScriptNavigationController
    @ObservedObject private var settings: SettingsStore
    @ObservedObject private var voiceFollow: VoiceAutoFollowController
    @Namespace private var glassMorphNamespace
    @State private var isHoveringBottomControls: Bool = false
    @State private var copiedAIPromptFeedback: Bool = false

    public init(coordinator: AppCoordinator) {
        self.coordinator = coordinator
        self.navigation = coordinator.navigation
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
            microHeaderBar
            if !isFullLiquid {
                Divider().opacity(isDark ? 0.18 : 0.22)
            }
            readingViewport
            if !isFullLiquid {
                Divider().opacity(isDark ? 0.18 : 0.22)
            }
            bottomControlStrip
        }
        .modifier(
            LiquidGlassBackgroundModifier(
                cornerRadius: 24,
                themeMode: settings.themeMode,
                layoutMode: settings.windowLayoutMode,
                variant: settings.glassVariant,
                tintPreset: settings.glassTintPreset,
                liquidness: settings.liquidness,
                transparency: settings.glassTransparency,
                glassEffectLevel: settings.glassEffectLevel
            )
        )
    }

    private func copyAIMasterPromptToPasteboard() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(ScriptStore.universalAIMasterPrompt, forType: .string)
        copiedAIPromptFeedback = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) {
            copiedAIPromptFeedback = false
        }
    }

    // MARK: - 1. Top Micro Header Bar (Matches AI Studio Floating Panel Header)

    private var microHeaderBar: some View {
        HStack(spacing: 6) {
            if let section = navigation.activeSection {
                HStack(spacing: 5) {
                    Text(section.numberBadge)
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(
                            isDark
                                ? Color(red: 0.22, green: 0.74, blue: 0.97)
                                : Color(red: 0.137, green: 0.388, blue: 0.851)
                        )
                    Text(section.shortTitle)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(
                            isDark
                                ? Color.white
                                : Color(red: 0.04, green: 0.06, blue: 0.08)
                        )
                        .lineLimit(1)
                }
            }

            Spacer(minLength: 4)

            let unresolvedCriticalCount = navigation.document.allPlaceholders.filter {
                $0.isDataScienceCritical && !settings.rehearsalAcknowledgedPlaceholders.contains($0.id)
            }.count

            if unresolvedCriticalCount > 0 {
                Button {
                    coordinator.openPreflightWindow()
                } label: {
                    HStack(spacing: 3.5) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 10))
                        Text("\(unresolvedCriticalCount)")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                    }
                }
                .appleLiquidGlassButton(
                    prominent: false,
                    isDark: isDark,
                    tint: isDark ? Color(red: 0.98, green: 0.80, blue: 0.32) : Color(red: 0.72, green: 0.36, blue: 0.04),
                    isFullLiquid: isFullLiquid,
                    compactIcon: true
                )
                .help("Unconfirmed speaker placeholders — click to open Preflight Check")
            }

            Button {
                copyAIMasterPromptToPasteboard()
            } label: {
                Image(systemName: copiedAIPromptFeedback ? "checkmark" : "sparkles")
                    .font(.system(size: 11.5, weight: .semibold))
                    .frame(width: 16, height: 16)
            }
            .appleLiquidGlassButton(
                prominent: copiedAIPromptFeedback,
                isDark: isDark,
                tint: copiedAIPromptFeedback
                    ? Color(red: 0.06, green: 0.65, blue: 0.42)
                    : (isDark ? Color(red: 0.56, green: 0.84, blue: 0.98) : Color(red: 0.09, green: 0.29, blue: 0.66)),
                isFullLiquid: isFullLiquid,
                compactIcon: true
            )
            .help("Copy Universal AI Script Generator Prompt & Syntax Guide for Gemini, Claude, or ChatGPT")

            Button {
                coordinator.isToolsPopoverOpen = false
                coordinator.isThemePopoverOpen = false
                coordinator.isSectionsPopoverOpen.toggle()
            } label: {
                Image(systemName: "list.number")
                    .font(.system(size: 11.5, weight: .semibold))
                    .frame(width: 16, height: 16)
            }
            .appleLiquidGlassButton(
                prominent: coordinator.isSectionsPopoverOpen,
                isDark: isDark,
                isFullLiquid: isFullLiquid,
                compactIcon: true
            )
            .help("Sections Palette & Find")
            .popover(isPresented: $coordinator.isSectionsPopoverOpen, arrowEdge: .bottom) {
                SectionsPaletteView(coordinator: coordinator)
            }

            Button {
                coordinator.isSectionsPopoverOpen = false
                coordinator.isThemePopoverOpen = false
                coordinator.isToolsPopoverOpen.toggle()
            } label: {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 11.5, weight: .semibold))
                    .frame(width: 16, height: 16)
            }
            .appleLiquidGlassButton(
                prominent: coordinator.isToolsPopoverOpen,
                isDark: isDark,
                isFullLiquid: isFullLiquid,
                compactIcon: true
            )
            .help("Backup Lines (10), Moderator Questions (11) & Organizer Checklist (12)")
            .popover(isPresented: $coordinator.isToolsPopoverOpen, arrowEdge: .bottom) {
                QuickReferenceView(coordinator: coordinator)
            }

            Button {
                coordinator.openEditorWindow()
            } label: {
                Image(systemName: "square.and.pencil")
                    .font(.system(size: 11.5, weight: .semibold))
                    .frame(width: 16, height: 16)
            }
            .appleLiquidGlassButton(
                prominent: false,
                isDark: isDark,
                isFullLiquid: isFullLiquid,
                compactIcon: true
            )
            .help("Edit Script, Syntax Guide & Rolling Versions (⌘E)")

            Button {
                coordinator.isSectionsPopoverOpen = false
                coordinator.isToolsPopoverOpen = false
                coordinator.isThemePopoverOpen.toggle()
            } label: {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 11.5, weight: .semibold))
                    .frame(width: 16, height: 16)
            }
            .appleLiquidGlassButton(
                prominent: coordinator.isThemePopoverOpen,
                isDark: isDark,
                isFullLiquid: isFullLiquid,
                compactIcon: true
            )
            .help("Liquid Glass Cap Settings, Layout Mode & Light/Dark Theme")
            .popover(isPresented: $coordinator.isThemePopoverOpen, arrowEdge: .bottom) {
                compactThemeSettingsPopover
            }

            Button {
                coordinator.toggleCollapse()
            } label: {
                Image(systemName: "minus")
                    .font(.system(size: 11.5, weight: .bold))
                    .frame(width: 16, height: 16)
            }
            .appleLiquidGlassButton(
                prominent: false,
                isDark: isDark,
                isFullLiquid: isFullLiquid,
                compactIcon: true
            )
            .help("Collapse to Draggable Liquid Glass Dot (⌃⌥P)")
        }
        .padding(.horizontal, 12)
        .frame(height: 42)
    }

    // MARK: - Compact Quick Cap Settings Popover (Matches AI Studio Gear Popover)

    private var compactThemeSettingsPopover: some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack {
                Text("APPEARANCE & SURFACE MODE")
                    .font(.system(size: 10.5, weight: .bold))
                    .tracking(0.5)
                    .foregroundColor(.secondary)
                Spacer()
                Text("⌘⇧T")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(.secondary)
            }

            // Light / Dark Theme Pill Selector
            HStack(spacing: 6) {
                Button {
                    settings.themeMode = .light
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "sun.max.fill")
                            .font(.system(size: 11))
                            .foregroundColor(settings.themeMode == .light ? .white : .orange)
                        Text("Light Theme")
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
                            .font(.system(size: 11))
                            .foregroundColor(settings.themeMode == .dark ? .white : .cyan)
                        Text("Dark Theme")
                            .font(.system(size: 11.5, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                }
                .appleLiquidGlassButton(prominent: settings.themeMode == .dark, isDark: isDark, isFullLiquid: isFullLiquid)
            }

            // 1-Click Tahoe Dark Glass & Apple Clear Glass Presets
            HStack(spacing: 6) {
                Button {
                    settings.applyTahoeDarkGlassPreset()
                } label: {
                    Text("Tahoe Dark Glass")
                        .font(.system(size: 11, weight: .semibold))
                        .frame(maxWidth: .infinity)
                }
                .appleLiquidGlassButton(
                    prominent: isDark && isFullLiquid && settings.glassVariant == .identity,
                    isDark: isDark,
                    isFullLiquid: isFullLiquid
                )

                Button {
                    settings.resetToAppleLiquidGlassLight()
                } label: {
                    Text("Apple Clear Glass")
                        .font(.system(size: 11, weight: .semibold))
                        .frame(maxWidth: .infinity)
                }
                .appleLiquidGlassButton(
                    prominent: !isDark && isFullLiquid && settings.glassVariant == .clear,
                    isDark: isDark,
                    isFullLiquid: isFullLiquid
                )
            }

            // Window Surface Mode
            VStack(alignment: .leading, spacing: 5) {
                Text("WINDOW SURFACE MODE")
                    .font(.system(size: 9.5, weight: .bold))
                    .tracking(0.5)
                    .foregroundColor(.secondary)
                HStack(spacing: 6) {
                    Button {
                        settings.windowLayoutMode = .fullLiquidGlass
                    } label: {
                        Text("Liquid Glass")
                            .font(.system(size: 11, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .appleLiquidGlassButton(prominent: isFullLiquid, isDark: isDark, isFullLiquid: isFullLiquid)

                    Button {
                        settings.windowLayoutMode = .classicCard
                    } label: {
                        Text("Classic Card UI")
                            .font(.system(size: 11, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .appleLiquidGlassButton(prominent: !isFullLiquid, isDark: isDark, isFullLiquid: isFullLiquid)
                }
            }

            if isFullLiquid {
                VStack(alignment: .leading, spacing: 5) {
                    Text("APPLE LIQUID GLASS VARIANT")
                        .font(.system(size: 9.5, weight: .bold))
                        .tracking(0.5)
                        .foregroundColor(.secondary)
                    HStack(spacing: 5) {
                        ForEach([
                            (AppleGlassVariant.clear, "Clear"),
                            (AppleGlassVariant.regular, "Regular"),
                            (AppleGlassVariant.identity, "Identity")
                        ], id: \.0) { item in
                            Button {
                                settings.glassVariant = item.0
                            } label: {
                                Text(item.1)
                                    .font(.system(size: 11, weight: .semibold))
                                    .frame(maxWidth: .infinity)
                            }
                            .appleLiquidGlassButton(prominent: settings.glassVariant == item.0, isDark: isDark, isFullLiquid: isFullLiquid)
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 7) {
                    AppleLiquidGlassSlider(
                        title: "Liquidness (Refraction)",
                        valueLabel: "\(Int(settings.liquidness))%",
                        value: $settings.liquidness,
                        in: 10...100,
                        isDark: isDark,
                        isFullLiquid: isFullLiquid
                    )
                    AppleLiquidGlassSlider(
                        title: "Transparency",
                        valueLabel: "\(Int(settings.glassTransparency))%",
                        value: $settings.glassTransparency,
                        in: 10...95,
                        isDark: isDark,
                        isFullLiquid: isFullLiquid
                    )
                    AppleLiquidGlassSlider(
                        title: "Glass Effect Level (Blur)",
                        valueLabel: "\(Int(settings.glassEffectLevel))%",
                        value: $settings.glassEffectLevel,
                        in: 15...100,
                        isDark: isDark,
                        isFullLiquid: isFullLiquid
                    )
                }
            }

            // Font Size & Boldness
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Size: \(Int(settings.fontSize))pt · Weight: \(settings.fontWeightOption.rawValue)")
                        .font(.system(size: 11, weight: .medium, design: .monospaced))
                    Spacer()
                    Button("A-") { settings.adjustFontSize(by: -2) }
                        .appleLiquidGlassButton(isDark: isDark, isFullLiquid: isFullLiquid, compactIcon: true)
                    Button("A+") { settings.adjustFontSize(by: 2) }
                        .appleLiquidGlassButton(isDark: isDark, isFullLiquid: isFullLiquid, compactIcon: true)
                }

                HStack(spacing: 5) {
                    ForEach([
                        (FontBoldnessWeight.regular, "Reg"),
                        (FontBoldnessWeight.medium, "Med"),
                        (FontBoldnessWeight.semibold, "Semi"),
                        (FontBoldnessWeight.bold, "Bold")
                    ], id: \.0) { item in
                        Button {
                            settings.fontWeightOption = item.0
                        } label: {
                            Text(item.1)
                                .font(.system(size: 10.5, weight: .semibold))
                                .frame(maxWidth: .infinity)
                        }
                        .appleLiquidGlassButton(prominent: settings.fontWeightOption == item.0, isDark: isDark, isFullLiquid: isFullLiquid)
                    }
                }
            }

            // Voice Follow Spoken Word Darkening Quick Pill
            VStack(alignment: .leading, spacing: 5) {
                Text("VOICE FOLLOW · SPOKEN WORD DARKENING")
                    .font(.system(size: 9.5, weight: .bold))
                    .tracking(0.5)
                    .foregroundColor(.secondary)
                HStack(spacing: 6) {
                    Button {
                        settings.voiceDarkenWords = true
                    } label: {
                        Text("Darken Words")
                            .font(.system(size: 11, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .appleLiquidGlassButton(prominent: settings.voiceDarkenWords, isDark: isDark, isFullLiquid: isFullLiquid)

                    Button {
                        settings.voiceDarkenWords = false
                    } label: {
                        Text("Clean (No Darken)")
                            .font(.system(size: 11, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .appleLiquidGlassButton(prominent: !settings.voiceDarkenWords, isDark: isDark, isFullLiquid: isFullLiquid)
                }
            }

            Button {
                coordinator.isThemePopoverOpen = false
                coordinator.openSettingsWindow()
            } label: {
                HStack {
                    Image(systemName: "slider.horizontal.3")
                    Text("All Cap Settings & Shortcuts…")
                    Spacer()
                    Text("→")
                }
                .font(.system(size: 11.5, weight: .semibold))
                .frame(maxWidth: .infinity)
            }
            .appleLiquidGlassButton(prominent: true, isDark: isDark, isFullLiquid: isFullLiquid)
        }
        .padding(14)
        .frame(width: 315)
        .modifier(
            LiquidGlassBackgroundModifier(
                cornerRadius: 18,
                themeMode: settings.themeMode,
                layoutMode: settings.windowLayoutMode,
                variant: .regular,
                tintPreset: settings.glassTintPreset,
                liquidness: settings.liquidness,
                transparency: 20,
                glassEffectLevel: 95
            )
        )
    }

    // MARK: - 2. Reading Viewport (Matches AI Studio Reading Viewport)

    private var readingViewport: some View {
        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: true) {
                VStack(alignment: .leading, spacing: 10) {
                    if let snippet = navigation.activeOnDemandSnippet {
                        onDemandSnippetCard(snippet)
                    } else if let section = navigation.activeSection {
                        if section.number == 8 && !section.subsections.isEmpty {
                            qaQuickPickBar(section: section)
                        }

                        ForEach(section.blocks) { block in
                            if block.kind.isCueCard && !settings.showOrganizerCues {
                                EmptyView()
                            } else {
                                beatRowView(block: block)
                                    .id(block.id)
                            }
                        }
                    }
                }
                .padding(.horizontal, settings.narrowReadingWidth ? 34 : 16)
                .padding(.top, 12)
                .padding(.bottom, 100)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Color.clear)
            .onChange(of: navigation.activeBeatID) { _, newBeatID in
                guard navigation.activeOnDemandSnippet == nil else { return }
                let anchorPoint = UnitPoint(x: 0.5, y: 0.22)
                if NSWorkspace.shared.accessibilityDisplayShouldReduceMotion {
                    proxy.scrollTo(newBeatID, anchor: anchorPoint)
                } else {
                    withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                        proxy.scrollTo(newBeatID, anchor: anchorPoint)
                    }
                }
            }
        }
    }

    private func onDemandSnippetCard(_ snippet: EmergencySnippet) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("ON-DEMAND · \(snippet.category.uppercased())")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(
                        isDark
                            ? Color(red: 0.38, green: 0.72, blue: 0.98)
                            : Color(red: 0.137, green: 0.388, blue: 0.851)
                    )
                Spacer()
                Button {
                    navigation.returnToLivePosition()
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "arrow.uturn.backward")
                        Text("Return to live position")
                    }
                    .font(.system(size: 11.5, weight: .semibold))
                }
                .appleLiquidGlassButton(prominent: true, isDark: isDark, isFullLiquid: isFullLiquid)
            }

            Text(snippet.title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.secondary)

            ForEach(snippet.spokenLines, id: \.self) { line in
                Text(line)
                    .font(.system(size: settings.fontSize, weight: settings.fontWeightOption.swiftUIWeight))
                    .lineSpacing(CGFloat(settings.fontSize * (settings.lineHeightMultiplier - 1.0)))
                    .foregroundColor(
                        isDark
                            ? Color.white
                            : Color(red: 0.04, green: 0.06, blue: 0.09)
                    )
            }

            ForEach(snippet.organizerNotes, id: \.self) { note in
                HStack(alignment: .top, spacing: 6) {
                    Image(systemName: "info.circle.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.orange)
                    Text(note)
                        .font(.system(size: 12.5, weight: .medium))
                        .foregroundColor(
                            isDark
                                ? Color(red: 0.98, green: 0.85, blue: 0.55)
                                : Color(red: 0.55, green: 0.28, blue: 0.04)
                        )
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color.orange.opacity(isDark ? 0.16 : 0.14))
                )
            }
        }
        .padding(14)
        .modifier(
            AppleLiquidGlassSurfaceModifier(
                cornerRadius: 16,
                variant: settings.glassVariant,
                tintColor: Color.blue.opacity(0.10),
                interactive: settings.glassInteractive,
                isDark: isDark,
                liquidness: settings.liquidness,
                isFullLiquid: isFullLiquid
            )
        )
    }

    private func qaQuickPickBar(section: ScriptSection) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                Text("Q&A FLOW:")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.secondary)
                    .padding(.trailing, 2)
                ForEach(section.subsections) { sub in
                    Button {
                        navigation.selectBeat(sub.firstBlockID)
                    } label: {
                        Text(Self.shortQALabel(for: sub.title))
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
                }
            }
        }
    }

    private func cueCardAppearance(for kind: ScriptBlockKind) -> (icon: String, badge: String, fg: Color, badgeBg: Color, cardBg: Color) {
        switch kind {
        case .timingCue:
            return (
                "clock.fill",
                "TIMING & PACING",
                isDark ? Color(red: 0.82, green: 0.98, blue: 0.90) : Color(red: 0.02, green: 0.30, blue: 0.20),
                Color.green.opacity(isDark ? 0.26 : 0.20),
                Color.green.opacity(isDark ? 0.15 : 0.14)
            )
        case .visualCue:
            return (
                "display",
                "SLIDE / VISUAL",
                isDark ? Color(red: 0.82, green: 0.94, blue: 1.0) : Color(red: 0.03, green: 0.28, blue: 0.52),
                Color.cyan.opacity(isDark ? 0.26 : 0.20),
                Color.cyan.opacity(isDark ? 0.15 : 0.14)
            )
        case .deliveryCue:
            return (
                "mic.fill",
                "VOCAL DELIVERY",
                isDark ? Color(red: 0.92, green: 0.84, blue: 1.0) : Color(red: 0.32, green: 0.10, blue: 0.54),
                Color.purple.opacity(isDark ? 0.26 : 0.20),
                Color.purple.opacity(isDark ? 0.15 : 0.14)
            )
        case .actionCue:
            return (
                "play.fill",
                "STAGE ACTION",
                isDark ? Color(red: 0.80, green: 0.98, blue: 0.95) : Color(red: 0.03, green: 0.32, blue: 0.30),
                Color.teal.opacity(isDark ? 0.26 : 0.20),
                Color.teal.opacity(isDark ? 0.15 : 0.14)
            )
        case .conditionalCue:
            return (
                "questionmark.circle.fill",
                "CONDITIONAL RULE",
                isDark ? Color(red: 1.0, green: 0.88, blue: 0.72) : Color(red: 0.48, green: 0.20, blue: 0.03),
                Color.orange.opacity(isDark ? 0.28 : 0.22),
                Color.orange.opacity(isDark ? 0.16 : 0.15)
            )
        default:
            return (
                "info.circle.fill",
                "ORGANIZER CUE",
                isDark ? Color(red: 1.0, green: 0.92, blue: 0.72) : Color(red: 0.45, green: 0.24, blue: 0.03),
                Color.yellow.opacity(isDark ? 0.28 : 0.24),
                Color.orange.opacity(isDark ? 0.15 : 0.13)
            )
        }
    }

    private func beatRowView(block: ScriptBlock) -> some View {
        let isActive = (block.id == navigation.activeBeatID)
        let activeBarColor = isDark
            ? Color(red: 0.22, green: 0.74, blue: 0.97) // #38BDF8
            : Color(red: 0.137, green: 0.388, blue: 0.851) // #2363D9
        let glowFactor = settings.activeBeatGlow / 100.0

        return HStack(alignment: .top, spacing: 10) {
            // Slim Left-Edge Focus Marker matching AI Studio
            RoundedRectangle(cornerRadius: 99, style: .continuous)
                .fill(isActive ? activeBarColor : Color.clear)
                .frame(width: 4)
                .padding(.vertical, 2)
                .shadow(
                    color: isActive ? activeBarColor.opacity(isDark ? 0.6 : 0.35) : .clear,
                    radius: 4,
                    x: 0,
                    y: 0
                )

            VStack(alignment: .leading, spacing: 6) {
                switch block.kind {
                case .subsectionHeading:
                    Text(block.displayText)
                        .font(.system(size: 12, weight: .bold))
                        .tracking(0.6)
                        .foregroundColor(
                            isActive
                                ? activeBarColor
                                : (isDark ? Color(red: 0.58, green: 0.64, blue: 0.72) : Color(red: 0.39, green: 0.45, blue: 0.55))
                        )
                        .padding(.top, 2)

                case .organizerCue, .conditionalCue, .timingCue, .visualCue, .deliveryCue, .actionCue:
                    let style = cueCardAppearance(for: block.kind)
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: style.icon)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(style.fg)
                            .padding(.top, 2)

                        Text(style.badge)
                            .font(.system(size: 9.5, weight: .bold))
                            .tracking(0.5)
                            .foregroundColor(style.fg)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(
                                RoundedRectangle(cornerRadius: 5, style: .continuous)
                                    .fill(style.badgeBg)
                            )

                        Text(block.displayText)
                            .font(.system(size: max(12.5, round(settings.fontSize * 0.52)), weight: .medium))
                            .foregroundColor(style.fg)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(style.cardBg)
                    )

                case .divider:
                    if !isFullLiquid {
                        Divider().padding(.vertical, 4)
                    }

                default:
                    let baseColor: Color = isActive
                        ? (isDark
                            ? Color.white
                            : Color(red: 0.027, green: 0.035, blue: 0.055))
                        : (isDark
                            ? Color(red: 0.88, green: 0.91, blue: 0.96).opacity(0.90)
                            : Color(red: 0.118, green: 0.161, blue: 0.231))
                    let activeSpokenWords = (isActive && voiceFollow.isListening)
                        ? voiceFollow.spokenWordCount
                        : 0
                    Text(
                        Self.attributedBeatText(
                            from: block.rawMarkdown,
                            isActive: isActive,
                            isDark: isDark,
                            baseColor: baseColor,
                            isVoiceListening: isActive && voiceFollow.isListening,
                            spokenWordCount: activeSpokenWords,
                            darkenSpokenWords: settings.voiceDarkenWords,
                            darkenOpacity: settings.voiceDarkenOpacity / 100.0,
                            showTargetUnderline: settings.voiceShowTargetUnderline
                        )
                    )
                    .font(.system(size: settings.fontSize, weight: settings.fontWeightOption.swiftUIWeight))
                    .lineSpacing(CGFloat(settings.fontSize * (settings.lineHeightMultiplier - 1.0)))
                    .foregroundColor(baseColor)
                    .fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, block.kind.isCueCard ? 4 : 8)
        .padding(.horizontal, 11)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(
                    isActive
                        ? (isDark
                            ? Color.white.opacity(0.07 + glowFactor * 0.07)
                            : Color.white.opacity(0.44 + glowFactor * 0.24))
                        : Color.clear
                )
        )
        .contentShape(Rectangle())
        .onTapGesture {
            if block.isNavigableBeat {
                navigation.selectBeat(block.id)
            }
        }
    }

    // MARK: - 3. Bottom Control Strip (Matches AI Studio Bottom Control Strip)

    private var bottomControlStrip: some View {
        HStack(spacing: 6) {
            Button {
                navigation.previousBeat()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 12, weight: .bold))
                    .frame(width: 16, height: 16)
            }
            .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid, compactIcon: true)
            .help("Previous Beat (← or Shift+Space or ⌃⌥←)")

            Button {
                navigation.nextBeat()
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .frame(width: 16, height: 16)
            }
            .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid, compactIcon: true)
            .help("Next Beat (→ or Space or ⌃⌥→)")

            Button {
                voiceFollow.toggleListening()
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: voiceFollow.isListening ? "stop.fill" : "play.fill")
                        .font(.system(size: 9.5, weight: .bold))
                    Text(voiceFollow.isListening ? "Stop Voice" : "Voice Follow")
                        .font(.system(size: 11, weight: .semibold))
                        .lineLimit(1)
                    if voiceFollow.isListening {
                        Circle()
                            .fill(Color(red: 0.30, green: 0.92, blue: 0.62))
                            .frame(width: 6, height: 6)
                        if voiceFollow.activeBeatWordTotal > 0 {
                            Text("\(voiceFollow.spokenWordCount)/\(voiceFollow.activeBeatWordTotal)")
                                .font(.system(size: 10, weight: .medium, design: .monospaced))
                                .opacity(0.92)
                        }
                    }
                }
            }
            .appleLiquidGlassButton(
                prominent: voiceFollow.isListening,
                isDark: isDark,
                isFullLiquid: isFullLiquid
            )
            .help("Siri Dictation & System Audio Auto-Follow: Tracks spoken words in order and auto-advances lines hands-free")

            if voiceFollow.isListening && !voiceFollow.lastMatchedVoiceWord.isEmpty {
                HStack(spacing: 3) {
                    Image(systemName: "mic.fill")
                        .font(.system(size: 9))
                    Text(voiceFollow.lastMatchedVoiceWord)
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .lineLimit(1)
                }
                .foregroundColor(
                    isDark
                        ? Color(red: 0.42, green: 0.92, blue: 0.68)
                        : Color(red: 0.04, green: 0.48, blue: 0.32)
                )
                .padding(.horizontal, 5)
            }

            if let section = navigation.activeSection {
                Text("\(section.shortTitle) · Beat \(navigation.activeBeatIndexInSection)/\(max(1, navigation.currentSectionBeats.count))")
                    .font(.system(size: 11.5, weight: .medium, design: .monospaced))
                    .foregroundColor(
                        isDark
                            ? Color(red: 0.78, green: 0.84, blue: 0.92)
                            : Color(red: 0.22, green: 0.28, blue: 0.38)
                    )
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .padding(.leading, 2)
            }

            Spacer(minLength: 4)

            if let activeSection = navigation.activeSection,
               navigation.activeBeatID == activeSection.thankSpeakerWaypointBlockID,
               (activeSection.number ?? 99) < 9 {
                Button {
                    navigation.nextMainSection()
                } label: {
                    Text("Next (↓)")
                        .font(.system(size: 11, weight: .semibold))
                }
                .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
            }

            Button {
                coordinator.panelController?.positionNearCamera()
            } label: {
                Image(systemName: "scope")
                    .font(.system(size: 12, weight: .semibold))
                    .frame(width: 16, height: 16)
            }
            .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid, compactIcon: true)
            .help("Snap panel top-center below camera notch (⌃⌥H)")
        }
        .padding(.horizontal, 12)
        .frame(height: 42)
        .opacity(isHoveringBottomControls ? 1.0 : 0.95)
        .onHover { hovering in
            isHoveringBottomControls = hovering
        }
    }

    private static func shortQALabel(for rawTitle: String) -> String {
        let upper = rawTitle.uppercased()
        if upper.contains("SELECTING A QUESTION") { return "Select question" }
        if upper.contains("ANOTHER SPEAKER") { return "Another perspective" }
        if upper.contains("AUDIENCE IS QUIET") { return "Audience quiet" }
        if upper.contains("TOO MANY QUESTIONS") { return "Too many questions" }
        if upper.contains("ENDING THE Q&A") { return "End Q&A" }
        return rawTitle
    }

    private static func attributedBeatText(
        from markdown: String,
        isActive: Bool,
        isDark: Bool,
        baseColor: Color,
        isVoiceListening: Bool = false,
        spokenWordCount: Int = 0,
        darkenSpokenWords: Bool = true,
        darkenOpacity: Double = 0.32,
        showTargetUnderline: Bool = true
    ) -> AttributedString {
        let cleaned = markdown
            .replacingOccurrences(of: "==", with: "**")
            .replacingOccurrences(of: "[PAUSE]", with: " ⏸ PAUSE ")
            .replacingOccurrences(of: "[BEAT]", with: " ⏸ BEAT ")
            .replacingOccurrences(of: "[BREATHE]", with: " ⏸ BREATHE ")

        let shouldTrackWords = isActive && (spokenWordCount > 0 || (isVoiceListening && showTargetUnderline))
        guard shouldTrackWords else {
            if let parsed = try? AttributedString(markdown: cleaned) {
                return parsed
            }
            return AttributedString(cleaned)
        }

        let plainText: String
        if let parsed = try? AttributedString(markdown: cleaned) {
            plainText = String(parsed.characters)
        } else {
            plainText = cleaned
        }

        var result = AttributedString()
        var spokenIndex = 0
        let scanner = Scanner(string: plainText)
        scanner.charactersToBeSkipped = nil
        let effectiveDimOpacity = darkenSpokenWords ? darkenOpacity : 1.0
        let underlineColor = isDark
            ? NSColor(calibratedRed: 0.22, green: 0.74, blue: 0.97, alpha: 0.95)
            : NSColor(calibratedRed: 0.137, green: 0.388, blue: 0.851, alpha: 0.95)

        while !scanner.isAtEnd {
            if let ws = scanner.scanCharacters(from: .whitespacesAndNewlines), !ws.isEmpty {
                var wsAttr = AttributedString(ws)
                wsAttr.foregroundColor = baseColor.opacity(spokenIndex < spokenWordCount ? effectiveDimOpacity : 1.0)
                result.append(wsAttr)
            }
            if let word = scanner.scanUpToCharacters(from: .whitespacesAndNewlines), !word.isEmpty {
                let hasAlnum = word.unicodeScalars.contains { CharacterSet.alphanumerics.contains($0) }
                var wordAttr = AttributedString(word)
                if hasAlnum {
                    if spokenIndex < spokenWordCount {
                        wordAttr.foregroundColor = baseColor.opacity(effectiveDimOpacity)
                    } else {
                        wordAttr.foregroundColor = baseColor
                        if isVoiceListening && showTargetUnderline && spokenIndex == spokenWordCount {
                            wordAttr.underlineStyle = Text.LineStyle(pattern: .solid, color: Color(nsColor: underlineColor))
                        }
                    }
                    spokenIndex += 1
                } else {
                    wordAttr.foregroundColor = baseColor.opacity(spokenIndex <= spokenWordCount ? effectiveDimOpacity : 1.0)
                }
                result.append(wordAttr)
            }
        }
        return result
    }
}
