import Foundation

public struct MarkdownScriptParser: Sendable {
    public init() {}

    public func parse(_ markdown: String) -> ScriptDocument {
        let normalized = markdown.replacingOccurrences(of: "\r\n", with: "\n")
        let lines = normalized.components(separatedBy: "\n")

        var docTitle = "PATHFINDER ’26"
        var docSubtitle: String? = nil
        var metadataFields: [String: String] = [:]
        var orderedMetaKeys: [String] = []

        struct RawSectionAccumulator {
            var number: Int?
            var numberBadge: String
            var rawTitle: String
            var lines: [String]
        }

        var rawSections: [RawSectionAccumulator] = []
        var currentSection: RawSectionAccumulator? = nil
        var inHeaderPreamble = true

        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)

            if let h2Match = Self.parseH2Heading(trimmed) {
                if let existing = currentSection {
                    rawSections.append(existing)
                }
                inHeaderPreamble = false
                currentSection = RawSectionAccumulator(
                    number: h2Match.number,
                    numberBadge: h2Match.badge,
                    rawTitle: h2Match.title,
                    lines: []
                )
                continue
            }

            if inHeaderPreamble {
                if trimmed.hasPrefix("# ") && !trimmed.hasPrefix("## ") {
                    docTitle = String(trimmed.dropFirst(2)).trimmingCharacters(in: .whitespaces)
                } else if trimmed.hasPrefix("## ") {
                    docSubtitle = String(trimmed.dropFirst(3)).trimmingCharacters(in: .whitespaces)
                } else if let metaPair = Self.parseMetadataPair(trimmed) {
                    metadataFields[metaPair.key] = metaPair.value
                    if !orderedMetaKeys.contains(metaPair.key) {
                        orderedMetaKeys.append(metaPair.key)
                    }
                }
            } else {
                if trimmed == "**END OF MODERATOR SCRIPT**" {
                    continue
                }
                currentSection?.lines.append(line)
            }
        }

        if let last = currentSection {
            rawSections.append(last)
        }

        // Fallback if a custom markdown script has no numbered H2 sections
        if rawSections.isEmpty {
            rawSections.append(
                RawSectionAccumulator(
                    number: 0,
                    numberBadge: "00",
                    rawTitle: docSubtitle ?? docTitle,
                    lines: lines.filter { !$0.trimmingCharacters(in: .whitespaces).hasPrefix("# ") }
                )
            )
        }

        var parsedSections: [ScriptSection] = []
        var allPlaceholders: [ScriptPlaceholder] = []
        var backupLines: [EmergencySnippet] = []
        var moderatorQuestions: [EmergencySnippet] = []
        var checklistBlocks: [ScriptBlock] = []

        for (idx, rawSec) in rawSections.enumerated() {
            let secID = rawSec.number.map { String(format: "sec-%02d", $0) } ?? "sec-custom-\(idx)"
            let role = Self.determineRole(number: rawSec.number, title: rawSec.rawTitle)
            let shortTitle = Self.computeShortTitle(number: rawSec.number, rawTitle: rawSec.rawTitle)
            let speakerName = Self.associatedSpeaker(forSectionNumber: rawSec.number, title: rawSec.rawTitle)

            var blocks: [ScriptBlock] = []
            var subsections: [ScriptSubsection] = []
            var currentSubID: String? = nil
            var currentSubTitle: String? = nil
            var currentSubBlockIDs: [String] = []
            var fingerprintCounts: [String: Int] = [:]

            func flushSubsection() {
                guard let subID = currentSubID, let subTitle = currentSubTitle, let firstID = currentSubBlockIDs.first else {
                    return
                }
                let upper = subTitle.uppercased()
                let isThanks = upper.contains("THANKING")
                let isQA = (rawSec.number == 8)
                subsections.append(
                    ScriptSubsection(
                        id: subID,
                        title: subTitle,
                        firstBlockID: firstID,
                        isThankYouSubsection: isThanks,
                        isQAShortcut: isQA,
                        blockIDs: currentSubBlockIDs
                    )
                )
            }

            var paragraphBuffer: [String] = []

            func emitBlock(raw: String, explicitKind: ScriptBlockKind? = nil) {
                let cleanRaw = raw.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !cleanRaw.isEmpty else { return }

                let kind = explicitKind ?? Self.classifyBlock(cleanRaw, sectionRole: role)
                let fp = Self.fingerprint(for: cleanRaw)
                let count = (fingerprintCounts[fp] ?? 0) + 1
                fingerprintCounts[fp] = count

                let address = ScriptBeatAddress(
                    sectionID: secID,
                    subsectionID: currentSubID,
                    blockFingerprint: fp,
                    occurrenceIndex: count
                )

                let extractedPlaceholders = Self.extractPlaceholders(
                    from: cleanRaw,
                    kind: kind,
                    sectionNumber: rawSec.number,
                    sectionTitle: shortTitle,
                    blockID: address.canonicalID
                )
                allPlaceholders.append(contentsOf: extractedPlaceholders)

                let isThanksWaypoint = (kind == .subsectionHeading && cleanRaw.uppercased().contains("THANKING"))
                let isHandoff = cleanRaw.contains("Over to you") || cleanRaw.contains("over to you") || cleanRaw.contains("the session is yours")

                let displayText = Self.cleanDisplayText(for: cleanRaw, kind: kind)
                let isChecked = cleanRaw.hasPrefix("- [x]") || cleanRaw.hasPrefix("- [X]")

                let block = ScriptBlock(
                    address: address,
                    kind: kind,
                    rawMarkdown: cleanRaw,
                    displayText: displayText,
                    sectionID: secID,
                    sectionNumber: rawSec.number,
                    subsectionID: currentSubID,
                    subsectionTitle: currentSubTitle,
                    placeholders: extractedPlaceholders,
                    isCheckedByDefault: isChecked,
                    isThankYouWaypoint: isThanksWaypoint,
                    isSpeakerHandoff: isHandoff,
                    associatedSpeakerName: speakerName
                )

                blocks.append(block)
                if currentSubID != nil {
                    currentSubBlockIDs.append(block.id)
                }
                if kind == .checklistItem {
                    checklistBlocks.append(block)
                }
            }

            func flushParagraph() {
                guard !paragraphBuffer.isEmpty else { return }
                let joined = paragraphBuffer.joined(separator: " ")
                paragraphBuffer.removeAll()
                emitBlock(raw: joined)
            }

            for rawLine in rawSec.lines {
                let trimmed = rawLine.trimmingCharacters(in: .whitespaces)
                if trimmed.isEmpty {
                    flushParagraph()
                    continue
                }
                if trimmed == "---" {
                    flushParagraph()
                    emitBlock(raw: "---", explicitKind: .divider)
                    continue
                }
                if trimmed.hasPrefix("### ") {
                    flushParagraph()
                    flushSubsection()
                    let subTitle = String(trimmed.dropFirst(4)).trimmingCharacters(in: .whitespaces)
                    let subSlug = Self.fingerprint(for: subTitle)
                    currentSubID = "\(secID)-sub-\(subSlug)"
                    currentSubTitle = subTitle
                    currentSubBlockIDs = []
                    emitBlock(raw: trimmed, explicitKind: .subsectionHeading)
                    continue
                }
                if trimmed.hasPrefix("- [ ]") || trimmed.hasPrefix("- [x]") || trimmed.hasPrefix("- [X]") {
                    flushParagraph()
                    emitBlock(raw: trimmed, explicitKind: .checklistItem)
                    continue
                }
                if role == .organizerChecklist && trimmed.hasPrefix("**") && trimmed.hasSuffix("**") {
                    flushParagraph()
                    emitBlock(raw: trimmed, explicitKind: .checklistGroupHeading)
                    continue
                }
                if trimmed.hasPrefix("*[") && trimmed.hasSuffix("]*") {
                    flushParagraph()
                    emitBlock(raw: trimmed)
                    continue
                }
                paragraphBuffer.append(trimmed)
            }

            flushParagraph()
            flushSubsection()

            let introID = blocks.first(where: { $0.isNavigableBeat })?.id
            let thankID = subsections.first(where: \.isThankYouSubsection)?.firstBlockID

            let section = ScriptSection(
                id: secID,
                number: rawSec.number,
                numberBadge: rawSec.numberBadge,
                rawTitle: rawSec.rawTitle,
                shortTitle: shortTitle,
                role: role,
                blocks: blocks,
                subsections: subsections,
                introduceWaypointBlockID: introID,
                thankSpeakerWaypointBlockID: thankID,
                speakerName: speakerName
            )
            parsedSections.append(section)

            if role == .backupLines {
                backupLines.append(contentsOf: Self.buildEmergencySnippets(from: section, defaultCategory: "Backup Line"))
            } else if role == .moderatorQuestions {
                moderatorQuestions.append(contentsOf: Self.buildQuestionSnippets(from: section))
            }
        }

        let header = ScriptMetadataHeader(
            title: docTitle,
            subtitle: docSubtitle,
            fields: metadataFields,
            orderedKeys: orderedMetaKeys
        )

        return ScriptDocument(
            rawMarkdown: markdown,
            metadata: header,
            sections: parsedSections,
            allPlaceholders: allPlaceholders,
            backupLines: backupLines,
            moderatorQuestions: moderatorQuestions,
            checklistBlocks: checklistBlocks
        )
    }

    private static func parseH2Heading(_ line: String) -> (number: Int?, badge: String, title: String)? {
        guard line.hasPrefix("## ") else { return nil }
        let content = String(line.dropFirst(3)).trimmingCharacters(in: .whitespaces)
        // Match numbered sections like "00 — BEFORE THE SESSION STARTS" or "01 - OPENING"
        let pattern = #"^(\d{1,2})\s*[—–\-:]\s*(.+)$"#
        if let regex = try? NSRegularExpression(pattern: pattern),
           let match = regex.firstMatch(in: content, range: NSRange(content.startIndex..., in: content)),
           let numRange = Range(match.range(at: 1), in: content),
           let titleRange = Range(match.range(at: 2), in: content) {
            let numStr = String(content[numRange])
            let num = Int(numStr)
            let badge = num.map { String(format: "%02d", $0) } ?? numStr
            let title = String(content[titleRange]).trimmingCharacters(in: .whitespaces)
            return (num, badge, title)
        }
        // Unnumbered H2 in preamble ("## Final Moderator Script — Revised") is subtitle if before section 00
        if content.localizedCaseInsensitiveContains("Moderator Script") {
            return nil
        }
        return (nil, "•", content)
    }

    private static func parseMetadataPair(_ line: String) -> (key: String, value: String)? {
        let pattern = #"^\*\*(.+?):\*\*\s*(.+)$"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: line, range: NSRange(line.startIndex..., in: line)),
              let kRange = Range(match.range(at: 1), in: line),
              let vRange = Range(match.range(at: 2), in: line) else {
            return nil
        }
        return (
            String(line[kRange]).trimmingCharacters(in: .whitespaces),
            String(line[vRange]).trimmingCharacters(in: .whitespaces)
        )
    }

    private static func determineRole(number: Int?, title: String) -> ScriptSectionRole {
        let upper = title.uppercased()
        if number == 10 || upper.contains("BACKUP MODERATOR") {
            return .backupLines
        }
        if number == 11 || upper.contains("MODERATOR QUESTIONS") {
            return .moderatorQuestions
        }
        if number == 12 || upper.contains("CHECKLIST") {
            return .organizerChecklist
        }
        return .liveFlow
    }

    private static func computeShortTitle(number: Int?, rawTitle: String) -> String {
        switch number {
        case 0: return "Before Start"
        case 1: return "Opening"
        case 2: return "Overview"
        case 3: return "Reminders"
        case 4: return "Artificial Intelligence"
        case 5: return "Cybersecurity"
        case 6: return "Data Science"
        case 7: return "Standard CS"
        case 8: return "Q&A"
        case 9: return "Closing"
        case 10: return "Backup Lines"
        case 11: return "Moderator Questions"
        case 12: return "Organizer Checklist"
        default: return rawTitle
        }
    }

    private static func associatedSpeaker(forSectionNumber number: Int?, title: String) -> String? {
        switch number {
        case 4: return "Asindu De Silva"
        case 5: return "Sandeep Nilwakka"
        case 6: return "[Data Science Speaker]"
        case 7: return "Pansilu Jayawardane"
        default: return nil
        }
    }

    private static func classifyBlock(_ raw: String, sectionRole: ScriptSectionRole) -> ScriptBlockKind {
        if raw.hasPrefix("### ") {
            return .subsectionHeading
        }
        if raw == "---" {
            return .divider
        }
        if raw.hasPrefix("- [ ]") || raw.hasPrefix("- [x]") || raw.hasPrefix("- [X]") {
            return .checklistItem
        }
        if raw.hasPrefix("*[") && raw.hasSuffix("]*") {
            let inner = String(raw.dropFirst(2).dropLast(2)).trimmingCharacters(in: .whitespaces)
            let lower = inner.lowercased()
            if lower.hasPrefix("timing:") || lower.hasPrefix("time:") || lower.hasPrefix("pacing:") {
                return .timingCue
            }
            if lower.hasPrefix("slide:") || lower.hasPrefix("visual:") || lower.hasPrefix("screen:") || lower.hasPrefix("camera:") {
                return .visualCue
            }
            if lower.hasPrefix("tone:") || lower.hasPrefix("delivery:") || lower.hasPrefix("voice:") || lower.hasPrefix("energy:") {
                return .deliveryCue
            }
            if lower.hasPrefix("action:") || lower.hasPrefix("stage:") || lower.hasPrefix("handoff:") || lower.hasPrefix("allow the presentation") {
                return .actionCue
            }
            if lower.hasPrefix("if ") || lower.hasPrefix("optional") || lower.hasPrefix("branch:") {
                return .conditionalCue
            }
            return .organizerCue
        }
        if sectionRole == .organizerChecklist && raw.hasPrefix("*") && raw.hasSuffix("*") && !raw.hasPrefix("**") {
            return .organizerCue
        }
        return .speech
    }

    private static func cleanDisplayText(for raw: String, kind: ScriptBlockKind) -> String {
        switch kind {
        case .subsectionHeading:
            return String(raw.dropFirst(4)).trimmingCharacters(in: .whitespaces)
        case .organizerCue, .conditionalCue, .timingCue, .visualCue, .deliveryCue, .actionCue:
            if raw.hasPrefix("*[") && raw.hasSuffix("]*") {
                return String(raw.dropFirst(2).dropLast(2)).trimmingCharacters(in: .whitespaces)
            }
            return raw.trimmingCharacters(in: CharacterSet(charactersIn: "*"))
        case .checklistItem:
            return String(raw.dropFirst(5)).trimmingCharacters(in: .whitespaces)
        case .checklistGroupHeading:
            return raw.replacingOccurrences(of: "**", with: "")
        default:
            return raw
        }
    }

    private static func extractPlaceholders(
        from raw: String,
        kind: ScriptBlockKind,
        sectionNumber: Int?,
        sectionTitle: String,
        blockID: String
    ) -> [ScriptPlaceholder] {
        guard kind != .checklistItem else { return [] }

        let searchTarget: String
        let isCond = (kind == .conditionalCue)
        if raw.hasPrefix("*[") && raw.hasSuffix("]*") {
            let inner = String(raw.dropFirst(2).dropLast(2))
            if inner.lowercased().contains("insert one or two sentences about the speaker") {
                return [
                    ScriptPlaceholder(
                        id: "\(blockID)-ds-bio",
                        rawToken: inner,
                        label: "Data Science speaker verified academic background/projects",
                        isDataScienceCritical: true,
                        isConditional: false,
                        sectionNumber: sectionNumber,
                        sectionTitle: sectionTitle,
                        blockID: blockID
                    )
                ]
            }
            searchTarget = inner
        } else {
            searchTarget = raw
        }

        let pattern = #"\[([^\[\]]+)\]"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }
        let matches = regex.matches(in: searchTarget, range: NSRange(searchTarget.startIndex..., in: searchTarget))

        var results: [ScriptPlaceholder] = []
        for (i, match) in matches.enumerated() {
            guard let fullRange = Range(match.range(at: 0), in: searchTarget),
                  let innerRange = Range(match.range(at: 1), in: searchTarget) else { continue }
            let token = String(searchTarget[fullRange])
            let upperToken = token.uppercased()
            if upperToken == "[PAUSE]" || upperToken == "[BEAT]" || upperToken == "[BREATHE]" {
                continue
            }
            let label = String(searchTarget[innerRange]).trimmingCharacters(in: .whitespaces)
            if label.isEmpty { continue }

            let isDS = (sectionNumber == 2 || sectionNumber == 6 || sectionNumber == 11) &&
                (label.localizedCaseInsensitiveContains("Speaker") || label.localizedCaseInsensitiveContains("Confirmed"))

            results.append(
                ScriptPlaceholder(
                    id: "\(blockID)-ph-\(i)",
                    rawToken: token,
                    label: label,
                    isDataScienceCritical: isDS,
                    isConditional: isCond,
                    sectionNumber: sectionNumber,
                    sectionTitle: sectionTitle,
                    blockID: blockID
                )
            )
        }
        return results
    }

    private static func buildEmergencySnippets(from section: ScriptSection, defaultCategory: String) -> [EmergencySnippet] {
        var snippets: [EmergencySnippet] = []
        for sub in section.subsections {
            let subBlocks = section.blocks.filter { $0.subsectionID == sub.id && $0.kind != .subsectionHeading }
            let spoken = subBlocks.filter { $0.kind == .speech }.map(\.displayText)
            let notes = subBlocks.filter { $0.kind == .organizerCue || $0.kind == .conditionalCue }.map(\.displayText)
            let phs = subBlocks.flatMap(\.placeholders)
            snippets.append(
                EmergencySnippet(
                    id: sub.id,
                    category: defaultCategory,
                    title: sub.title,
                    spokenLines: spoken,
                    organizerNotes: notes,
                    sectionNumber: section.number,
                    placeholders: phs
                )
            )
        }
        return snippets
    }

    private static func buildQuestionSnippets(from section: ScriptSection) -> [EmergencySnippet] {
        var snippets: [EmergencySnippet] = []
        for sub in section.subsections {
            let subBlocks = section.blocks.filter { $0.subsectionID == sub.id && $0.kind != .subsectionHeading }
            var currentQLabel: String? = nil
            var qIndex = 0

            for block in subBlocks {
                if block.rawMarkdown.hasPrefix("**Question ") {
                    currentQLabel = block.rawMarkdown.replacingOccurrences(of: "**", with: "").replacingOccurrences(of: ":", with: "")
                } else if block.kind == .speech {
                    qIndex += 1
                    let title = currentQLabel.map { "\(sub.title) — \($0)" } ?? sub.title
                    snippets.append(
                        EmergencySnippet(
                            id: "\(sub.id)-q-\(qIndex)",
                            category: sub.title,
                            title: title,
                            spokenLines: [block.displayText],
                            organizerNotes: [],
                            sectionNumber: section.number,
                            placeholders: block.placeholders
                        )
                    )
                    currentQLabel = nil
                }
            }
        }
        return snippets
    }

    public static func fingerprint(for text: String) -> String {
        let alnum = text.lowercased().unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) }
        let prefix = String(String.UnicodeScalarView(alnum).prefix(32))
        var hash: UInt64 = 5381
        for byte in text.utf8 {
            hash = ((hash << 5) &+ hash) &+ UInt64(byte)
        }
        return "\(prefix)-\(String(hash, radix: 16))"
    }
}
