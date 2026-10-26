import AppKit
import SwiftUI
import QuartzCore
import Carbon

@MainActor
public final class PanelController: NSObject, NSWindowDelegate {
    public private(set) var panel: FloatingScriptPanel!
    /// Holds either macOS 26 Tahoe's official `NSGlassEffectView` or fallback `NSVisualEffectView`.
    public private(set) var rootGlassHostView: NSView!
    private let coordinator: AppCoordinator
    private var screenObserver: NSObjectProtocol?

    public init(coordinator: AppCoordinator) {
        self.coordinator = coordinator
        super.init()
        setupPanel()
        observeScreenChanges()
    }

    private func setupPanel() {
        let isBubble = coordinator.settings.isCollapsedToBubble
        let initialFrame = computeTargetFrame(isBubble: isBubble)
        let panel = FloatingScriptPanel(contentRect: initialFrame)
        panel.delegate = self
        panel.minSize = WindowGeometryCalculator.minExpandedSize
        panel.maxSize = WindowGeometryCalculator.maxExpandedSize

        panel.onKeyNavigation = { [weak self] event in
            guard let self = self else { return false }
            return self.handleLocalKeyDown(event)
        }

        let rootView = RootOverlayContainerView(coordinator: coordinator)
        let hostingView = NSHostingView(rootView: rootView)
        hostingView.frame = NSRect(origin: .zero, size: initialFrame.size)
        hostingView.autoresizingMask = [.width, .height]
        hostingView.wantsLayer = true
        hostingView.layer?.backgroundColor = NSColor.clear.cgColor

        let cornerRadius: CGFloat = isBubble ? 23.0 : 22.0
        let hostContainer = Self.makeOfficialTahoeGlassRootView(
            frame: NSRect(origin: .zero, size: initialFrame.size),
            hostingView: hostingView,
            cornerRadius: cornerRadius,
            settings: coordinator.settings
        )

        panel.contentView = hostContainer
        self.rootGlassHostView = hostContainer
        self.panel = panel

        syncThemeAppearance(coordinator.settings.themeMode)
    }

    /// Creates a consistent behind-window optical blur host view so the custom SwiftUI
    /// Tahoe Liquid Glass gradients, specular borders, and card surfaces match the AI Studio design identically.
    private static func makeOfficialTahoeGlassRootView(
        frame: NSRect,
        hostingView: NSView,
        cornerRadius: CGFloat,
        settings: SettingsStore
    ) -> NSView {
        let isDark = (settings.themeMode == .dark)
        let effectView = NSVisualEffectView(frame: frame)
        effectView.blendingMode = .behindWindow
        effectView.state = .active
        effectView.material = isDark ? .hudWindow : .popover
        effectView.wantsLayer = true
        effectView.layer?.cornerRadius = cornerRadius
        effectView.layer?.cornerCurve = .continuous
        effectView.layer?.masksToBounds = true
        effectView.autoresizingMask = [.width, .height]
        effectView.addSubview(hostingView)
        return effectView
    }

    public func syncThemeAppearance(_ mode: AppThemeMode) {
        let targetAppearance = NSAppearance(named: mode == .dark ? .darkAqua : .aqua)
        if panel?.appearance != targetAppearance {
            panel?.appearance = targetAppearance
        }
        syncGlassMaterialProperties()
    }

    public func syncGlassMaterialProperties() {
        guard let rootGlassHostView = rootGlassHostView else { return }
        let isBubble = coordinator.settings.isCollapsedToBubble
        let cornerRadius: CGFloat = isBubble ? 23.0 : 24.0
        let isDark = (coordinator.settings.themeMode == .dark)

        if let effectView = rootGlassHostView as? NSVisualEffectView {
            let targetMaterial: NSVisualEffectView.Material = isDark ? .hudWindow : .popover
            if effectView.material != targetMaterial {
                effectView.material = targetMaterial
            }
            effectView.layer?.cornerRadius = cornerRadius
        }
    }

    public func showPanel() {
        panel.orderFrontRegardless()
    }

    public func hidePanel() {
        panel.orderOut(nil)
    }

    public var isVisible: Bool {
        panel.isVisible
    }

    public func positionNearCamera() {
        let visible = currentUsableScreenFrame()
        let isBubble = coordinator.settings.isCollapsedToBubble
        let target: CGRect
        if isBubble {
            target = WindowGeometryCalculator.nearCameraBubbleFrame(in: visible)
            coordinator.settings.saveBubbleOrigin(target.origin)
        } else {
            let currentSize = panel.frame.size
            target = WindowGeometryCalculator.nearCameraFrame(in: visible, panelSize: currentSize)
            coordinator.settings.saveExpandedFrame(target)
        }
        NSAnimationContext.runAnimationGroup { context in
            context.duration = NSWorkspace.shared.accessibilityDisplayShouldReduceMotion ? 0.0 : 0.22
            context.timingFunction = CAMediaTimingFunction(name: .easeOut)
            panel.animator().setFrame(target, display: true)
        }
        panel.orderFrontRegardless()
    }

    public func syncCollapseState(isBubble: Bool) {
        let visible = currentUsableScreenFrame()
        syncGlassMaterialProperties()
        if isBubble {
            coordinator.settings.saveExpandedFrame(panel.frame)
            panel.styleMask.remove(.resizable)
            let savedOrigin = coordinator.settings.loadBubbleOrigin()
            let rawBubble = CGRect(
                origin: savedOrigin ?? CGPoint(
                    x: panel.frame.midX - WindowGeometryCalculator.collapsedBubbleSize.width / 2,
                    y: panel.frame.maxY - WindowGeometryCalculator.collapsedBubbleSize.height
                ),
                size: WindowGeometryCalculator.collapsedBubbleSize
            )
            let clamped = WindowGeometryCalculator.clampFrame(rawBubble, to: visible, isBubble: true)
            animatePanelFrame(to: clamped)
        } else {
            coordinator.settings.saveBubbleOrigin(panel.frame.origin)
            panel.styleMask.insert(.resizable)
            panel.minSize = WindowGeometryCalculator.minExpandedSize
            panel.maxSize = WindowGeometryCalculator.maxExpandedSize
            let savedFrame = coordinator.settings.loadExpandedFrame() ?? WindowGeometryCalculator.nearCameraFrame(in: visible)
            let clamped = WindowGeometryCalculator.clampFrame(savedFrame, to: visible, isBubble: false)
            animatePanelFrame(to: clamped)
        }
    }

    private func animatePanelFrame(to target: CGRect) {
        NSAnimationContext.runAnimationGroup { context in
            context.duration = NSWorkspace.shared.accessibilityDisplayShouldReduceMotion ? 0.0 : 0.20
            context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
            panel.animator().setFrame(target, display: true)
        }
    }

    private func computeTargetFrame(isBubble: Bool) -> CGRect {
        let visible = currentUsableScreenFrame()
        if isBubble {
            if let origin = coordinator.settings.loadBubbleOrigin() {
                return WindowGeometryCalculator.clampFrame(
                    CGRect(origin: origin, size: WindowGeometryCalculator.collapsedBubbleSize),
                    to: visible,
                    isBubble: true
                )
            }
            return WindowGeometryCalculator.nearCameraBubbleFrame(in: visible)
        } else {
            if let saved = coordinator.settings.loadExpandedFrame() {
                return WindowGeometryCalculator.clampFrame(saved, to: visible, isBubble: false)
            }
            return WindowGeometryCalculator.nearCameraFrame(in: visible)
        }
    }

    public func currentUsableScreenFrame() -> CGRect {
        let screen = panel?.screen ?? NSScreen.main ?? NSScreen.screens.first
        guard let screen = screen else {
            return CGRect(x: 0, y: 0, width: 1440, height: 900)
        }
        return screen.visibleFrame
    }

    public func windowDidMove(_ notification: Notification) {
        guard let panel = panel else { return }
        if coordinator.settings.isCollapsedToBubble {
            coordinator.settings.saveBubbleOrigin(panel.frame.origin)
        } else {
            coordinator.settings.saveExpandedFrame(panel.frame)
        }
    }

    public func windowDidResize(_ notification: Notification) {
        guard let panel = panel, !coordinator.settings.isCollapsedToBubble else { return }
        coordinator.settings.saveExpandedFrame(panel.frame)
    }

    private func observeScreenChanges() {
        screenObserver = NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.reclampToVisibleScreen()
            }
        }
    }

    public func reclampToVisibleScreen() {
        let visible = currentUsableScreenFrame()
        let isBubble = coordinator.settings.isCollapsedToBubble
        let clamped = WindowGeometryCalculator.clampFrame(panel.frame, to: visible, isBubble: isBubble)
        panel.setFrame(clamped, display: true)
    }

    private func handleLocalKeyDown(_ event: NSEvent) -> Bool {
        let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
        if flags.contains([.command, .shift]), event.charactersIgnoringModifiers?.lowercased() == "t" {
            coordinator.settings.toggleTheme()
            return true
        }
        if flags.contains(.command) {
            if event.charactersIgnoringModifiers == "+" || event.charactersIgnoringModifiers == "=" {
                coordinator.settings.adjustFontSize(by: 2)
                return true
            }
            if event.charactersIgnoringModifiers == "-" {
                coordinator.settings.adjustFontSize(by: -2)
                return true
            }
            if event.charactersIgnoringModifiers?.lowercased() == "e" {
                coordinator.openEditorWindow()
                return true
            }
        }

        switch Int(event.keyCode) {
        case kVK_RightArrow:
            coordinator.navigation.nextBeat()
            return true
        case kVK_LeftArrow:
            coordinator.navigation.previousBeat()
            return true
        case kVK_DownArrow:
            coordinator.navigation.nextMainSection()
            return true
        case kVK_UpArrow:
            coordinator.navigation.previousMainSection()
            return true
        case kVK_Space:
            if flags.contains(.shift) {
                coordinator.navigation.previousBeat()
            } else {
                coordinator.navigation.nextBeat()
            }
            return true
        case kVK_Escape:
            coordinator.closeTransientPopovers()
            return true
        default:
            return false
        }
    }
}
