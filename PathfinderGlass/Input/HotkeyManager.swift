import Foundation
import Carbon

public enum GlobalChordAction: UInt32, CaseIterable, Sendable {
    case nextBeat = 1
    case previousBeat = 2
    case nextSection = 3
    case previousSection = 4
    case toggleCollapse = 5
    case nearCamera = 6

    public var displayName: String {
        switch self {
        case .nextBeat: return "Next Beat"
        case .previousBeat: return "Previous Beat"
        case .nextSection: return "Next Main Section"
        case .previousSection: return "Previous Main Section"
        case .toggleCollapse: return "Expand / Collapse Panel"
        case .nearCamera: return "Position Near Camera"
        }
    }

    public var shortcutLabel: String {
        switch self {
        case .nextBeat: return "⌃⌥→"
        case .previousBeat: return "⌃⌥←"
        case .nextSection: return "⌃⌥↓"
        case .previousSection: return "⌃⌥↑"
        case .toggleCollapse: return "⌃⌥P"
        case .nearCamera: return "⌃⌥H"
        }
    }

    public var carbonKeyCode: UInt32 {
        switch self {
        case .nextBeat: return UInt32(kVK_RightArrow)
        case .previousBeat: return UInt32(kVK_LeftArrow)
        case .nextSection: return UInt32(kVK_DownArrow)
        case .previousSection: return UInt32(kVK_UpArrow)
        case .toggleCollapse: return UInt32(kVK_ANSI_P)
        case .nearCamera: return UInt32(kVK_ANSI_H)
        }
    }
}

public struct HotkeyRegistrationStatus: Identifiable, Sendable, Equatable {
    public var id: UInt32 { action.rawValue }
    public let action: GlobalChordAction
    public let isRegistered: Bool
    public let errorMessage: String?
}

@MainActor
public final class HotkeyManager: ObservableObject, @unchecked Sendable {
    @Published public private(set) var statuses: [HotkeyRegistrationStatus] = []
    private var hotKeyRefs: [EventHotKeyRef?] = []
    private var eventHandlerRef: EventHandlerRef? = nil
    public var onAction: ((GlobalChordAction) -> Void)?

    nonisolated(unsafe) private static weak var sharedInstance: HotkeyManager?

    public init() {
        Self.sharedInstance = self
    }

    public func registerAll() {
        unregisterAll()
        var eventSpec = EventTypeSpec(
            eventClass: OSType(kEventClassKeyboard),
            eventKind: UInt32(kEventHotKeyPressed)
        )

        let callback: EventHandlerUPP = { _, eventRef, _ -> OSStatus in
            guard let eventRef = eventRef else { return OSStatus(eventNotHandledErr) }
            var hotKeyID = EventHotKeyID()
            let status = GetEventParameter(
                eventRef,
                EventParamName(kEventParamDirectObject),
                EventParamType(typeEventHotKeyID),
                nil,
                MemoryLayout<EventHotKeyID>.size,
                nil,
                &hotKeyID
            )
            guard status == noErr,
                  hotKeyID.signature == OSType(0x50464736), // 'PFG6'
                  let action = GlobalChordAction(rawValue: hotKeyID.id) else {
                return OSStatus(eventNotHandledErr)
            }
            DispatchQueue.main.async {
                HotkeyManager.sharedInstance?.onAction?(action)
            }
            return noErr
        }

        InstallEventHandler(
            GetApplicationEventTarget(),
            callback,
            1,
            &eventSpec,
            nil,
            &eventHandlerRef
        )

        let modifiers = UInt32(controlKey | optionKey)
        var updatedStatuses: [HotkeyRegistrationStatus] = []

        for action in GlobalChordAction.allCases {
            var ref: EventHotKeyRef? = nil
            let hotKeyID = EventHotKeyID(signature: OSType(0x50464736), id: action.rawValue)
            let err = RegisterEventHotKey(
                action.carbonKeyCode,
                modifiers,
                hotKeyID,
                GetApplicationEventTarget(),
                0,
                &ref
            )
            if err == noErr, ref != nil {
                hotKeyRefs.append(ref)
                updatedStatuses.append(
                    HotkeyRegistrationStatus(action: action, isRegistered: true, errorMessage: nil)
                )
            } else {
                updatedStatuses.append(
                    HotkeyRegistrationStatus(
                        action: action,
                        isRegistered: false,
                        errorMessage: "OS rejected \(action.shortcutLabel) (status \(err))"
                    )
                )
            }
        }
        self.statuses = updatedStatuses
    }

    public func unregisterAll() {
        for ref in hotKeyRefs {
            if let ref = ref {
                UnregisterEventHotKey(ref)
            }
        }
        hotKeyRefs.removeAll()
        if let handler = eventHandlerRef {
            RemoveEventHandler(handler)
            eventHandlerRef = nil
        }
    }
}
