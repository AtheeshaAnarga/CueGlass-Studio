import Foundation

public enum ScriptSectionRole: String, Codable, Sendable, Equatable {
    case liveFlow
    case backupLines
    case moderatorQuestions
    case organizerChecklist
}

public struct ScriptSubsection: Identifiable, Codable, Sendable, Equatable {
    public let id: String
    public let title: String
    public let firstBlockID: String
    public let isThankYouSubsection: Bool
    public let isQAShortcut: Bool
    public let blockIDs: [String]

    public init(
        id: String,
        title: String,
        firstBlockID: String,
        isThankYouSubsection: Bool,
        isQAShortcut: Bool,
        blockIDs: [String]
    ) {
        self.id = id
        self.title = title
        self.firstBlockID = firstBlockID
        self.isThankYouSubsection = isThankYouSubsection
        self.isQAShortcut = isQAShortcut
        self.blockIDs = blockIDs
    }
}

public struct ScriptSection: Identifiable, Codable, Sendable, Equatable {
    public let id: String
    public let number: Int?
    public let numberBadge: String
    public let rawTitle: String
    public let shortTitle: String
    public let role: ScriptSectionRole
    public let blocks: [ScriptBlock]
    public let subsections: [ScriptSubsection]
    public let introduceWaypointBlockID: String?
    public let thankSpeakerWaypointBlockID: String?
    public let speakerName: String?

    public init(
        id: String,
        number: Int?,
        numberBadge: String,
        rawTitle: String,
        shortTitle: String,
        role: ScriptSectionRole,
        blocks: [ScriptBlock],
        subsections: [ScriptSubsection],
        introduceWaypointBlockID: String?,
        thankSpeakerWaypointBlockID: String?,
        speakerName: String?
    ) {
        self.id = id
        self.number = number
        self.numberBadge = numberBadge
        self.rawTitle = rawTitle
        self.shortTitle = shortTitle
        self.role = role
        self.blocks = blocks
        self.subsections = subsections
        self.introduceWaypointBlockID = introduceWaypointBlockID
        self.thankSpeakerWaypointBlockID = thankSpeakerWaypointBlockID
        self.speakerName = speakerName
    }

    public var navigableBeats: [ScriptBlock] {
        blocks.filter(\.isNavigableBeat)
    }
}
