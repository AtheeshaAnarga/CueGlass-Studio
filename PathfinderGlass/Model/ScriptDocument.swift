import Foundation

public struct ScriptMetadataHeader: Codable, Sendable, Equatable {
    public let title: String
    public let subtitle: String?
    public let fields: [String: String]
    public let orderedKeys: [String]

    public init(
        title: String,
        subtitle: String?,
        fields: [String: String],
        orderedKeys: [String]
    ) {
        self.title = title
        self.subtitle = subtitle
        self.fields = fields
        self.orderedKeys = orderedKeys
    }
}

public struct EmergencySnippet: Identifiable, Codable, Sendable, Equatable {
    public let id: String
    public let category: String
    public let title: String
    public let spokenLines: [String]
    public let organizerNotes: [String]
    public let sectionNumber: Int?
    public let placeholders: [ScriptPlaceholder]

    public init(
        id: String,
        category: String,
        title: String,
        spokenLines: [String],
        organizerNotes: [String],
        sectionNumber: Int?,
        placeholders: [ScriptPlaceholder]
    ) {
        self.id = id
        self.category = category
        self.title = title
        self.spokenLines = spokenLines
        self.organizerNotes = organizerNotes
        self.sectionNumber = sectionNumber
        self.placeholders = placeholders
    }
}

public struct ScriptDocument: Codable, Sendable, Equatable {
    public let rawMarkdown: String
    public let metadata: ScriptMetadataHeader
    public let sections: [ScriptSection]
    public let allPlaceholders: [ScriptPlaceholder]
    public let backupLines: [EmergencySnippet]
    public let moderatorQuestions: [EmergencySnippet]
    public let checklistBlocks: [ScriptBlock]

    public init(
        rawMarkdown: String,
        metadata: ScriptMetadataHeader,
        sections: [ScriptSection],
        allPlaceholders: [ScriptPlaceholder],
        backupLines: [EmergencySnippet],
        moderatorQuestions: [EmergencySnippet],
        checklistBlocks: [ScriptBlock]
    ) {
        self.rawMarkdown = rawMarkdown
        self.metadata = metadata
        self.sections = sections
        self.allPlaceholders = allPlaceholders
        self.backupLines = backupLines
        self.moderatorQuestions = moderatorQuestions
        self.checklistBlocks = checklistBlocks
    }

    public var liveFlowSections: [ScriptSection] {
        sections.filter { $0.role == .liveFlow }
    }

    public var onDemandSections: [ScriptSection] {
        sections.filter { $0.role != .liveFlow }
    }

    public var liveFlowBeats: [ScriptBlock] {
        liveFlowSections.flatMap(\.navigableBeats)
    }

    public func block(withID id: String) -> ScriptBlock? {
        for section in sections {
            if let found = section.blocks.first(where: { $0.id == id }) {
                return found
            }
        }
        return nil
    }

    public func section(forBlockID id: String) -> ScriptSection? {
        sections.first { section in
            section.blocks.contains(where: { $0.id == id })
        }
    }
}
