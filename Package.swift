// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PathfinderGlass",
    platforms: [
        .macOS("15.0")
    ],
    products: [
        .executable(name: "PathfinderGlass", targets: ["PathfinderGlass"])
    ],
    targets: [
        .executableTarget(
            name: "PathfinderGlass",
            path: "PathfinderGlass",
            exclude: [
                "Resources/Pathfinder26.md"
            ]
        ),
        .testTarget(
            name: "PathfinderGlassTests",
            dependencies: ["PathfinderGlass"],
            path: "PathfinderGlassTests"
        )
    ],
    swiftLanguageModes: [.v5]
)


