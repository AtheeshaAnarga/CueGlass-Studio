import XCTest
@testable import PathfinderGlass

final class ScriptStoreTests: XCTestCase {
    func testWorkingCopyRollingVersionsAndCorruptionRecovery() throws {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("PathfinderGlassTests-\(UUID().uuidString)", isDirectory: true)
        defer { _ = try? FileManager.default.removeItem(at: tempDir) }

        let store = ScriptStore(customBaseDirectory: tempDir)
        let initial = store.loadOrInitializeWorkingCopy()
        XCTAssertFalse(initial.recoveredFromBackup)
        XCTAssertTrue(initial.markdown.contains("PATHFINDER ’26"))

        // Save 7 versions and verify rolling cap of 5
        for idx in 1...7 {
            _ = try store.saveWorkingCopy("# Version \(idx)\n\nHello \(idx)", label: "Edit \(idx)")
        }
        let revisions = store.listRevisions()
        XCTAssertEqual(revisions.count, 5)

        // Simulate corrupted/empty working copy and verify recovery from LastKnownGood
        try "".write(to: store.workingScriptURL, atomically: true, encoding: .utf8)
        let recovered = store.loadOrInitializeWorkingCopy()
        XCTAssertTrue(recovered.recoveredFromBackup)
        XCTAssertTrue(recovered.markdown.contains("# Version 7"))
    }
}
