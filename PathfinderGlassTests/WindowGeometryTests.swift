import XCTest
@testable import PathfinderGlass

final class WindowGeometryTests: XCTestCase {
    func testNearCameraPlacementAndScreenClamping() {
        // 15-inch MacBook Air scaled visible frame (below menu bar / notch safe area)
        let visibleFrame = CGRect(x: 0, y: 0, width: 1710, height: 1068)
        let nearCamera = WindowGeometryCalculator.nearCameraFrame(in: visibleFrame)

        XCTAssertEqual(nearCamera.width, 560)
        XCTAssertEqual(nearCamera.height, 340)
        XCTAssertEqual(nearCamera.midX, visibleFrame.midX, accuracy: 1.0)
        XCTAssertEqual(visibleFrame.maxY - nearCamera.maxY, 16, accuracy: 1.0)

        // Disconnected external monitor out-of-bounds frame clamps safely back into visibleFrame
        let offscreenFrame = CGRect(x: 3200, y: 1400, width: 560, height: 340)
        let clamped = WindowGeometryCalculator.clampFrame(offscreenFrame, to: visibleFrame, isBubble: false)
        XCTAssertTrue(visibleFrame.contains(clamped))
    }
}
