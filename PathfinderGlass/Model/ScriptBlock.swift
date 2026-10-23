import Foundation

public enum ScriptBlockKind: String, Codable, Sendable, Equatable {
    case speech
    case organizerCue
    case conditionalCue
    case timingCue
    case visualCue
    case deliveryCue
    case actionCue
    case subsectionHeading
    case checklistItem
    case checklistGroupHeading
    case divider

    public var isCueCard: Bool {
        switch self {
        case .organizerCue, .conditionalCue, .timingCue, .visualCue, .deliveryCue, .actionCue:
            return true
        default:
            return false
        }
    }
}

public struct ScriptPlaceholder: Identifiable, Codable, Sendable, Equatable {
    public let id: String
    public let rawToken: String
    public let label: String
    public let isDataScienceCritical: Bool
    public let isConditional: Bool
    public let sectionNumber: Int?
    public let sectionTitle: String
    public let blockID: String

    public init(
        id: String,
        rawToken: String,
        label: String,
        isDataScienceCritical: Bool,
        isConditional: Bool,
        sectionNumber: Int?,
        sectionTitle: String,
        blockID: String
    ) {
        self.id = id
        self.rawToken = rawToken
        self.label = label
        self.isDataScienceCritical = isDataScienceCritical
        self.isConditional = isConditional
        self.sectionNumber = sectionNumber
        self.sectionTitle = sectionTitle
        self.blockID = blockID
    }
}

public struct ScriptBeatAddress: Codable, Sendable, Hashable, Equatable {
    public let sectionID: String
    public let subsectionID: String?
    public let blockFingerprint: String
    public let occurrenceIndex: Int

    public init(
        sectionID: String,
        subsectionID: String?,
        blockFingerprint: String,
        occurrenceIndex: Int
    ) {
        self.sectionID = sectionID
        self.subsectionID = subsectionID
        self.blockFingerprint = blockFingerprint
        self.occurrenceIndex = occurrenceIndex
    }

    public var canonicalID: String {
        "\(sectionID)::\(subsectionID ?? "root")::\(blockFingerprint)#\(occurrenceIndex)"
    }
}

public struct ScriptBlock: Identifiable, Codable, Sendable, Equatable {
    public let address: ScriptBeatAddress
    public var id: String { address.canonicalID }
    public let kind: ScriptBlockKind
    public let rawMarkdown: String
    public let displayText: String
    public let sectionID: String
    public let sectionNumber: Int?
    public let subsectionID: String?
    public let subsectionTitle: String?
    public let placeholders: [ScriptPlaceholder]
    public let isCheckedByDefault: Bool
    public let isThankYouWaypoint: Bool
    public let isSpeakerHandoff: Bool
    public let associatedSpeakerName: String?

    public init(
        address: ScriptBeatAddress,
        kind: ScriptBlockKind,
        rawMarkdown: String,
        displayText: String,
        sectionID: String,
        sectionNumber: Int?,
        subsectionID: String?,
        subsectionTitle: String?,
        placeholders: [ScriptPlaceholder],
        isCheckedByDefault: Bool = false,
        isThankYouWaypoint: Bool = false,
        isSpeakerHandoff: Bool = false,
        associatedSpeakerName: String? = nil
    ) {
        self.address = address
        self.kind = kind
        self.rawMarkdown = rawMarkdown
        self.displayText = displayText
        self.sectionID = sectionID
        self.sectionNumber = sectionNumber
        self.subsectionID = subsectionID
        self.subsectionTitle = subsectionTitle
        self.placeholders = placeholders
        self.isCheckedByDefault = isCheckedByDefault
        self.isThankYouWaypoint = isThankYouWaypoint
        self.isSpeakerHandoff = isSpeakerHandoff
        self.associatedSpeakerName = associatedSpeakerName
    }

    public var isNavigableBeat: Bool {
        switch kind {
        case .speech, .organizerCue, .conditionalCue, .timingCue, .visualCue, .deliveryCue, .actionCue, .subsectionHeading:
            return true
        case .checklistItem, .checklistGroupHeading, .divider:
            return false
        }
    }
}
