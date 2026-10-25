import Foundation
import CoreGraphics
import Combine
import SwiftUI
import AppKit

public enum AppThemeMode: String, Codable, CaseIterable, Sendable {
    case light
    case dark

    public var displayName: String {
        switch self {
        case .light: return "Apple Liquid Light"
        case .dark: return "Dark Obsidian Glass"
        }
    }

    public var colorScheme: ColorScheme {
        switch self {
        case .light: return .light
        case .dark: return .dark
        }
    }
}

public enum WindowSurfaceLayoutMode: String, Codable, CaseIterable, Sendable {
    case fullLiquidGlass
    case classicCard

    public var displayName: String {
        switch self {
        case .fullLiquidGlass: return "Official Tahoe Liquid Glass"
        case .classicCard: return "Classic Card Layout"
        }
    }
}

/// Official Apple Developer macOS 26 Tahoe `Glass` material variants (`Glass.regular`, `Glass.clear`, `Glass.identity`)
/// Reference: https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass
public enum AppleGlassVariant: String, Codable, CaseIterable, Sendable {
    case regular
    case clear
    case identity

    public var displayName: String {
        switch self {
        case .regular: return ".regular (Adaptive)"
        case .clear: return ".clear (Crystal Lens)"
        case .identity: return ".identity (Pass-Through)"
        }
    }

    public var apiDeclaration: String {
        switch self {
        case .regular: return "Glass.regular"
        case .clear: return "Glass.clear"
        case .identity: return "Glass.identity"
        }
    }
}

/// Official Apple Developer `.tint(_:)` semantic refractive volume tints for `NSGlassEffectView` and `.glassEffect()`
public enum AppleGlassTintPreset: String, Codable, CaseIterable, Sendable {
    case crystalNeutral
    case tahoeBlue
    case ultraviolet
    case emeraldMist
    case amberGold

    public var displayName: String {
        switch self {
        case .crystalNeutral: return "Crystal Neutral"
        case .tahoeBlue: return "Tahoe Sky"
        case .ultraviolet: return "Ultraviolet"
        case .emeraldMist: return "Emerald Mist"
        case .amberGold: return "Warm Gold"
        }
    }

    public func swiftUIColor(isDark: Bool, opacity: Double = 0.18) -> Color? {
        switch self {
        case .crystalNeutral:
            return isDark ? Color.white.opacity(opacity * 0.45) : Color.white.opacity(opacity * 0.85)
        case .tahoeBlue:
            return Color(red: 0.14, green: 0.48, blue: 0.98).opacity(opacity)
        case .ultraviolet:
            return Color(red: 0.48, green: 0.28, blue: 0.96).opacity(opacity)
        case .emeraldMist:
            return Color(red: 0.08, green: 0.72, blue: 0.54).opacity(opacity)
        case .amberGold:
            return Color(red: 0.95, green: 0.62, blue: 0.12).opacity(opacity)
        }
    }

    public func nsColor(isDark: Bool, transparency: Double) -> NSColor? {
        let alpha = CGFloat(max(0.04, min(0.42, (1.0 - transparency / 100.0) * 0.48)))
        switch self {
        case .crystalNeutral:
            return isDark
                ? NSColor(calibratedRed: 0.08, green: 0.11, blue: 0.16, alpha: alpha)
                : NSColor(calibratedRed: 0.98, green: 0.99, blue: 1.0, alpha: alpha)
        case .tahoeBlue:
            return NSColor(calibratedRed: 0.14, green: 0.48, blue: 0.98, alpha: alpha * 0.85)
        case .ultraviolet:
            return NSColor(calibratedRed: 0.48, green: 0.28, blue: 0.96, alpha: alpha * 0.85)
        case .emeraldMist:
            return NSColor(calibratedRed: 0.08, green: 0.72, blue: 0.54, alpha: alpha * 0.85)
        case .amberGold:
            return NSColor(calibratedRed: 0.95, green: 0.62, blue: 0.12, alpha: alpha * 0.85)
        }
    }
}

public enum FontBoldnessWeight: Int, Codable, CaseIterable, Sendable {
    case regular = 400
    case medium = 500
    case semibold = 600
    case bold = 700

    public var displayName: String {
        switch self {
        case .regular: return "Regular (400)"
        case .medium: return "Medium (500)"
        case .semibold: return "Semibold (600)"
        case .bold: return "Bold (700)"
        }
    }

    public var swiftUIWeight: Font.Weight {
        switch self {
        case .regular: return .regular
        case .medium: return .medium
        case .semibold: return .semibold
        case .bold: return .bold
        }
    }
}

public struct WindowGeometryCalculator: Sendable {
    public static let defaultExpandedSize = CGSize(width: 560, height: 340)
    public static let minExpandedSize = CGSize(width: 360, height: 180)
    public static let maxExpandedSize = CGSize(width: 850, height: 650)
    public static let collapsedBubbleSize = CGSize(width: 46, height: 46)
    public static let nearCameraTopGap: CGFloat = 16

    public static func nearCameraFrame(
        in visibleFrame: CGRect,
        panelSize: CGSize = defaultExpandedSize
    ) -> CGRect {
        let clampedWidth = min(max(panelSize.width, minExpandedSize.width), min(maxExpandedSize.width, visibleFrame.width - 24))
        let clampedHeight = min(max(panelSize.height, minExpandedSize.height), min(maxExpandedSize.height, visibleFrame.height - 24))

        let originX = visibleFrame.midX - (clampedWidth / 2.0)
        let originY = visibleFrame.maxY - clampedHeight - nearCameraTopGap
        return clampFrame(
            CGRect(x: originX, y: originY, width: clampedWidth, height: clampedHeight),
            to: visibleFrame,
            isBubble: false
        )
    }

    public static func nearCameraBubbleFrame(in visibleFrame: CGRect) -> CGRect {
        let originX = visibleFrame.midX - (collapsedBubbleSize.width / 2.0)
        let originY = visibleFrame.maxY - collapsedBubbleSize.height - 12
        return clampFrame(
            CGRect(x: originX, y: originY, width: collapsedBubbleSize.width, height: collapsedBubbleSize.height),
            to: visibleFrame,
            isBubble: true
        )
    }

    public static func clampFrame(
        _ frame: CGRect,
        to visibleFrame: CGRect,
        isBubble: Bool
    ) -> CGRect {
        let width: CGFloat
        let height: CGFloat
        if isBubble {
            width = collapsedBubbleSize.width
            height = collapsedBubbleSize.height
        } else {
            width = min(max(frame.width, minExpandedSize.width), min(maxExpandedSize.width, visibleFrame.width - 16))
            height = min(max(frame.height, minExpandedSize.height), min(maxExpandedSize.height, visibleFrame.height - 16))
        }

        let minX = visibleFrame.minX + 8
        let maxX = max(minX, visibleFrame.maxX - width - 8)
        let minY = visibleFrame.minY + 8
        let maxY = max(minY, visibleFrame.maxY - height - 8)

        let clampedX = min(max(frame.origin.x, minX), maxX)
        let clampedY = min(max(frame.origin.y, minY), maxY)

        return CGRect(x: round(clampedX), y: round(clampedY), width: round(width), height: round(height))
    }
}

@MainActor
public final class SettingsStore: ObservableObject {
    private let defaults: UserDefaults

    @Published public var themeMode: AppThemeMode {
        didSet { defaults.set(themeMode.rawValue, forKey: Keys.themeMode) }
    }
    @Published public var windowLayoutMode: WindowSurfaceLayoutMode {
        didSet { defaults.set(windowLayoutMode.rawValue, forKey: Keys.windowLayoutMode) }
    }
    @Published public var glassVariant: AppleGlassVariant {
        didSet { defaults.set(glassVariant.rawValue, forKey: Keys.glassVariant) }
    }
    @Published public var glassTintPreset: AppleGlassTintPreset {
        didSet { defaults.set(glassTintPreset.rawValue, forKey: Keys.glassTintPreset) }
    }
    @Published public var glassInteractive: Bool {
        didSet { defaults.set(glassInteractive, forKey: Keys.glassInteractive) }
    }
    @Published public var glassContainerSpacing: Double {
        didSet { defaults.set(glassContainerSpacing, forKey: Keys.glassContainerSpacing) }
    }
    @Published public var liquidness: Double {
        didSet { defaults.set(liquidness, forKey: Keys.liquidness) }
    }
    @Published public var glassTransparency: Double {
        didSet { defaults.set(glassTransparency, forKey: Keys.glassTransparency) }
    }
    @Published public var glassEffectLevel: Double {
        didSet { defaults.set(glassEffectLevel, forKey: Keys.glassEffectLevel) }
    }
    @Published public var activeBeatGlow: Double {
        didSet { defaults.set(activeBeatGlow, forKey: Keys.activeBeatGlow) }
    }
    @Published public var fontWeightOption: FontBoldnessWeight {
        didSet { defaults.set(fontWeightOption.rawValue, forKey: Keys.fontWeightOption) }
    }
    @Published public var fontSize: Double {
        didSet { defaults.set(fontSize, forKey: Keys.fontSize) }
    }
    @Published public var lineHeightMultiplier: Double {
        didSet { defaults.set(lineHeightMultiplier, forKey: Keys.lineHeightMultiplier) }
    }
    @Published public var narrowReadingWidth: Bool {
        didSet { defaults.set(narrowReadingWidth, forKey: Keys.narrowReadingWidth) }
    }
    @Published public var showOrganizerCues: Bool {
        didSet { defaults.set(showOrganizerCues, forKey: Keys.showOrganizerCues) }
    }
    @Published public var voiceDarkenWords: Bool {
        didSet { defaults.set(voiceDarkenWords, forKey: Keys.voiceDarkenWords) }
    }
    @Published public var voiceDarkenOpacity: Double {
        didSet { defaults.set(voiceDarkenOpacity, forKey: Keys.voiceDarkenOpacity) }
    }
    @Published public var isCollapsedToBubble: Bool {
        didSet { defaults.set(isCollapsedToBubble, forKey: Keys.isCollapsedToBubble) }
    }
    @Published public var activeBeatID: String? {
        didSet { defaults.set(activeBeatID, forKey: Keys.activeBeatID) }
    }
    @Published public var checklistCompletion: [String: Bool] {
        didSet {
            if let data = try? JSONEncoder().encode(checklistCompletion) {
                defaults.set(data, forKey: Keys.checklistCompletion)
            }
        }
    }
    @Published public var rehearsalAcknowledgedPlaceholders: Set<String> {
        didSet {
            defaults.set(Array(rehearsalAcknowledgedPlaceholders), forKey: Keys.rehearsalAcknowledged)
        }
    }
    @Published public var hasSeenScreenShareNotice: Bool {
        didSet { defaults.set(hasSeenScreenShareNotice, forKey: Keys.hasSeenScreenShareNotice) }
    }

    private enum Keys {
        static let themeMode = "cg.themeMode"
        static let windowLayoutMode = "cg.windowLayoutMode"
        static let glassVariant = "cg.glassVariant"
        static let glassTintPreset = "cg.glassTintPreset"
        static let glassInteractive = "cg.glassInteractive"
        static let glassContainerSpacing = "cg.glassContainerSpacing"
        static let liquidness = "cg.liquidness"
        static let glassTransparency = "cg.glassTransparency"
        static let glassEffectLevel = "cg.glassEffectLevel"
        static let activeBeatGlow = "cg.activeBeatGlow"
        static let fontWeightOption = "cg.fontWeightOption"
        static let fontSize = "cg.fontSize"
        static let lineHeightMultiplier = "cg.lineHeightMultiplier"
        static let narrowReadingWidth = "cg.narrowReadingWidth"
        static let showOrganizerCues = "cg.showOrganizerCues"
        static let voiceDarkenWords = "cg.voiceDarkenWords"
        static let voiceDarkenOpacity = "cg.voiceDarkenOpacity"
        static let isCollapsedToBubble = "cg.isCollapsedToBubble"
        static let activeBeatID = "cg.activeBeatID"
        static let checklistCompletion = "cg.checklistCompletion"
        static let rehearsalAcknowledged = "cg.rehearsalAcknowledged"
        static let hasSeenScreenShareNotice = "cg.hasSeenScreenShareNotice"
        static let lastExpandedFrame = "cg.lastExpandedFrame"
        static let lastBubbleOrigin = "cg.lastBubbleOrigin"
    }

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        if let rawTheme = defaults.string(forKey: Keys.themeMode),
           let parsedTheme = AppThemeMode(rawValue: rawTheme) {
            self.themeMode = parsedTheme
        } else {
            self.themeMode = .light
        }

        if let rawLayout = defaults.string(forKey: Keys.windowLayoutMode),
           let parsedLayout = WindowSurfaceLayoutMode(rawValue: rawLayout) {
            self.windowLayoutMode = parsedLayout
        } else {
            self.windowLayoutMode = .fullLiquidGlass
        }

        if let rawVariant = defaults.string(forKey: Keys.glassVariant),
           let parsedVariant = AppleGlassVariant(rawValue: rawVariant) {
            self.glassVariant = parsedVariant
        } else {
            self.glassVariant = .clear
        }

        if let rawTint = defaults.string(forKey: Keys.glassTintPreset),
           let parsedTint = AppleGlassTintPreset(rawValue: rawTint) {
            self.glassTintPreset = parsedTint
        } else {
            self.glassTintPreset = .crystalNeutral
        }

        if defaults.object(forKey: Keys.glassInteractive) == nil {
            self.glassInteractive = true
        } else {
            self.glassInteractive = defaults.bool(forKey: Keys.glassInteractive)
        }

        let storedSpacing = defaults.double(forKey: Keys.glassContainerSpacing)
        self.glassContainerSpacing = (defaults.object(forKey: Keys.glassContainerSpacing) != nil && storedSpacing >= 0 && storedSpacing <= 32) ? storedSpacing : 10.0

        let storedLiq = defaults.double(forKey: Keys.liquidness)
        self.liquidness = (defaults.object(forKey: Keys.liquidness) != nil && storedLiq >= 0 && storedLiq <= 100) ? storedLiq : 88.0

        let storedTrans = defaults.double(forKey: Keys.glassTransparency)
        self.glassTransparency = (defaults.object(forKey: Keys.glassTransparency) != nil && storedTrans >= 10 && storedTrans <= 95) ? storedTrans : 82.0

        let storedEffect = defaults.double(forKey: Keys.glassEffectLevel)
        self.glassEffectLevel = (defaults.object(forKey: Keys.glassEffectLevel) != nil && storedEffect >= 15 && storedEffect <= 100) ? storedEffect : 92.0

        let storedGlow = defaults.double(forKey: Keys.activeBeatGlow)
        self.activeBeatGlow = (defaults.object(forKey: Keys.activeBeatGlow) != nil && storedGlow >= 0 && storedGlow <= 100) ? storedGlow : 85.0

        let storedWeight = defaults.integer(forKey: Keys.fontWeightOption)
        self.fontWeightOption = FontBoldnessWeight(rawValue: storedWeight) ?? .medium

        let storedFont = defaults.double(forKey: Keys.fontSize)
        self.fontSize = (storedFont >= 18 && storedFont <= 48) ? storedFont : 26.0

        let storedLine = defaults.double(forKey: Keys.lineHeightMultiplier)
        self.lineHeightMultiplier = (storedLine >= 1.25 && storedLine <= 1.85) ? storedLine : 1.44

        self.narrowReadingWidth = defaults.bool(forKey: Keys.narrowReadingWidth)
        if defaults.object(forKey: Keys.showOrganizerCues) == nil {
            self.showOrganizerCues = true
        } else {
            self.showOrganizerCues = defaults.bool(forKey: Keys.showOrganizerCues)
        }

        if defaults.object(forKey: Keys.voiceDarkenWords) == nil {
            self.voiceDarkenWords = true
        } else {
            self.voiceDarkenWords = defaults.bool(forKey: Keys.voiceDarkenWords)
        }

        let storedDarkenOpacity = defaults.double(forKey: Keys.voiceDarkenOpacity)
        self.voiceDarkenOpacity = (defaults.object(forKey: Keys.voiceDarkenOpacity) != nil && storedDarkenOpacity >= 15 && storedDarkenOpacity <= 75) ? storedDarkenOpacity : 32.0

        self.isCollapsedToBubble = defaults.bool(forKey: Keys.isCollapsedToBubble)
        self.activeBeatID = defaults.string(forKey: Keys.activeBeatID)

        if let data = defaults.data(forKey: Keys.checklistCompletion),
           let decoded = try? JSONDecoder().decode([String: Bool].self, from: data) {
            self.checklistCompletion = decoded
        } else {
            self.checklistCompletion = [:]
        }

        if let arr = defaults.stringArray(forKey: Keys.rehearsalAcknowledged) {
            self.rehearsalAcknowledgedPlaceholders = Set(arr)
        } else {
            self.rehearsalAcknowledgedPlaceholders = []
        }

        self.hasSeenScreenShareNotice = defaults.bool(forKey: Keys.hasSeenScreenShareNotice)
    }

    public func toggleTheme() {
        themeMode = (themeMode == .light) ? .dark : .light
    }

    public func adjustFontSize(by delta: Double) {
        fontSize = min(max(fontSize + delta, 18.0), 48.0)
    }

    public func resetToAppleLiquidGlassLight() {
        themeMode = .light
        windowLayoutMode = .fullLiquidGlass
        glassVariant = .clear
        glassTintPreset = .crystalNeutral
        glassInteractive = true
        glassContainerSpacing = 6.0
        liquidness = 86.0
        glassTransparency = 82.0
        glassEffectLevel = 90.0
        activeBeatGlow = 82.0
        fontWeightOption = .medium
        fontSize = 26.0
        lineHeightMultiplier = 1.44
    }

    public func applyTahoeDarkGlassPreset() {
        themeMode = .dark
        windowLayoutMode = .fullLiquidGlass
        glassVariant = .identity
        glassTintPreset = .crystalNeutral
        glassInteractive = true
        glassContainerSpacing = 0.0
        liquidness = 100.0
        glassTransparency = 10.0
        glassEffectLevel = 15.0
        activeBeatGlow = 21.0
    }

    public func toggleChecklist(id: String) {
        checklistCompletion[id] = !(checklistCompletion[id] ?? false)
    }

    public func saveExpandedFrame(_ frame: CGRect) {
        let dict: [String: Double] = [
            "x": frame.origin.x,
            "y": frame.origin.y,
            "w": frame.size.width,
            "h": frame.size.height
        ]
        defaults.set(dict, forKey: Keys.lastExpandedFrame)
    }

    public func loadExpandedFrame() -> CGRect? {
        guard let dict = defaults.dictionary(forKey: Keys.lastExpandedFrame) as? [String: Double],
              let x = dict["x"], let y = dict["y"], let w = dict["w"], let h = dict["h"] else {
            return nil
        }
        return CGRect(x: x, y: y, width: w, height: h)
    }

    public func saveBubbleOrigin(_ origin: CGPoint) {
        let dict: [String: Double] = ["x": origin.x, "y": origin.y]
        defaults.set(dict, forKey: Keys.lastBubbleOrigin)
    }

    public func loadBubbleOrigin() -> CGPoint? {
        guard let dict = defaults.dictionary(forKey: Keys.lastBubbleOrigin) as? [String: Double],
              let x = dict["x"], let y = dict["y"] else {
            return nil
        }
        return CGPoint(x: x, y: y)
    }
}
