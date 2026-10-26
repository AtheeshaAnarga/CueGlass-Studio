import SwiftUI

public struct QuickReferenceView: View {
    @ObservedObject public var coordinator: AppCoordinator
    @ObservedObject private var navigation: ScriptNavigationController
    @ObservedObject private var settings: SettingsStore
    @State private var selectedTab: Int = 0
    @State private var filterText: String = ""

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
        VStack(alignment: .leading, spacing: 10) {
            // Custom Tahoe Liquid Glass Pill Tab Selector (replaces stock Picker(.segmented))
            HStack(spacing: 6) {
                Button {
                    selectedTab = 0
                } label: {
                    Text("10 Backup Lines")
                        .font(.system(size: 11, weight: .semibold))
                        .frame(maxWidth: .infinity)
                }
                .appleLiquidGlassButton(prominent: selectedTab == 0, isDark: isDark, isFullLiquid: isFullLiquid)

                Button {
                    selectedTab = 1
                } label: {
                    Text("11 Questions")
                        .font(.system(size: 11, weight: .semibold))
                        .frame(maxWidth: .infinity)
                }
                .appleLiquidGlassButton(prominent: selectedTab == 1, isDark: isDark, isFullLiquid: isFullLiquid)

                Button {
                    selectedTab = 2
                } label: {
                    Text("12 Checklist")
                        .font(.system(size: 11, weight: .semibold))
                        .frame(maxWidth: .infinity)
                }
                .appleLiquidGlassButton(prominent: selectedTab == 2, isDark: isDark, isFullLiquid: isFullLiquid)
            }

            if selectedTab != 2 {
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 11.5))
                        .foregroundColor(.secondary)
                    TextField("Filter lines…", text: $filterText)
                        .textFieldStyle(.plain)
                        .font(.system(size: 12))
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .modifier(
                    AppleLiquidGlassSurfaceModifier(
                        cornerRadius: 99,
                        isCapsule: true,
                        variant: settings.glassVariant,
                        tintColor: nil,
                        interactive: true,
                        isDark: isDark,
                        liquidness: settings.liquidness,
                        isFullLiquid: isFullLiquid
                    )
                )
            }

            ScrollView {
                switch selectedTab {
                case 0:
                    backupLinesList
                case 1:
                    moderatorQuestionsList
                default:
                    organizerChecklistView
                }
            }
            .frame(maxHeight: 330)

            if navigation.activeOnDemandSnippet != nil {
                Button {
                    navigation.returnToLivePosition()
                    coordinator.isToolsPopoverOpen = false
                } label: {
                    Label("Back to Last Live Beat", systemImage: "arrow.uturn.backward")
                        .font(.system(size: 12, weight: .semibold))
                        .frame(maxWidth: .infinity)
                }
                .appleLiquidGlassButton(prominent: true, isDark: isDark, isFullLiquid: isFullLiquid)
            }
        }
        .padding(14)
        .frame(width: 370)
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

    private var backupLinesList: some View {
        let items = navigation.document.backupLines.filter {
            filterText.isEmpty ||
            $0.title.localizedCaseInsensitiveContains(filterText) ||
            $0.spokenLines.joined(separator: " ").localizedCaseInsensitiveContains(filterText)
        }
        return VStack(alignment: .leading, spacing: 8) {
            ForEach(items) { snippet in
                Button {
                    navigation.invokeOnDemandSnippet(snippet)
                    coordinator.isToolsPopoverOpen = false
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(snippet.title)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(
                                isDark
                                    ? Color(red: 0.38, green: 0.72, blue: 0.98)
                                    : Color(red: 0.137, green: 0.388, blue: 0.851)
                            )
                        if let first = snippet.spokenLines.first {
                            Text(first)
                                .font(.system(size: 12))
                                .lineLimit(2)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
            }
        }
    }

    private var moderatorQuestionsList: some View {
        let items = navigation.document.moderatorQuestions.filter {
            filterText.isEmpty ||
            $0.title.localizedCaseInsensitiveContains(filterText) ||
            $0.spokenLines.joined(separator: " ").localizedCaseInsensitiveContains(filterText)
        }
        return VStack(alignment: .leading, spacing: 8) {
            ForEach(items) { snippet in
                Button {
                    navigation.invokeOnDemandSnippet(snippet)
                    coordinator.isToolsPopoverOpen = false
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(snippet.title)
                            .font(.system(size: 11.5, weight: .bold))
                            .foregroundColor(.secondary)
                        ForEach(snippet.spokenLines, id: \.self) { line in
                            Text(line)
                                .font(.system(size: 12.5))
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
            }
        }
    }

    private var organizerChecklistView: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(navigation.document.checklistBlocks) { item in
                let isDone = settings.checklistCompletion[item.id] ?? item.isCheckedByDefault
                Button {
                    settings.toggleChecklist(id: item.id)
                } label: {
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: isDone ? "checkmark.circle.fill" : "circle")
                            .foregroundColor(isDone ? .blue : .secondary)
                        Text(item.displayText)
                            .font(.system(size: 12))
                            .strikethrough(isDone)
                            .multilineTextAlignment(.leading)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .appleLiquidGlassButton(prominent: false, isDark: isDark, isFullLiquid: isFullLiquid)
            }
        }
    }
}
