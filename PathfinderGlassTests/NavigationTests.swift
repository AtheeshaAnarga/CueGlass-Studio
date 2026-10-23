import XCTest
@testable import PathfinderGlass

@MainActor
final class NavigationTests: XCTestCase {
    func testBeatAndSectionNavigationAndThankYouJump() {
        let parser = MarkdownScriptParser()
        let doc = parser.parse(ScriptStore.embeddedCanonicalPathfinder26Markdown)
        let nav = ScriptNavigationController(document: doc)

        XCTAssertEqual(nav.activeSection?.number, 0)
        let initialBeatID = nav.activeBeatID
        nav.nextBeat()
        XCTAssertNotEqual(nav.activeBeatID, initialBeatID)

        // Jump to next main section (01)
        nav.nextMainSection()
        XCTAssertEqual(nav.activeSection?.number, 1)

        // Jump to section 04 (Artificial Intelligence — Asindu)
        nav.jumpToSection("sec-04")
        XCTAssertEqual(nav.activeSection?.number, 4)
        XCTAssertNotNil(nav.pendingThankSpeakerWaypoint)
        XCTAssertEqual(nav.pendingThankSpeakerWaypoint?.speakerName, "Asindu De Silva")

        nav.jumpToThanksInCurrentSection()
        XCTAssertEqual(nav.activeBlock?.displayText, "THANKING THE FIRST SPEAKER")
        XCTAssertNil(nav.pendingThankSpeakerWaypoint)
    }

    func testOnDemandSnippetPreservesAndRestoresLivePosition() {
        let parser = MarkdownScriptParser()
        let doc = parser.parse(ScriptStore.embeddedCanonicalPathfinder26Markdown)
        let nav = ScriptNavigationController(document: doc)

        nav.jumpToSection("sec-05")
        nav.nextBeat()
        let savedLiveBeat = nav.activeBeatID

        guard let emergency = doc.backupLines.first else {
            XCTFail("Expected backup lines in section 10")
            return
        }
        nav.invokeOnDemandSnippet(emergency)
        XCTAssertNotNil(nav.activeOnDemandSnippet)

        nav.returnToLivePosition()
        XCTAssertNil(nav.activeOnDemandSnippet)
        XCTAssertEqual(nav.activeBeatID, savedLiveBeat)
    }
}
