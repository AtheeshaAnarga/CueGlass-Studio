import XCTest
@testable import PathfinderGlass

final class PlaceholderTests: XCTestCase {
    func testUnresolvedDataSciencePlaceholdersAndTaskCheckboxes() {
        let parser = MarkdownScriptParser()
        let doc = parser.parse(ScriptStore.embeddedCanonicalPathfinder26Markdown)

        // Ensure checklist items `- [ ]` in section 12 are NOT misclassified as placeholders
        let checklistPlaceholders = doc.allPlaceholders.filter { $0.sectionNumber == 12 }
        XCTAssertTrue(checklistPlaceholders.isEmpty)
        XCTAssertEqual(doc.checklistBlocks.count, 18)

        // Ensure Data Science speaker placeholders in 02 and 06 are flagged as critical
        let dsCritical = doc.allPlaceholders.filter(\.isDataScienceCritical)
        XCTAssertGreaterThanOrEqual(dsCritical.count, 4)
        XCTAssertTrue(dsCritical.contains(where: { $0.label.contains("Confirmed Speaker's Name") }))
        XCTAssertTrue(dsCritical.contains(where: { $0.label.contains("Confirmed Speaker's Full Name") }))
    }
}
