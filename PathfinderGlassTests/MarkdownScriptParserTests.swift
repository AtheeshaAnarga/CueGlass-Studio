import XCTest
@testable import PathfinderGlass

final class MarkdownScriptParserTests: XCTestCase {
    private let parser = MarkdownScriptParser()

    func testCanonicalPathfinder26SectionsAndSubheadings() {
        let doc = parser.parse(ScriptStore.embeddedCanonicalPathfinder26Markdown)

        XCTAssertEqual(doc.metadata.title, "PATHFINDER ’26")
        XCTAssertEqual(doc.metadata.fields["Host"], "Atheesha Anarga")
        XCTAssertEqual(doc.metadata.fields["Starting Time"], "7:00 PM")

        // Verify sections 00 through 12 exist in order
        XCTAssertEqual(doc.sections.count, 13)
        XCTAssertEqual(doc.liveFlowSections.count, 10)
        XCTAssertEqual(doc.onDemandSections.count, 3)

        for expectedNum in 0...12 {
            XCTAssertEqual(doc.sections[expectedNum].number, expectedNum)
        }

        // Verify speaker names and THANKING subsections in 04–07
        let sec04 = doc.sections[4]
        XCTAssertNotNil(sec04.thankSpeakerWaypointBlockID)
        XCTAssertTrue(sec04.subsections.contains(where: { $0.title == "THANKING THE FIRST SPEAKER" }))

        let sec05 = doc.sections[5]
        XCTAssertTrue(sec05.subsections.contains(where: { $0.title == "THANKING THE SECOND SPEAKER" }))

        let sec06 = doc.sections[6]
        XCTAssertTrue(sec06.subsections.contains(where: { $0.title == "THANKING THE THIRD SPEAKER" }))

        let sec07 = doc.sections[7]
        XCTAssertTrue(sec07.subsections.contains(where: { $0.title == "THANKING THE FOURTH SPEAKER" }))

        // Verify Q&A subsections in 08
        let sec08 = doc.sections[8]
        XCTAssertEqual(sec08.subsections.count, 5)
    }

    func testFallbackForUnnumberedMarkdown() {
        let custom = """
        # Custom Tech Meetup
        ## Welcome Notes
        Hello everyone!
        *[Cue: Start slides]*
        """
        let doc = parser.parse(custom)
        XCTAssertEqual(doc.sections.count, 1)
        XCTAssertEqual(doc.sections[0].navigableBeats.count, 2)
    }
}
