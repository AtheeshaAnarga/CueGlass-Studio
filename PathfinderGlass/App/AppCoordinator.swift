import Foundation
import AppKit
import SwiftUI
import Combine

@MainActor
public final class AppCoordinator: ObservableObject {
    public let scriptStore: ScriptStore
    public var settings: SettingsStore
    public let parser: MarkdownScriptParser
    public var navigation: ScriptNavigationController
    public let hotkeys: HotkeyManager
    public let arrowCapture: GlobalArrowCapture

    @Published public var isSectionsPopoverOpen: Bool = false
    @Published public var isToolsPopoverOpen: Bool = false
    @Published public var isThemePopoverOpen: Bool = false
    @Published public var isPreflightSheetOpen: Bool = false
    @Published public var isCheatSheetOpen: Bool = false
    @Published public var editorDraftMarkdown: String
    @Published public var lastSaveError: String? = nil
    @Published public var recoveredBannerMessage: String? = nil

    public var panelController: PanelController?
    private var editorWindow: NSWindow?
    private var cancellables = Set<AnyCancellable>()

    public init(
        scriptStore: ScriptStore = ScriptStore(),
        settings: SettingsStore = SettingsStore(),
        parser: MarkdownScriptParser = MarkdownScriptParser()
    ) {
        self.scriptStore = scriptStore
        self.settings = settings
        self.parser = parser

        let loaded = scriptStore.loadOrInitializeWorkingCopy()
        let parsed = parser.parse(loaded.markdown)
        self.editorDraftMarkdown = loaded.markdown
        self.navigation = ScriptNavigationController(
            document: parsed,
            initialBeatID: settings.activeBeatID
        )
        self.hotkeys = HotkeyManager()
        self.arrowCapture = GlobalArrowCapture()

        if loaded.recoveredFromBackup {
            self.recoveredBannerMessage = "Recovered working script from LastKnownGood backup."
        }

        bindCallbacks()
    }

    private func bindCallbacks() {
        // Persist activeBeatID asynchronously outside of SwiftUI view update transactions
        navigation.$activeBeatID
            .dropFirst()
            .removeDuplicates()
            .sink { [weak self] newBeatID in
                DispatchQueue.main.async { [weak self] in
                    guard let self = self, self.settings.activeBeatID != newBeatID else { return }
                    self.settings.activeBeatID = newBeatID
                }
            }
            .store(in: &cancellables)

        // Synchronize AppKit NSPanel & Editor appearance asynchronously outside of SwiftUI view updates
        settings.$themeMode
            .dropFirst()
            .removeDuplicates()
            .sink { [weak self] newMode in
                DispatchQueue.main.async { [weak self] in
                    guard let self = self else { return }
                    self.panelController?.syncThemeAppearance(newMode)
                    self.editorWindow?.appearance = NSAppearance(named: newMode == .dark ? .darkAqua : .aqua)
                }
            }
            .store(in: &cancellables)

        settings.$glassTintPreset
            .combineLatest(settings.$glassTransparency, settings.$windowLayoutMode)
            .dropFirst()
            .sink { [weak self] _, _, _ in
                DispatchQueue.main.async { [weak self] in
                    self?.panelController?.syncGlassMaterialProperties()
                }
            }
            .store(in: &cancellables)

        hotkeys.onAction = { [weak self] action in
            self?.performGlobalAction(action)
        }

        arrowCapture.onBareArrow = { [weak self] action in
            self?.performGlobalAction(action)
        }
    }

    public func start() {
        guard panelController == nil else {
            panelController?.showPanel()
            return
        }
        hotkeys.registerAll()
        let controller = PanelController(coordinator: self)
        self.panelController = controller
        controller.showPanel()
    }

    public func teardown() {
        hotkeys.unregisterAll()
        arrowCapture.emergencyDisable()
    }

    public func performGlobalAction(_ action: GlobalChordAction) {
        switch action {
        case .nextBeat:
            navigation.nextBeat()
        case .previousBeat:
            navigation.previousBeat()
        case .nextSection:
            navigation.nextMainSection()
        case .previousSection:
            navigation.previousMainSection()
        case .toggleCollapse:
            toggleCollapse()
        case .nearCamera:
            panelController?.positionNearCamera()
        }
    }

    public func toggleCollapse() {
        let nextState = !settings.isCollapsedToBubble
        settings.isCollapsedToBubble = nextState
        DispatchQueue.main.async { [weak self] in
            self?.panelController?.syncCollapseState(isBubble: nextState)
        }
    }

    public func closeTransientPopovers() {
        isSectionsPopoverOpen = false
        isToolsPopoverOpen = false
        isThemePopoverOpen = false
        isPreflightSheetOpen = false
        isCheatSheetOpen = false
    }

    public func applyEditedMarkdown(_ newMarkdown: String, label: String = "Manual Save") {
        editorDraftMarkdown = newMarkdown
        let parsed = parser.parse(newMarkdown)
        navigation.updateDocument(parsed)
        do {
            _ = try scriptStore.saveWorkingCopy(newMarkdown, label: label)
            lastSaveError = nil
        } catch {
            lastSaveError = error.localizedDescription
        }
    }

    public func restoreBundledOriginalScript() {
        do {
            let original = try scriptStore.restoreBundledOriginal()
            editorDraftMarkdown = original
            let parsed = parser.parse(original)
            navigation.updateDocument(parsed)
            lastSaveError = nil
        } catch {
            lastSaveError = error.localizedDescription
        }
    }

    public func openEditorWindow() {
        arrowCapture.suspendForEditor(true)
        if let existing = editorWindow {
            existing.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }

        let editorView = ScriptEditorView(coordinator: self)
        let hostingController = NSHostingController(rootView: editorView)
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 960, height: 660),
            styleMask: [.titled, .closable, .resizable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.tabbingMode = .disallowed
        window.title = "Pathfinder Glass — Script Editor & Versions"
        window.appearance = NSAppearance(named: settings.themeMode == .dark ? .darkAqua : .aqua)
        window.contentViewController = hostingController
        window.center()
        window.isReleasedWhenClosed = false

        NotificationCenter.default.addObserver(
            forName: NSWindow.willCloseNotification,
            object: window,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                guard let self = self else { return }
                self.applyEditedMarkdown(self.editorDraftMarkdown, label: "Editor Close Save")
                self.arrowCapture.suspendForEditor(false)
            }
        }

        self.editorWindow = window
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}

public struct RootOverlayContainerView: View {
    @ObservedObject public var coordinator: AppCoordinator
    @ObservedObject private var settings: SettingsStore

    public init(coordinator: AppCoordinator) {
        self.coordinator = coordinator
        self.settings = coordinator.settings
    }

    public var body: some View {
        Group {
            if settings.isCollapsedToBubble {
                CollapsedBubbleView(coordinator: coordinator)
            } else {
                ReadingPanelView(coordinator: coordinator)
            }
        }
    }
}
