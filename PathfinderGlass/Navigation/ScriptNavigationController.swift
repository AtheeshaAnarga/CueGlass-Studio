import Foundation
import Combine

@MainActor
public final class ScriptNavigationController: ObservableObject {
    @Published public private(set) var document: ScriptDocument
    @Published public private(set) var activeBeatID: String
    @Published public private(set) var lastLiveBeatID: String
    @Published public private(set) var activeOnDemandSnippet: EmergencySnippet? = nil
    @Published public var showOrganizerCues: Bool = true
    @Published public var lastNavigationHint: String? = nil

    public init(document: ScriptDocument, initialBeatID: String? = nil) {
        self.document = document
        let firstID = initialBeatID ?? document.liveFlowBeats.first?.id ?? ""
        self.activeBeatID = firstID
        self.lastLiveBeatID = firstID
    }

    public var activeBlock: ScriptBlock? {
        document.block(withID: activeBeatID)
    }

    public var activeSection: ScriptSection? {
        document.section(forBlockID: activeBeatID) ?? document.liveFlowSections.first
    }

    public var currentSectionBeats: [ScriptBlock] {
        activeSection?.navigableBeats ?? []
    }

    public var activeBeatIndexInSection: Int {
        guard let idx = currentSectionBeats.firstIndex(where: { $0.id == activeBeatID }) else {
            return 1
        }
        return idx + 1
    }

    public var pendingThankSpeakerWaypoint: (speakerName: String, targetBlockID: String)? {
        guard activeOnDemandSnippet == nil,
              let sec = activeSection,
              let thankID = sec.thankSpeakerWaypointBlockID,
              let speaker = sec.speakerName else {
            return nil
        }
        // Show "Resume with Thanks" when we are in a speaker section (04-07) before the THANKING subsection
        guard let currentIndex = sec.navigableBeats.firstIndex(where: { $0.id == activeBeatID }),
              let thankIndex = sec.navigableBeats.firstIndex(where: { $0.id == thankID }),
              currentIndex < thankIndex else {
            return nil
        }
        return (speaker, thankID)
    }

    public func nextBeat() {
        if activeOnDemandSnippet != nil {
            returnToLivePosition()
            return
        }
        let beats = document.liveFlowBeats
        guard !beats.isEmpty else { return }
        if let idx = beats.firstIndex(where: { $0.id == activeBeatID }), idx + 1 < beats.count {
            selectBeat(beats[idx + 1].id)
        }
    }

    public func previousBeat() {
        if activeOnDemandSnippet != nil {
            returnToLivePosition()
            return
        }
        let beats = document.liveFlowBeats
        guard !beats.isEmpty else { return }
        if let idx = beats.firstIndex(where: { $0.id == activeBeatID }), idx > 0 {
            selectBeat(beats[idx - 1].id)
        }
    }

    public func nextMainSection() {
        if activeOnDemandSnippet != nil {
            activeOnDemandSnippet = nil
        }
        let liveSections = document.liveFlowSections
        guard let currentSec = activeSection,
              let secIdx = liveSections.firstIndex(where: { $0.id == currentSec.id }) else {
            return
        }
        let targetIndex = min(secIdx + 1, liveSections.count - 1)
        if let firstBeat = liveSections[targetIndex].navigableBeats.first {
            selectBeat(firstBeat.id)
        }
    }

    public func previousMainSection() {
        if activeOnDemandSnippet != nil {
            activeOnDemandSnippet = nil
        }
        let liveSections = document.liveFlowSections
        guard let currentSec = activeSection,
              let secIdx = liveSections.firstIndex(where: { $0.id == currentSec.id }) else {
            return
        }
        // If we are deep inside a section, jump to start of current section first, otherwise previous section
        if activeBeatIndexInSection > 1, let firstInCurrent = currentSec.navigableBeats.first {
            selectBeat(firstInCurrent.id)
            return
        }
        let targetIndex = max(secIdx - 1, 0)
        if let firstBeat = liveSections[targetIndex].navigableBeats.first {
            selectBeat(firstBeat.id)
        }
    }

    public func selectBeat(_ beatID: String) {
        guard let block = document.block(withID: beatID) else { return }
        activeOnDemandSnippet = nil
        activeBeatID = block.id
        if let sec = document.section(forBlockID: block.id), sec.role == .liveFlow {
            lastLiveBeatID = block.id
            let beatPos = (sec.navigableBeats.firstIndex(where: { $0.id == block.id }) ?? 0) + 1
            lastNavigationHint = "\(sec.numberBadge) \(sec.shortTitle) · Beat \(beatPos)/\(sec.navigableBeats.count)"
        }
    }

    public func jumpToSection(_ sectionID: String) {
        guard let sec = document.sections.first(where: { $0.id == sectionID }),
              let firstBeat = sec.navigableBeats.first else { return }
        selectBeat(firstBeat.id)
    }

    public func jumpToThanksInCurrentSection() {
        guard let waypoint = pendingThankSpeakerWaypoint else { return }
        selectBeat(waypoint.targetBlockID)
    }

    public func invokeOnDemandSnippet(_ snippet: EmergencySnippet) {
        if let currentSec = activeSection, currentSec.role == .liveFlow {
            lastLiveBeatID = activeBeatID
        }
        activeOnDemandSnippet = snippet
        lastNavigationHint = "On-Demand · \(snippet.title)"
    }

    public func returnToLivePosition() {
        activeOnDemandSnippet = nil
        if document.block(withID: lastLiveBeatID) != nil {
            activeBeatID = lastLiveBeatID
        }
        if let sec = activeSection {
            lastNavigationHint = "Returned to \(sec.numberBadge) \(sec.shortTitle)"
        }
    }

    public func updateDocument(_ newDocument: ScriptDocument) {
        let previousBlock = activeBlock
        self.document = newDocument

        // Remap activeBeatID using exact canonicalID, then blockFingerprint, then section fallback
        if newDocument.block(withID: activeBeatID) != nil {
            return
        }
        if let prev = previousBlock {
            if let matchByFP = newDocument.liveFlowBeats.first(where: {
                $0.address.blockFingerprint == prev.address.blockFingerprint
            }) {
                activeBeatID = matchByFP.id
                lastLiveBeatID = matchByFP.id
                return
            }
            if let sameSec = newDocument.sections.first(where: { $0.id == prev.sectionID }),
               let firstBeat = sameSec.navigableBeats.first {
                activeBeatID = firstBeat.id
                lastLiveBeatID = firstBeat.id
                return
            }
        }
        if let first = newDocument.liveFlowBeats.first {
            activeBeatID = first.id
            lastLiveBeatID = first.id
        }
    }
}
