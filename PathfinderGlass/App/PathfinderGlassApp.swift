import AppKit
import SwiftUI

@MainActor
public final class PathfinderAppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    public let coordinator = AppCoordinator()
    private var statusItem: NSStatusItem?

    public func applicationDidFinishLaunching(_ notification: Notification) {
        NSWindow.allowsAutomaticWindowTabbing = false
        NSApp.setActivationPolicy(.accessory)
        setupStatusBarItem()
        coordinator.start()
    }

    public func applicationWillTerminate(_ notification: Notification) {
        coordinator.teardown()
    }

    private func setupStatusBarItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = item.button {
            let symbol = NSImage(systemSymbolName: "sparkles.rectangle.stack.fill", accessibilityDescription: "CueGlass Studio")
                ?? NSImage(systemSymbolName: "text.alignleft", accessibilityDescription: "CueGlass Studio")
            symbol?.isTemplate = true
            button.image = symbol
            button.toolTip = "CueGlass Studio — Apple Tahoe Liquid Glass Script Overlay"
        }

        let menu = NSMenu(title: "Pathfinder Glass")
        menu.delegate = self
        item.menu = menu
        self.statusItem = item
        rebuildStatusMenu(menu)
    }

    public func menuNeedsUpdate(_ menu: NSMenu) {
        rebuildStatusMenu(menu)
    }

    private func rebuildStatusMenu(_ menu: NSMenu) {
        menu.removeAllItems()

        let isVisible = coordinator.panelController?.isVisible ?? false
        let showHideItem = NSMenuItem(
            title: isVisible ? "Hide Script Overlay" : "Show Script Overlay",
            action: #selector(toggleVisibilityAction),
            keyEquivalent: ""
        )
        showHideItem.target = self
        menu.addItem(showHideItem)

        let collapseItem = NSMenuItem(
            title: coordinator.settings.isCollapsedToBubble ? "Expand Reading Panel (⌃⌥P)" : "Collapse to Glass Dot (⌃⌥P)",
            action: #selector(toggleCollapseAction),
            keyEquivalent: ""
        )
        collapseItem.target = self
        menu.addItem(collapseItem)

        let cameraItem = NSMenuItem(
            title: "Position Near Camera (⌃⌥H)",
            action: #selector(nearCameraAction),
            keyEquivalent: ""
        )
        cameraItem.target = self
        menu.addItem(cameraItem)

        menu.addItem(.separator())

        let isDark = (coordinator.settings.themeMode == .dark)
        let themeItem = NSMenuItem(
            title: isDark ? "Switch to Light Liquid Glass Theme (⌘⇧T)" : "Switch to Dark Liquid Glass Theme (⌘⇧T)",
            action: #selector(toggleThemeAction),
            keyEquivalent: "T"
        )
        themeItem.keyEquivalentModifierMask = [.command, .shift]
        themeItem.target = self
        menu.addItem(themeItem)

        menu.addItem(.separator())

        let arrowItem = NSMenuItem(
            title: "Capture Bare Arrows Globally",
            action: #selector(toggleBareArrowAction),
            keyEquivalent: ""
        )
        arrowItem.state = coordinator.arrowCapture.isCapturing ? .on : .off
        arrowItem.target = self
        menu.addItem(arrowItem)

        menu.addItem(.separator())

        let preflightItem = NSMenuItem(
            title: "Preflight Readiness Check…",
            action: #selector(openPreflightAction),
            keyEquivalent: ""
        )
        preflightItem.target = self
        menu.addItem(preflightItem)

        let editorItem = NSMenuItem(
            title: "Open Script Editor…",
            action: #selector(openEditorAction),
            keyEquivalent: "e"
        )
        editorItem.keyEquivalentModifierMask = [.command]
        editorItem.target = self
        menu.addItem(editorItem)

        let settingsItem = NSMenuItem(
            title: "Keyboard Shortcuts & Settings…",
            action: #selector(openSettingsAction),
            keyEquivalent: ","
        )
        settingsItem.keyEquivalentModifierMask = [.command]
        settingsItem.target = self
        menu.addItem(settingsItem)

        menu.addItem(.separator())

        let quitItem = NSMenuItem(
            title: "Quit Pathfinder Glass",
            action: #selector(quitAction),
            keyEquivalent: "q"
        )
        quitItem.keyEquivalentModifierMask = [.command]
        quitItem.target = self
        menu.addItem(quitItem)
    }

    @objc private func toggleVisibilityAction() {
        if coordinator.panelController?.isVisible == true {
            coordinator.panelController?.hidePanel()
        } else {
            coordinator.start()
        }
    }

    @objc private func toggleCollapseAction() {
        coordinator.toggleCollapse()
    }

    @objc private func nearCameraAction() {
        coordinator.panelController?.positionNearCamera()
    }

    @objc private func toggleThemeAction() {
        coordinator.settings.toggleTheme()
    }

    @objc private func toggleBareArrowAction() {
        coordinator.arrowCapture.setEnabled(!coordinator.arrowCapture.isCapturing)
    }

    @objc private func openPreflightAction() {
        if coordinator.settings.isCollapsedToBubble {
            coordinator.toggleCollapse()
        }
        coordinator.openPreflightWindow()
        coordinator.panelController?.showPanel()
    }

    @objc private func openEditorAction() {
        coordinator.openEditorWindow()
    }

    @objc private func openSettingsAction() {
        if coordinator.settings.isCollapsedToBubble {
            coordinator.toggleCollapse()
        }
        coordinator.openSettingsWindow()
        coordinator.panelController?.showPanel()
    }

    @objc private func quitAction() {
        coordinator.teardown()
        NSApplication.shared.terminate(nil)
    }
}

@main
public enum PathfinderGlassApp {
    @MainActor
    public static func main() {
        let app = NSApplication.shared
        let delegate = PathfinderAppDelegate()
        app.delegate = delegate
        app.run()
    }
}
