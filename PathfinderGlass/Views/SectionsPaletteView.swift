import SwiftUI

public struct SectionsPaletteView: View {
    @ObservedObject public var coordinator: AppCoordinator
    @ObservedObject private var navigation: ScriptNavigationController
    @State private var searchQuery: String = ""

    public init(coordinator: AppCoordinator) {
        self.coordinator = coordinator
        self.navigation = coordinator.navigation
    }

    private var isDark: Bool {
        coordinator.settings.themeMode == .dark
    }

    private var isFullLiquid: Bool {
        coordinator.settings.windowLayoutMode == .fullLiquidGlass
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 11.5))
                    .foregroundColor(.secondary)
                TextField("Find section or spoken line…", text: $searchQuery)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12))
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .modifier(
                AppleLiquidGlassSurfaceModifier(
                    cornerRadius: 99,
                    isCapsule: true,
                    variant: coordinator.settings.glassVariant,
                    tintColor: nil,
                    interactive: true,
                    isDark: isDark,
                    liquidness: coordinator.settings.liquidness,
                    isFullLiquid: isFullLiquid
                )
            )

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if searchQuery.trimmingCharacters(in: .whitespaces).isEmpty {
                        liveFlowSectionList
                        Divider()
                        onDemandSectionList
                    } else {
                        filteredSearchResults
                    }
                }
            }
            .frame(maxHeight: 330)
        }
        .padding(14)
        .frame(width: 335)
        .modifier(
            LiquidGlassBackgroundModifier(
                cornerRadius: 18,
                themeMode: coordinator.settings.themeMode,
                layoutMode: coordinator.settings.windowLayoutMode,
                variant: .regular,
                tintPreset: coordinator.settings.glassTintPreset,
                liquidness: coordinator.settings.liquidness,
                transparency: 20,
                glassEffectLevel: 95
            )
        )
    }

    private var liveFlowSectionList: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("LIVE FLOW (00–09)")
                .font(.system(size: 10, weight: .bold))
                .tracking(0.5)
                .foregroundColor(.secondary)

            ForEach(navigation.document.liveFlowSections) { section in
                let isSelected = (navigation.activeSection?.id == section.id)
                VStack(alignment: .leading, spacing: 4) {
                    Button {
                        navigation.jumpToSection(section.id)
                        coordinator.isSectionsPopoverOpen = false
                    } label: {
                        HStack {
                            Text(section.numberBadge)
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                            Text(section.shortTitle)
                                .font(.system(size: 12, weight: .medium))
                            Spacer()
                            Text("\(section.navigableBeats.count)")
                                .font(.system(size: 11, design: .monospaced))
                                .opacity(0.75)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .appleLiquidGlassButton(prominent: isSelected, isDark: isDark, isFullLiquid: isFullLiquid)

                    if let introID = section.introduceWaypointBlockID,
                       let thankID = section.thankSpeakerWaypointBlockID {
                        HStack(spacing: 8) {
                            Button("Introduce") {
                                navigation.selectBeat(introID)
                                coordinator.isSectionsPopoverOpen = false
                            }
                            .font(.system(size: 10.5, weight: .semibold))
                            .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)

                            Button("Thank speaker") {
                                navigation.selectBeat(thankID)
                                coordinator.isSectionsPopoverOpen = false
                            }
                            .font(.system(size: 10.5, weight: .semibold))
                            .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
                        }
                        .padding(.leading, 18)
                    }
                }
            }
        }
    }

    private var onDemandSectionList: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("ON-DEMAND (10–12)")
                .font(.system(size: 10, weight: .bold))
                .tracking(0.5)
                .foregroundColor(.secondary)

            ForEach(navigation.document.onDemandSections) { section in
                Button {
                    coordinator.isSectionsPopoverOpen = false
                    coordinator.isToolsPopoverOpen = true
                } label: {
                    HStack {
                        Text(section.numberBadge)
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                        Text(section.shortTitle)
                            .font(.system(size: 12, weight: .medium))
                        Spacer()
                        Image(systemName: "arrow.up.right.square")
                            .font(.system(size: 11))
                    }
                    .frame(maxWidth: .infinity)
                }
                .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
            }
        }
    }

    private var filteredSearchResults: some View {
        let query = searchQuery.lowercased()
        let matches = navigation.document.liveFlowBeats.filter {
            $0.displayText.lowercased().contains(query)
        }
        return VStack(alignment: .leading, spacing: 6) {
            Text("\(matches.count) Matching Beats")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.secondary)

            ForEach(matches) { block in
                Button {
                    navigation.selectBeat(block.id)
                    coordinator.isSectionsPopoverOpen = false
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(block.displayText)
                            .font(.system(size: 12))
                            .lineLimit(2)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
            }
        }
    }
}
