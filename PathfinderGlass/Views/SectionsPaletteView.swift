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

    public var body: some View {
        AppleLiquidGlassContainer(spacing: 8) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField("Find section or spoken line…", text: $searchQuery)
                        .textFieldStyle(.plain)
                }
                .padding(8)
                .modifier(
                    AppleLiquidGlassSurfaceModifier(
                        cornerRadius: 99,
                        isCapsule: true,
                        variant: coordinator.settings.glassVariant,
                        tintColor: nil,
                        interactive: true,
                        isDark: isDark,
                        liquidness: coordinator.settings.liquidness
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
                .frame(maxHeight: 340)
            }
            .padding(12)
            .frame(width: 330)
        }
    }

    private var liveFlowSectionList: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("LIVE FLOW (00–09)")
                .font(.system(size: 10.5, weight: .bold))
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
                                .font(.system(size: 11, weight: .bold).monospacedDigit())
                            Text(section.shortTitle)
                                .font(.system(size: 12.5, weight: .medium))
                            Spacer()
                            Text("\(section.navigableBeats.count)")
                                .font(.system(size: 11).monospacedDigit())
                                .opacity(0.75)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .appleLiquidGlassButton(prominent: isSelected, isDark: isDark)

                    if let introID = section.introduceWaypointBlockID,
                       let thankID = section.thankSpeakerWaypointBlockID {
                        HStack(spacing: 8) {
                            Button("Introduce") {
                                navigation.selectBeat(introID)
                                coordinator.isSectionsPopoverOpen = false
                            }
                            .font(.system(size: 10.5, weight: .semibold))
                            .appleLiquidGlassButton(prominent: false, isDark: isDark)

                            Button("Thank speaker") {
                                navigation.selectBeat(thankID)
                                coordinator.isSectionsPopoverOpen = false
                            }
                            .font(.system(size: 10.5, weight: .semibold))
                            .appleLiquidGlassButton(prominent: false, isDark: isDark)
                        }
                        .padding(.leading, 20)
                    }
                }
            }
        }
    }

    private var onDemandSectionList: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("ON-DEMAND (10–12)")
                .font(.system(size: 10.5, weight: .bold))
                .foregroundColor(.secondary)

            ForEach(navigation.document.onDemandSections) { section in
                Button {
                    coordinator.isSectionsPopoverOpen = false
                    coordinator.isToolsPopoverOpen = true
                } label: {
                    HStack {
                        Text(section.numberBadge)
                            .font(.system(size: 11, weight: .bold).monospacedDigit())
                        Text(section.shortTitle)
                            .font(.system(size: 12.5, weight: .medium))
                        Spacer()
                        Image(systemName: "arrow.up.right.square")
                            .font(.system(size: 11))
                    }
                    .frame(maxWidth: .infinity)
                }
                .appleLiquidGlassButton(prominent: false, isDark: isDark)
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
                .font(.system(size: 10.5, weight: .bold))
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
                .appleLiquidGlassButton(prominent: false, isDark: isDark)
            }
        }
    }
}
