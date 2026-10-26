import Foundation
import ApplicationServices
import Carbon

public enum ArrowCaptureState: Equatable, Sendable {
    case inactive
    case active
    case suspendedForEditing
    case permissionDenied(String)
}

@MainActor
public final class GlobalArrowCapture: ObservableObject, @unchecked Sendable {
    @Published public private(set) var state: ArrowCaptureState = .inactive
    private var eventTap: CFMachPort? = nil
    private var runLoopSource: CFRunLoopSource? = nil
    private var userRequestedEnabled: Bool = false

    public var onBareArrow: ((GlobalChordAction) -> Void)?

    nonisolated(unsafe) private static weak var sharedInstance: GlobalArrowCapture?

    public init() {
        // Always default OFF on launch per specification
        Self.sharedInstance = self
    }

    public var isCapturing: Bool {
        state == .active
    }

    public func setEnabled(_ enabled: Bool) {
        userRequestedEnabled = enabled
        if enabled {
            startTap()
        } else {
            stopTap()
            state = .inactive
        }
    }

    public func suspendForEditor(_ isEditing: Bool) {
        guard userRequestedEnabled else { return }
        if isEditing {
            stopTap()
            state = .suspendedForEditing
        } else {
            startTap()
        }
    }

    public func emergencyDisable() {
        userRequestedEnabled = false
        stopTap()
        state = .inactive
    }

    private func startTap() {
        stopTap()

        let trusted = AXIsProcessTrusted()
        guard trusted else {
            state = .permissionDenied(
                "Accessibility / Input Monitoring permission is required to capture bare arrows globally. Safe Control+Option shortcuts remain active."
            )
            return
        }

        let mask = (1 << CGEventType.keyDown.rawValue)
        let callback: CGEventTapCallBack = { _, type, event, _ in
            if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
                DispatchQueue.main.async {
                    GlobalArrowCapture.sharedInstance?.reenableTapIfAppropriate()
                }
                return Unmanaged.passUnretained(event)
            }

            guard type == .keyDown else {
                return Unmanaged.passUnretained(event)
            }

            let flags = event.flags
            let disallowedFlags: CGEventFlags = [.maskCommand, .maskControl, .maskAlternate, .maskShift]
            if !flags.intersection(disallowedFlags).isEmpty {
                return Unmanaged.passUnretained(event)
            }

            let keyCode = Int(event.getIntegerValueField(.keyboardEventKeycode))
            let mappedAction: GlobalChordAction?
            switch keyCode {
            case kVK_RightArrow: mappedAction = .nextBeat
            case kVK_LeftArrow: mappedAction = .previousBeat
            case kVK_DownArrow: mappedAction = .nextSection
            case kVK_UpArrow: mappedAction = .previousSection
            default: mappedAction = nil
            }

            guard let action = mappedAction else {
                return Unmanaged.passUnretained(event)
            }

            DispatchQueue.main.async {
                GlobalArrowCapture.sharedInstance?.onBareArrow?(action)
            }
            return nil // Consume solely unmodified arrow key-down
        }

        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: CGEventMask(mask),
            callback: callback,
            userInfo: nil
        ) else {
            state = .permissionDenied(
                "macOS blocked CGEventTap creation. Grant Accessibility & Input Monitoring in System Settings > Privacy & Security, or use Control+Option shortcuts."
            )
            return
        }

        let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
        CGEvent.tapEnable(tap: tap, enable: true)

        self.eventTap = tap
        self.runLoopSource = source
        self.state = .active
    }

    private func reenableTapIfAppropriate() {
        guard userRequestedEnabled, state == .active, let tap = eventTap else { return }
        CGEvent.tapEnable(tap: tap, enable: true)
    }

    private func stopTap() {
        if let tap = eventTap {
            CGEvent.tapEnable(tap: tap, enable: false)
        }
        if let source = runLoopSource {
            CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes)
        }
        runLoopSource = nil
        eventTap = nil
    }
}
