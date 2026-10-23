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

    public var body: some View {
        AppleLiquidGlassContainer(spacing: 8) {
            VStack(alignment: .leading, spacing: 10) {
                Picker("Reference Tool", selection: $selectedTab) {
                    Text("10 Backup Lines").tag(0)
                    Text("11 Questions").tag(1)
                    Text("12 Checklist").tag(2)
                }
                .pickerStyle(.segmented)

                if selectedTab != 2 {
                    TextField("Filter lines…", text: $filterText)
                        .textFieldStyle(.plain)
                        .padding(8)
                        .modifier(
                            AppleLiquidGlassSurfaceModifier(
                                cornerRadius: 99,
                                isCapsule: true,
                                variant: settings.glassVariant,
                                tintColor: nil,
                                interactive: true,
                                isDark: isDark,
                                liquidness: settings.liquidness
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
                .frame(maxHeight: 340)

                if navigation.activeOnDemandSnippet != nil {
                    Button {
                        navigation.returnToLivePosition()
                        coordinator.isToolsPopoverOpen = false
                    } label: {
                        Label("Back to Last Live Beat", systemImage: "arrow.uturn.backward")
                            .font(.system(size: 12, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .appleLiquidGlassButton(prominent: true, isDark: isDark)
                }
            }
            .padding(12)
            .frame(width: 380)
        }
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
                            .foregroundColor(Color(red: 0.14, green: 0.39, blue: 0.85))
                        if let first = snippet.spokenLines.first {
                            Text(first)
                                .font(.system(size: 12))
                                .lineLimit(2)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .appleLiquidGlassButton(prominent: false, isDark: isDark)
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
                .appleLiquidGlassButton(prominent: false, isDark: isDark)
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
                .appleLiquidGlassButton(prominent: false, isDark: isDark)
            }
        }
    }
}
