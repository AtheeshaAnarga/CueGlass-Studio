import AppKit

public final class FloatingScriptPanel: NSPanel {
    public var onKeyNavigation: ((NSEvent) -> Bool)?

    public init(contentRect: NSRect) {
        super.init(
            contentRect: contentRect,
            styleMask: [.borderless, .nonactivatingPanel, .resizable],
            backing: .buffered,
            defer: false
        )

        self.tabbingMode = .disallowed
        self.isFloatingPanel = true
        self.level = .floating
        self.becomesKeyOnlyIfNeeded = true
        self.hidesOnDeactivate = false
        self.isOpaque = false
        self.backgroundColor = .clear
        self.hasShadow = true
        self.titleVisibility = .hidden
        self.titlebarAppearsTransparent = true
        self.isMovableByWindowBackground = true
        self.appearance = NSAppearance(named: .aqua)

        // Compatible collectionBehavior flags for floating over full-screen Zoom and Spaces
        self.collectionBehavior = [
            .canJoinAllSpaces,
            .fullScreenAuxiliary,
            .ignoresCycle
        ]
    }

    public override var canBecomeKey: Bool {
        true
    }

    public override var canBecomeMain: Bool {
        false
    }

    public override func keyDown(with event: NSEvent) {
        if let handler = onKeyNavigation, handler(event) {
            return
        }
        super.keyDown(with: event)
    }
}
