import SwiftUI
import AppKit

// MARK: - Official Apple Developer macOS 26 Tahoe Liquid Glass Components & Modifiers
// Reference: https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass

/// Wraps SwiftUI's official `GlassEffectContainer(spacing:)` on macOS 26 Tahoe (`#if compiler(>=6.2)`)
/// so nearby Liquid Glass buttons, pills, sliders, and cards blend and morph into a single fluid glass droplet.
public struct AppleLiquidGlassContainer<Content: View>: View {
    public let spacing: CGFloat
    @ViewBuilder public let content: () -> Content

    public init(spacing: CGFloat = 10.0, @ViewBuilder content: @escaping () -> Content) {
        self.spacing = spacing
        self.content = content
    }

    public var body: some View {
        #if compiler(>=6.2)
        if #available(macOS 26.0, *) {
            GlassEffectContainer(spacing: spacing) {
                content()
            }
        } else {
            content()
        }
        #else
        content()
        #endif
    }
}

/// Applies Apple's official `.glassEffect(_:in:)` modifier (`Glass.clear`, `Glass.regular`, `Glass.identity`)
/// with `.tint(_:)` and `.interactive(_:)` on macOS 26 Tahoe ONLY when `isFullLiquid` is true.
/// When `isFullLiquid` is false (Classic Card UI), uses a simple flat surface with no Liquid Glass.
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
        if !isFullLiquid {
            classicFlatBody(content: content)
        } else {
            #if compiler(>=6.2)
            if #available(macOS 26.0, *) {
                let baseGlass: Glass = {
                    switch variant {
                    case .regular: return .regular
                    case .clear: return .clear
                    case .identity: return .identity
                    }
                }()
                let tintedGlass = tintColor != nil ? baseGlass.tint(tintColor) : baseGlass
                let finalGlass = interactive ? tintedGlass.interactive(true) : tintedGlass
                if isCapsule {
                    content.glassEffect(finalGlass, in: Capsule(style: .continuous))
                } else {
                    content.glassEffect(finalGlass, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                }
            } else {
                fallbackClearGlassBody(content: content)
            }
            #else
            fallbackClearGlassBody(content: content)
            #endif
        }
    }

    @ViewBuilder
    private func classicFlatBody(content: Content) -> some View {
        if variant == .identity && tintColor == nil {
            content
        } else {
            content.background(
                RoundedRectangle(cornerRadius: isCapsule ? 8 : min(cornerRadius, 10), style: .continuous)
                    .fill(tintColor ?? (isDark ? Color(red: 0.12, green: 0.15, blue: 0.22) : Color(red: 0.95, green: 0.96, blue: 0.98)))
            )
        }
    }

    @ViewBuilder
    private func fallbackClearGlassBody(content: Content) -> some View {
        let fillOpacity: Double = (variant == .clear) ? (isDark ? 0.12 : 0.28) : (variant == .identity ? 0.0 : (isDark ? 0.18 : 0.42))
        if isCapsule {
            content
                .background(
                    Capsule(style: .continuous)
                        .fill(tintColor ?? Color.white.opacity(fillOpacity))
                )
        } else {
            content
                .background(
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(tintColor ?? Color.white.opacity(fillOpacity))
                )
        }
    }
}

/// Interactive Button Style: uses borderless Liquid Glass when `isFullLiquid == true`, or simple flat buttons when `isFullLiquid == false`.
public struct AppleTahoeLiquidGlassButtonStyle: ButtonStyle {
    public let isProminent: Bool
    public let isDark: Bool
    public let tintColor: Color?
    public let isFullLiquid: Bool
    @State private var isHovering: Bool = false

    public init(isProminent: Bool = false, isDark: Bool = false, tintColor: Color? = nil, isFullLiquid: Bool = true) {
        self.isProminent = isProminent
        self.isDark = isDark
        self.tintColor = tintColor
        self.isFullLiquid = isFullLiquid
    }

    public func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed
        return configuration.label
            .padding(.horizontal, 9)
            .padding(.vertical, 5)
            .background(
                Group {
                    if isFullLiquid {
                        Capsule(style: .continuous)
                            .fill(
                                isProminent
                                    ? (tintColor ?? Color(red: 0.10, green: 0.44, blue: 0.96)).opacity(pressed ? 0.92 : 0.84)
                                    : (isDark
                                        ? Color.white.opacity(pressed ? 0.20 : (isHovering ? 0.15 : 0.09))
                                        : Color.white.opacity(pressed ? 0.68 : (isHovering ? 0.52 : 0.36)))
                            )
                    } else {
                        RoundedRectangle(cornerRadius: 7, style: .continuous)
                            .fill(
                                isProminent
                                    ? (tintColor ?? Color(red: 0.14, green: 0.39, blue: 0.85))
                                    : (isDark
                                        ? Color(red: 0.16, green: 0.20, blue: 0.28).opacity(pressed ? 0.95 : (isHovering ? 0.85 : 0.72))
                                        : Color(red: 0.93, green: 0.95, blue: 0.97).opacity(pressed ? 0.98 : (isHovering ? 0.92 : 0.85)))
                            )
                    }
                }
            )
            .foregroundColor(
                isProminent
                    ? .white
                    : (isDark ? Color(red: 0.94, green: 0.97, blue: 1.0) : Color(red: 0.08, green: 0.11, blue: 0.16))
            )
            .scaleEffect(isFullLiquid ? (pressed ? 0.97 : (isHovering ? 1.02 : 1.0)) : 1.0)
            .animation(.spring(response: 0.20, dampingFraction: 0.76), value: pressed)
            .animation(.spring(response: 0.20, dampingFraction: 0.76), value: isHovering)
            .onHover { hovering in
                isHovering = hovering
            }
    }
}

public extension View {
    @ViewBuilder
    func appleLiquidGlassButton(prominent: Bool = false, isDark: Bool = false, tint: Color? = nil, isFullLiquid: Bool = true) -> some View {
        if !isFullLiquid {
            self.buttonStyle(AppleTahoeLiquidGlassButtonStyle(isProminent: prominent, isDark: isDark, tintColor: tint, isFullLiquid: false))
        } else {
            #if compiler(>=6.2)
            if #available(macOS 26.0, *) {
                if prominent {
                    self.buttonStyle(.glassProminent)
                } else {
                    self.buttonStyle(.glass)
                }
            } else {
                self.buttonStyle(AppleTahoeLiquidGlassButtonStyle(isProminent: prominent, isDark: isDark, tintColor: tint, isFullLiquid: true))
            }
            #else
            self.buttonStyle(AppleTahoeLiquidGlassButtonStyle(isProminent: prominent, isDark: isDark, tintColor: tint, isFullLiquid: true))
            #endif
        }
    }

    @ViewBuilder
    func appleLiquidGlassID<ID: Hashable>(_ id: ID, in namespace: Namespace.ID) -> some View {
        #if compiler(>=6.2)
        if #available(macOS 26.0, *) {
            self.glassEffectID(id, in: namespace)
        } else {
            self
        }
        #else
        self
        #endif
    }
}

/// Official Apple macOS 26 Tahoe Liquid Glass Slider with borderless capsule track in Liquid Glass mode, or standard simple slider in Classic mode.
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
        accentTint: Color = Color(red: 0.12, green: 0.46, blue: 0.96)
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
                    .font(.system(size: 11, weight: .semibold))
                Spacer()
                Text(valueLabel)
                    .font(.system(size: 10.5, weight: .bold, design: .monospaced))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 1.5)
                    .modifier(
                        AppleLiquidGlassSurfaceModifier(
                            cornerRadius: 99,
                            isCapsule: true,
                            variant: .clear,
                            tintColor: accentTint.opacity(0.14),
                            interactive: false,
                            isDark: isDark,
                            isFullLiquid: isFullLiquid
                        )
                    )
            }
            Slider(value: $value, in: range)
                .tint(accentTint)
                .controlSize(.small)
                .padding(.horizontal, isFullLiquid ? 8 : 0)
                .padding(.vertical, isFullLiquid ? 4 : 0)
                .modifier(
                    AppleLiquidGlassSurfaceModifier(
                        cornerRadius: 99,
                        isCapsule: true,
                        variant: isFullLiquid ? .clear : .identity,
                        tintColor: nil,
                        interactive: isFullLiquid,
                        isDark: isDark,
                        isFullLiquid: isFullLiquid
                    )
                )
        }
    }
}

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

    private var plateOpacity: Double {
        if variant == .identity { return 0.02 }
        let factor = (variant == .clear) ? 0.90 : 0.76
        let base = 1.0 - (transparency / 100.0) * factor
        return min(max(base, 0.05), 0.85)
    }

    public func body(content: Content) -> some View {
        content
            .background(
                Group {
                    if layoutMode == .classicCard {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(isDark ? Color(red: 0.08, green: 0.10, blue: 0.15) : Color.white)
                    } else if let tint = tintPreset.swiftUIColor(isDark: isDark, opacity: plateOpacity * 0.32) {
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .fill(tint)
                    }
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: layoutMode == .classicCard ? 16 : cornerRadius, style: .continuous))
    }
}

public struct ReadingPanelView: View {
    @ObservedObject public var coordinator: AppCoordinator
    @ObservedObject private var navigation: ScriptNavigationController
    @ObservedObject private var settings: SettingsStore
    @Namespace private var glassMorphNamespace
    @State private var isHoveringBottomControls: Bool = false
    @State private var copiedAIPromptFeedback: Bool = false

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
        AppleLiquidGlassContainer(spacing: CGFloat(settings.glassContainerSpacing)) {
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
        }
        .modifier(
            LiquidGlassBackgroundModifier(
                cornerRadius: 22,
                themeMode: settings.themeMode,
                layoutMode: settings.windowLayoutMode,
                variant: settings.glassVariant,
                tintPreset: settings.glassTintPreset,
                liquidness: settings.liquidness,
                transparency: settings.glassTransparency,
                glassEffectLevel: settings.glassEffectLevel
            )
        )
        .sheet(isPresented: $coordinator.isPreflightSheetOpen) {
            PreflightView(coordinator: coordinator)
        }
        .sheet(isPresented: $coordinator.isCheatSheetOpen) {
            SettingsView(coordinator: coordinator)
        }
    }

    private func copyAIMasterPromptToPasteboard() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(ScriptStore.universalAIMasterPrompt, forType: .string)
        copiedAIPromptFeedback = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) {
            copiedAIPromptFeedback = false
        }
    }

    private var microHeaderBar: some View {
        HStack(spacing: 7) {
            Text(navigation.document.metadata.title)
                .font(.system(size: 11, weight: .bold, design: .default))
                .tracking(0.5)
                .lineLimit(1)
                .foregroundColor(
                    isDark
                        ? Color(red: 0.72, green: 0.80, blue: 0.92)
                        : Color(red: 0.20, green: 0.24, blue: 0.30)
                )

            if let section = navigation.activeSection {
                Text("·")
                    .foregroundColor(.secondary)
                Text("\(section.numberBadge) — \(section.shortTitle)")
                    .font(.system(size: 12.5, weight: .semibold))
                    .foregroundColor(
                        isDark
                            ? Color(red: 0.96, green: 0.98, blue: 1.0)
                            : Color(red: 0.06, green: 0.08, blue: 0.12)
                    )
                    .lineLimit(1)
            }

            Spacer()

            Button {
                copyAIMasterPromptToPasteboard()
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: copiedAIPromptFeedback ? "checkmark.circle.fill" : "sparkles")
                        .font(.system(size: 10, weight: .semibold))
                    Text(copiedAIPromptFeedback ? "Copied AI Prompt!" : "AI Prompt")
                        .font(.system(size: 10.5, weight: .semibold))
                }
            }
            .appleLiquidGlassButton(
                prominent: copiedAIPromptFeedback,
                isDark: isDark,
                tint: copiedAIPromptFeedback ? .green : Color(red: 0.12, green: 0.44, blue: 0.96),
                isFullLiquid: isFullLiquid
            )
            .help("Copy complete AI script formatting instructions & examples for Gemini, Claude, or ChatGPT")

            let unresolvedCriticalCount = navigation.document.allPlaceholders.filter {
                $0.isDataScienceCritical && !settings.rehearsalAcknowledgedPlaceholders.contains($0.id)
            }.count

            if unresolvedCriticalCount > 0 {
                Button {
                    coordinator.isPreflightSheetOpen = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 10))
                        Text("\(unresolvedCriticalCount)")
                            .font(.system(size: 11, weight: .bold))
                    }
                }
                .appleLiquidGlassButton(prominent: false, isDark: isDark, tint: .orange, isFullLiquid: isFullLiquid)
                .help("Speaker placeholders require confirmation before going live")
            }

            Button {
                coordinator.isSectionsPopoverOpen.toggle()
            } label: {
                Image(systemName: "list.number")
                    .font(.system(size: 11.5, weight: .semibold))
            }
            .appleLiquidGlassButton(prominent: coordinator.isSectionsPopoverOpen, isDark: isDark, isFullLiquid: isFullLiquid)
            .help("Sections Palette")
            .popover(isPresented: $coordinator.isSectionsPopoverOpen, arrowEdge: .bottom) {
                SectionsPaletteView(coordinator: coordinator)
            }

            Button {
                coordinator.isToolsPopoverOpen.toggle()
            } label: {
                Image(systemName: "bolt.horizontal.circle")
                    .font(.system(size: 11.5, weight: .semibold))
            }
            .appleLiquidGlassButton(prominent: coordinator.isToolsPopoverOpen, isDark: isDark, isFullLiquid: isFullLiquid)
            .help("Emergency Lines, Moderator Questions & Organizer Checklist")
            .popover(isPresented: $coordinator.isToolsPopoverOpen, arrowEdge: .bottom) {
                QuickReferenceView(coordinator: coordinator)
            }

            Button {
                coordinator.openEditorWindow()
            } label: {
                Image(systemName: "square.and.pencil")
                    .font(.system(size: 11.5, weight: .semibold))
            }
            .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
            .help("Open Markdown Script Editor (⌘E)")

            Button {
                coordinator.isThemePopoverOpen.toggle()
            } label: {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 11.5, weight: .semibold))
            }
            .appleLiquidGlassButton(prominent: coordinator.isThemePopoverOpen, isDark: isDark, isFullLiquid: isFullLiquid)
            .help("Official Apple Liquid Glass Cap Settings, Variant & Theme")
            .popover(isPresented: $coordinator.isThemePopoverOpen, arrowEdge: .bottom) {
                compactThemeSettingsPopover
            }

            Button {
                coordinator.toggleCollapse()
            } label: {
                Image(systemName: "minus.circle")
                    .font(.system(size: 11.5, weight: .semibold))
            }
            .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
            .help("Minimize to Floating Liquid Glass Dot (⌃⌥P)")
        }
        .padding(.horizontal, 12)
        .frame(height: 44)
    }

    private var compactThemeSettingsPopover: some View {
        AppleLiquidGlassContainer(spacing: 8) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Label("Theme & UI Surface", systemImage: "sparkles")
                        .font(.system(size: 11.5, weight: .bold))
                    Spacer()
                    Text("⌘⇧T")
                        .font(.system(size: 10.5, weight: .medium, design: .monospaced))
                        .foregroundColor(.secondary)
                }

                HStack(spacing: 8) {
                    themeChoiceButton(
                        mode: .light,
                        title: "Light Theme",
                        subtitle: "Clear Daylight",
                        icon: "sun.max.fill"
                    )
                    themeChoiceButton(
                        mode: .dark,
                        title: "Dark Theme",
                        subtitle: "Obsidian Slate",
                        icon: "moon.stars.fill"
                    )
                }

                Picker("UI Mode", selection: $settings.windowLayoutMode) {
                    Text("Liquid Glass").tag(WindowSurfaceLayoutMode.fullLiquidGlass)
                    Text("Classic Card UI").tag(WindowSurfaceLayoutMode.classicCard)
                }
                .pickerStyle(.segmented)
                .controlSize(.small)

                if isFullLiquid {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("APPLE LIQUID GLASS VARIANT")
                            .font(.system(size: 9.5, weight: .bold))
                            .foregroundColor(.secondary)
                        Picker("Glass Variant", selection: $settings.glassVariant) {
                            Text("Clear").tag(AppleGlassVariant.clear)
                            Text("Regular").tag(AppleGlassVariant.regular)
                            Text("Identity").tag(AppleGlassVariant.identity)
                        }
                        .pickerStyle(.segmented)
                        .controlSize(.small)
                    }

                    VStack(alignment: .leading, spacing: 8) {
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

                HStack {
                    Text("Font: \(Int(settings.fontSize))pt · \(settings.fontWeightOption.displayName)")
                        .font(.system(size: 11, weight: .medium).monospacedDigit())
                    Spacer()
                    Button("A-") { settings.adjustFontSize(by: -2) }
                        .appleLiquidGlassButton(isDark: isDark, isFullLiquid: isFullLiquid)
                    Button("A+") { settings.adjustFontSize(by: 2) }
                        .appleLiquidGlassButton(isDark: isDark, isFullLiquid: isFullLiquid)
                }

                Picker("Boldness", selection: $settings.fontWeightOption) {
                    Text("Reg").tag(FontBoldnessWeight.regular)
                    Text("Med").tag(FontBoldnessWeight.medium)
                    Text("Semi").tag(FontBoldnessWeight.semibold)
                    Text("Bold").tag(FontBoldnessWeight.bold)
                }
                .pickerStyle(.segmented)
                .controlSize(.small)

                Button {
                    coordinator.isThemePopoverOpen = false
                    coordinator.isCheatSheetOpen = true
                } label: {
                    HStack {
                        Image(systemName: "slider.horizontal.3")
                        Text("All Cap Settings & Shortcuts…")
                        Spacer()
                        Image(systemName: "arrow.right")
                    }
                    .font(.system(size: 11.5, weight: .semibold))
                }
                .appleLiquidGlassButton(prominent: true, isDark: isDark, isFullLiquid: isFullLiquid)
            }
            .padding(14)
            .frame(width: 320)
        }
    }

    private func themeChoiceButton(mode: AppThemeMode, title: String, subtitle: String, icon: String) -> some View {
        let selected = (settings.themeMode == mode)
        return Button {
            settings.themeMode = mode
        } label: {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 5) {
                    Image(systemName: icon)
                        .font(.system(size: 11, weight: .semibold))
                    Text(title)
                        .font(.system(size: 11.5, weight: .semibold))
                }
                Text(subtitle)
                    .font(.system(size: 9.5))
                    .opacity(0.8)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .appleLiquidGlassButton(prominent: selected, isDark: isDark, isFullLiquid: isFullLiquid)
    }

    private var readingViewport: some View {
        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: true) {
                VStack(alignment: .leading, spacing: 14) {
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
                .padding(.horizontal, settings.narrowReadingWidth ? 36 : 18)
                .padding(.top, 18)
                .padding(.bottom, 120)
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
                            : Color(red: 0.14, green: 0.39, blue: 0.85)
                    )
                Spacer()
                Button {
                    navigation.returnToLivePosition()
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "arrow.uturn.backward")
                        Text("Return to live position")
                    }
                    .font(.system(size: 12, weight: .semibold))
                }
                .appleLiquidGlassButton(prominent: true, isDark: isDark, isFullLiquid: isFullLiquid)
            }

            Text(snippet.title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.secondary)

            ForEach(snippet.spokenLines, id: \.self) { line in
                Text(line)
                    .font(.system(size: settings.fontSize, weight: settings.fontWeightOption.swiftUIWeight))
                    .lineSpacing(CGFloat(settings.fontSize * (settings.lineHeightMultiplier - 1.0)))
                    .foregroundColor(
                        isDark
                            ? Color(red: 0.96, green: 0.97, blue: 0.99)
                            : Color(red: 0.08, green: 0.09, blue: 0.11)
                    )
            }

            ForEach(snippet.organizerNotes, id: \.self) { note in
                Text("Cue: \(note)")
                    .font(.system(size: 13.5, weight: .medium))
                    .foregroundColor(
                        isDark
                            ? Color(red: 0.98, green: 0.82, blue: 0.42)
                            : Color(red: 0.65, green: 0.38, blue: 0.05)
                    )
                    .padding(8)
                    .modifier(
                        AppleLiquidGlassSurfaceModifier(
                            cornerRadius: 10,
                            variant: settings.glassVariant,
                            tintColor: Color.orange.opacity(0.18),
                            interactive: false,
                            isDark: isDark,
                            liquidness: settings.liquidness,
                            isFullLiquid: isFullLiquid
                        )
                    )
            }
        }
        .padding(14)
        .modifier(
            AppleLiquidGlassSurfaceModifier(
                cornerRadius: 14,
                variant: settings.glassVariant,
                tintColor: Color.blue.opacity(0.12),
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
                ForEach(section.subsections) { sub in
                    Button {
                        navigation.selectBeat(sub.firstBlockID)
                    } label: {
                        Text(Self.shortQALabel(for: sub.title))
                            .font(.system(size: 11.5, weight: .semibold))
                    }
                    .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
                }
            }
        }
    }

    private func cueCardAppearance(for kind: ScriptBlockKind) -> (icon: String, badge: String, fg: Color, tint: Color) {
        switch kind {
        case .timingCue:
            return (
                "clock.fill",
                "TIMING & PACING",
                isDark ? Color(red: 0.55, green: 0.95, blue: 0.75) : Color(red: 0.04, green: 0.46, blue: 0.28),
                Color.green.opacity(isDark ? 0.22 : 0.16)
            )
        case .visualCue:
            return (
                "display",
                "SLIDE / VISUAL",
                isDark ? Color(red: 0.56, green: 0.86, blue: 1.0) : Color(red: 0.05, green: 0.38, blue: 0.68),
                Color.cyan.opacity(isDark ? 0.22 : 0.16)
            )
        case .deliveryCue:
            return (
                "waveform.and.mic",
                "VOCAL DELIVERY",
                isDark ? Color(red: 0.84, green: 0.70, blue: 1.0) : Color(red: 0.42, green: 0.16, blue: 0.68),
                Color.purple.opacity(isDark ? 0.22 : 0.16)
            )
        case .actionCue:
            return (
                "play.circle.fill",
                "STAGE ACTION",
                isDark ? Color(red: 0.52, green: 0.92, blue: 0.88) : Color(red: 0.05, green: 0.45, blue: 0.42),
                Color.teal.opacity(isDark ? 0.22 : 0.16)
            )
        case .conditionalCue:
            return (
                "questionmark.diamond.fill",
                "CONDITIONAL",
                isDark ? Color(red: 0.98, green: 0.80, blue: 0.44) : Color(red: 0.68, green: 0.34, blue: 0.04),
                Color.orange.opacity(isDark ? 0.24 : 0.18)
            )
        default:
            return (
                "info.circle.fill",
                "ORGANIZER CUE",
                isDark ? Color(red: 0.98, green: 0.84, blue: 0.50) : Color(red: 0.58, green: 0.34, blue: 0.05),
                Color.yellow.opacity(isDark ? 0.22 : 0.18)
            )
        }
    }

    private func beatRowView(block: ScriptBlock) -> some View {
        let isActive = (block.id == navigation.activeBeatID)
        let activeBarColor = isDark
            ? Color(red: 0.28, green: 0.68, blue: 0.98)
            : Color(red: 0.10, green: 0.44, blue: 0.96)
        let glowFactor = settings.activeBeatGlow / 100.0

        return HStack(alignment: .top, spacing: 10) {
            RoundedRectangle(cornerRadius: 2.5, style: .continuous)
                .fill(isActive ? activeBarColor : Color.clear)
                .frame(width: 4)
                .padding(.vertical, 3)

            VStack(alignment: .leading, spacing: 6) {
                switch block.kind {
                case .subsectionHeading:
                    Text(block.displayText)
                        .font(.system(size: 12.5, weight: .bold))
                        .tracking(0.5)
                        .foregroundColor(isActive ? activeBarColor : .secondary)
                        .padding(.top, 6)
                case .organizerCue, .conditionalCue, .timingCue, .visualCue, .deliveryCue, .actionCue:
                    let style = cueCardAppearance(for: block.kind)
                    HStack(alignment: .top, spacing: 7) {
                        Image(systemName: style.icon)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(style.fg)
                            .padding(.top, 2)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(style.badge)
                                .font(.system(size: 9.5, weight: .bold))
                                .tracking(0.5)
                                .foregroundColor(style.fg)
                            Text(block.displayText)
                                .font(.system(size: max(13.5, settings.fontSize * 0.60), weight: .medium))
                                .foregroundColor(style.fg)
                        }
                    }
                    .padding(.horizontal, 11)
                    .padding(.vertical, 8)
                    .modifier(
                        AppleLiquidGlassSurfaceModifier(
                            cornerRadius: 11,
                            variant: settings.glassVariant,
                            tintColor: style.tint,
                            interactive: settings.glassInteractive,
                            isDark: isDark,
                            liquidness: settings.liquidness,
                            isFullLiquid: isFullLiquid
                        )
                    )
                case .divider:
                    Divider().padding(.vertical, 4)
                default:
                    Text(Self.attributedBeatText(from: block.rawMarkdown, isActive: isActive))
                        .font(.system(size: settings.fontSize, weight: settings.fontWeightOption.swiftUIWeight))
                        .lineSpacing(CGFloat(settings.fontSize * (settings.lineHeightMultiplier - 1.0)))
                        .foregroundColor(
                            isActive
                                ? (isDark
                                    ? Color(red: 0.98, green: 0.99, blue: 1.0)
                                    : Color(red: 0.04, green: 0.06, blue: 0.09))
                                : (isDark
                                    ? Color(red: 0.62, green: 0.67, blue: 0.76)
                                    : Color(red: 0.28, green: 0.32, blue: 0.40))
                        )
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, 7)
        .padding(.horizontal, 10)
        .modifier(
            AppleLiquidGlassSurfaceModifier(
                cornerRadius: 14,
                variant: isActive ? settings.glassVariant : .identity,
                tintColor: isActive
                    ? (isDark
                        ? Color.white.opacity(0.08 + glowFactor * 0.14)
                        : Color.white.opacity(0.28 + glowFactor * 0.28))
                    : nil,
                interactive: isActive && settings.glassInteractive,
                isDark: isDark,
                liquidness: settings.liquidness,
                isFullLiquid: isFullLiquid
            )
        )
        .appleLiquidGlassID(isActive ? "active-beat-focus-lens" : block.id, in: glassMorphNamespace)
        .contentShape(Rectangle())
        .onTapGesture {
            if block.isNavigableBeat {
                navigation.selectBeat(block.id)
            }
        }
    }

    private var bottomControlStrip: some View {
        HStack(spacing: 8) {
            Button {
                navigation.previousBeat()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 12.5, weight: .bold))
            }
            .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
            .help("Previous Beat (← or ⌃⌥←)")

            Button {
                navigation.nextBeat()
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 12.5, weight: .bold))
            }
            .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
            .help("Next Beat (→ or ⌃⌥→)")

            if let section = navigation.activeSection {
                Text("\(section.shortTitle) · Beat \(navigation.activeBeatIndexInSection)/\(max(1, navigation.currentSectionBeats.count))")
                    .font(.system(size: 11.5, weight: .semibold).monospacedDigit())
                    .padding(.horizontal, 9)
                    .padding(.vertical, 4)
                    .modifier(
                        AppleLiquidGlassSurfaceModifier(
                            cornerRadius: 99,
                            isCapsule: true,
                            variant: settings.glassVariant,
                            tintColor: nil,
                            interactive: false,
                            isDark: isDark,
                            liquidness: settings.liquidness,
                            isFullLiquid: isFullLiquid
                        )
                    )
                    .lineLimit(1)
            }

            Spacer()

            if let waypoint = navigation.pendingThankSpeakerWaypoint {
                Button {
                    navigation.jumpToThanksInCurrentSection()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "forward.end.fill")
                            .font(.system(size: 10))
                        Text("Thanks (\(waypoint.speakerName))")
                            .font(.system(size: 11.5, weight: .semibold))
                    }
                }
                .appleLiquidGlassButton(prominent: true, isDark: isDark, isFullLiquid: isFullLiquid)
                .help("Jump directly to THANKING subsection after speaker finishes")
            }

            Button {
                coordinator.panelController?.positionNearCamera()
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "scope")
                        .font(.system(size: 10.5, weight: .semibold))
                    Text("Near Camera")
                        .font(.system(size: 11, weight: .semibold))
                }
            }
            .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
            .help("Snap panel top-center below camera housing (⌃⌥H)")
        }
        .padding(.horizontal, 12)
        .frame(height: 44)
        .opacity(isHoveringBottomControls ? 1.0 : 0.92)
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

    private static func attributedBeatText(from markdown: String, isActive: Bool) -> AttributedString {
        let cleaned = markdown
            .replacingOccurrences(of: "==", with: "")
            .replacingOccurrences(of: "[PAUSE]", with: " ⏸ ")
            .replacingOccurrences(of: "[BEAT]", with: " ⏸ ")
        if let parsed = try? AttributedString(markdown: cleaned) {
            return parsed
        }
        return AttributedString(cleaned)
    }
}
