import Foundation
import AppKit
import SwiftUI
import Combine
import AVFoundation
import Speech

/// Native macOS System Audio Input & Siri Dictation Voice Auto-Follow Engine
/// Captures audio from the active macOS Sound Input device via `AVAudioEngine`,
/// computes real-time RMS input level, and tracks spoken words in sequential order
/// with phonetic skeleton matching and 5-word lookahead recovery.
@MainActor
public final class VoiceAutoFollowController: ObservableObject {
    @Published public var isListening: Bool = false
    @Published public var spokenWordCount: Int = 0
    @Published public var activeBeatWordTotal: Int = 0
    @Published public var audioInputLevel: Double = 0.0
    @Published public var statusMessage: String = "System Default Audio Input"

    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var consumedResultTokenOffset: Int = 0
    private var latestRawTokenCount: Int = 0
    public var pendingJumpWordCount: Int = 0

    public var onEvaluateTranscript: ((String) -> Void)?

    public init() {}

    public func resetForNewBeat(totalWords: Int = 0) {
        consumedResultTokenOffset = latestRawTokenCount
        activeBeatWordTotal = totalWords
        if pendingJumpWordCount > 0 {
            spokenWordCount = pendingJumpWordCount
            pendingJumpWordCount = 0
        } else {
            spokenWordCount = 0
        }
    }

    public func toggleListening() {
        if isListening {
            stopListening()
        } else {
            startListening()
        }
    }

    public func startListening() {
        guard !isListening else { return }
        AVCaptureDevice.requestAccess(for: .audio) { [weak self] micGranted in
            SFSpeechRecognizer.requestAuthorization { [weak self] speechStatus in
                Task { @MainActor in
                    guard let self = self else { return }
                    guard micGranted && (speechStatus == .authorized || speechStatus == .notDetermined) else {
                        self.statusMessage = "Allow Microphone & Speech Recognition in System Settings"
                        self.isListening = false
                        return
                    }
                    self.beginAudioEngineSession()
                }
            }
        }
    }

    private func beginAudioEngineSession() {
        stopAudioEngineInternal()

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        self.recognitionRequest = request
        self.consumedResultTokenOffset = 0
        self.latestRawTokenCount = 0

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        guard recordingFormat.channelCount > 0 else {
            statusMessage = "No active macOS audio input channel detected"
            isListening = false
            return
        }

        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            request.append(buffer)
            let rms = Self.computeBufferRMS(buffer)
            Task { @MainActor [weak self] in
                self?.audioInputLevel = min(1.0, rms * 3.4)
            }
        }

        do {
            audioEngine.prepare()
            try audioEngine.start()
            isListening = true
            statusMessage = "Listening to macOS System Audio Input"
        } catch {
            statusMessage = "Audio Engine Error: \(error.localizedDescription)"
            isListening = false
            return
        }

        recognitionTask = speechRecognizer?.recognitionTask(with: request) { [weak self] result, error in
            let transcriptText = result?.bestTranscription.formattedString
            let isFinal = result?.isFinal ?? false
            let hasError = (error != nil)
            Task { @MainActor [weak self] in
                guard let self = self, self.isListening else { return }
                if let text = transcriptText {
                    let tokens = text.split(whereSeparator: { $0.isWhitespace }).map(String.init)
                    self.latestRawTokenCount = tokens.count
                    if tokens.count < self.consumedResultTokenOffset {
                        self.consumedResultTokenOffset = 0
                    }
                    let unconsumed = tokens.dropFirst(self.consumedResultTokenOffset).joined(separator: " ")
                    if !unconsumed.isEmpty {
                        self.onEvaluateTranscript?(unconsumed)
                    }
                }
                if isFinal || hasError {
                    if self.isListening {
                        self.beginAudioEngineSession()
                    }
                }
            }
        }
    }

    public func stopListening() {
        isListening = false
        audioInputLevel = 0.0
        statusMessage = "System Default Audio Input"
        stopAudioEngineInternal()
    }

    private func stopAudioEngineInternal() {
        if audioEngine.isRunning {
            audioEngine.stop()
        }
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        recognitionTask?.cancel()
        recognitionTask = nil
    }

    nonisolated private static func computeBufferRMS(_ buffer: AVAudioPCMBuffer) -> Double {
        guard let channelData = buffer.floatChannelData else { return 0.0 }
        let frames = Int(buffer.frameLength)
        guard frames > 0 else { return 0.0 }
        let samples = channelData[0]
        var sumSquares: Float = 0.0
        for i in 0..<frames {
            let s = samples[i]
            sumSquares += s * s
        }
        return Double(sqrt(sumSquares / Float(frames)))
    }

    // MARK: - Sequential Phonetic & Fuzzy Word Matcher

    public static let shortStopwords: Set<String> = [
        "a", "an", "the", "to", "in", "on", "at", "of", "for", "and",
        "or", "but", "is", "it", "as", "be", "by", "we", "so", "if",
        "up", "no", "my", "me", "us"
    ]

    public static func isContentWord(_ word: String) -> Bool {
        return word.count >= 3 && !shortStopwords.contains(word)
    }

    public static func normalizeWord(_ raw: String) -> String {
        let lower = raw.lowercased()
        let allowed = lower.unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) }
        return String(String.UnicodeScalarView(allowed))
    }

    public static func extractSpeakableWords(_ markdown: String) -> [String] {
        let stripped = markdown
            .replacingOccurrences(of: "[PAUSE]", with: " ")
            .replacingOccurrences(of: "[BEAT]", with: " ")
            .replacingOccurrences(of: "[BREATHE]", with: " ")
            .replacingOccurrences(of: "==", with: " ")
            .replacingOccurrences(of: "**", with: " ")
            .replacingOccurrences(of: "*", with: " ")
        return stripped
            .split(whereSeparator: { $0.isWhitespace })
            .map { normalizeWord(String($0)) }
            .filter { !$0.isEmpty }
    }

    public static func phoneticSkeleton(_ word: String) -> String {
        guard !word.isEmpty else { return "" }
        let s = word
            .replacingOccurrences(of: "ph", with: "f")
            .replacingOccurrences(of: "gh", with: "g")
            .replacingOccurrences(of: "kn", with: "n")
            .replacingOccurrences(of: "wr", with: "r")
            .replacingOccurrences(of: "sh", with: "s")
            .replacingOccurrences(of: "ch", with: "c")
            .replacingOccurrences(of: "th", with: "t")
            .replacingOccurrences(of: "ck", with: "k")
            .replacingOccurrences(of: "qu", with: "k")
        let chars = Array(s)
        guard let first = chars.first else { return "" }
        let vowels: Set<Character> = ["a", "e", "i", "o", "u", "y"]
        var out: [Character] = [first]
        for ch in chars.dropFirst() {
            if vowels.contains(ch) { continue }
            if out.last != ch {
                out.append(ch)
            }
        }
        return String(out)
    }

    public static func isWordMatch(_ target: String, _ spoken: String) -> Bool {
        if target.isEmpty || spoken.isEmpty { return false }
        if target == spoken { return true }
        if target.count >= 4 && spoken.count >= 4 {
            if target.hasPrefix(spoken) || spoken.hasPrefix(target) {
                return true
            }
            let p1 = phoneticSkeleton(target)
            let p2 = phoneticSkeleton(spoken)
            if p1.count >= 2 && p1 == p2 && abs(target.count - spoken.count) <= 3 {
                return true
            }
        }
        return false
    }

    public static func containsContiguousPhrase(_ beatWords: [String], phrase: [String]) -> Bool {
        guard !phrase.isEmpty, beatWords.count >= phrase.count else { return false }
        let pLen = phrase.count
        for start in 0...(beatWords.count - pLen) {
            var allMatch = true
            for k in 0..<pLen {
                if !isWordMatch(beatWords[start + k], phrase[k]) {
                    allMatch = false
                    break
                }
            }
            if allMatch { return true }
        }
        return false
    }
}

@MainActor
public final class AppCoordinator: ObservableObject {
    public let scriptStore: ScriptStore
    public var settings: SettingsStore
    public let parser: MarkdownScriptParser
    public var navigation: ScriptNavigationController
    public let hotkeys: HotkeyManager
    public let arrowCapture: GlobalArrowCapture
    public let voiceController: VoiceAutoFollowController
    public var voiceFollow: VoiceAutoFollowController { voiceController }

    @Published public var isSectionsPopoverOpen: Bool = false
    @Published public var isToolsPopoverOpen: Bool = false
    @Published public var isThemePopoverOpen: Bool = false
    @Published public var isPreflightSheetOpen: Bool = false
    @Published public var isCheatSheetOpen: Bool = false
    @Published public var editorDraftMarkdown: String
    @Published public var lastSaveError: String? = nil
    @Published public var recoveredBannerMessage: String? = nil

    public var panelController: PanelController?
    private var editorWindow: NSWindow?
    private var cancellables = Set<AnyCancellable>()

    public init(
        scriptStore: ScriptStore = ScriptStore(),
        settings: SettingsStore = SettingsStore(),
        parser: MarkdownScriptParser = MarkdownScriptParser()
    ) {
        self.scriptStore = scriptStore
        self.settings = settings
        self.parser = parser

        let loaded = scriptStore.loadOrInitializeWorkingCopy()
        let parsed = parser.parse(loaded.markdown)
        self.editorDraftMarkdown = loaded.markdown
        self.navigation = ScriptNavigationController(
            document: parsed,
            initialBeatID: settings.activeBeatID
        )
        self.hotkeys = HotkeyManager()
        self.arrowCapture = GlobalArrowCapture()
        self.voiceController = VoiceAutoFollowController()

        if let initialBlock = self.navigation.activeBlock {
            self.voiceController.activeBeatWordTotal = VoiceAutoFollowController.extractSpeakableWords(initialBlock.rawMarkdown).count
        }

        if loaded.recoveredFromBackup {
            self.recoveredBannerMessage = "Recovered working script from LastKnownGood backup."
        }

        bindCallbacks()
    }

    private func bindCallbacks() {
        // Persist activeBeatID and reset spokenWordCount on beat transition
        navigation.$activeBeatID
            .dropFirst()
            .removeDuplicates()
            .sink { [weak self] newBeatID in
                DispatchQueue.main.async { [weak self] in
                    guard let self = self else { return }
                    let totalWords = self.navigation.activeBlock.map {
                        VoiceAutoFollowController.extractSpeakableWords($0.rawMarkdown).count
                    } ?? 0
                    self.voiceController.resetForNewBeat(totalWords: totalWords)
                    if self.settings.activeBeatID != newBeatID {
                        self.settings.activeBeatID = newBeatID
                    }
                }
            }
            .store(in: &cancellables)

        voiceController.onEvaluateTranscript = { [weak self] transcript in
            self?.evaluateLiveVoiceTranscript(transcript)
        }

        // Synchronize AppKit NSPanel & Editor appearance asynchronously outside of SwiftUI view updates
        settings.$themeMode
            .dropFirst()
            .removeDuplicates()
            .sink { [weak self] newMode in
                DispatchQueue.main.async { [weak self] in
                    guard let self = self else { return }
                    self.panelController?.syncThemeAppearance(newMode)
                    self.editorWindow?.appearance = NSAppearance(named: newMode == .dark ? .darkAqua : .aqua)
                }
            }
            .store(in: &cancellables)

        settings.$glassTintPreset
            .combineLatest(settings.$glassTransparency, settings.$windowLayoutMode)
            .dropFirst()
            .sink { [weak self] _, _, _ in
                DispatchQueue.main.async { [weak self] in
                    self?.panelController?.syncGlassMaterialProperties()
                }
            }
            .store(in: &cancellables)

        hotkeys.onAction = { [weak self] action in
            self?.performGlobalAction(action)
        }

        arrowCapture.onBareArrow = { [weak self] action in
            self?.performGlobalAction(action)
        }
    }

    private func evaluateLiveVoiceTranscript(_ transcript: String) {
        guard let activeBlock = navigation.activeBlock, activeBlock.isNavigableBeat else { return }
        let targetWords = VoiceAutoFollowController.extractSpeakableWords(activeBlock.rawMarkdown)
        guard !targetWords.isEmpty else { return }
        voiceController.activeBeatWordTotal = targetWords.count

        let spokenTokens = VoiceAutoFollowController.extractSpeakableWords(transcript)
        guard !spokenTokens.isEmpty else { return }

        let previousMatchedCount = voiceController.spokenWordCount
        var matchedCount = previousMatchedCount
        let recentTokens = Array(spokenTokens.suffix(min(spokenTokens.count, targetWords.count + 14)))

        var sIdx = 0
        while sIdx < recentTokens.count && matchedCount < targetWords.count {
            let token = recentTokens[sIdx]
            let expected = targetWords[matchedCount]

            if VoiceAutoFollowController.isWordMatch(expected, token) {
                matchedCount += 1
                sIdx += 1
                continue
            }

            // Lookahead up to 4 words if a word was mispronounced or skipped
            var advancedViaLookahead = false
            let maxSkip = min(4, targetWords.count - 1 - matchedCount)
            if maxSkip >= 1 {
                for skip in 1...maxSkip {
                    let lookTarget = targetWords[matchedCount + skip]
                    if VoiceAutoFollowController.isWordMatch(lookTarget, token) {
                        let nextExpected = (matchedCount + skip + 1 < targetWords.count) ? targetWords[matchedCount + skip + 1] : nil
                        let nextSpoken = (sIdx + 1 < recentTokens.count) ? recentTokens[sIdx + 1] : nil
                        let confirmed = (nextExpected != nil && nextSpoken != nil && VoiceAutoFollowController.isWordMatch(nextExpected!, nextSpoken!)) || lookTarget.count >= 4
                        if confirmed {
                            matchedCount += skip + 1
                            sIdx += 1
                            advancedViaLookahead = true
                            break
                        }
                    }
                }
            }
            if advancedViaLookahead { continue }

            // Intentional mid-paragraph pickup inside the current beat (3+ consecutive words with >= 2 content words)
            if sIdx + 2 < recentTokens.count && matchedCount + 4 <= targetWords.count {
                var matchedMidCurrent = false
                for tStart in (matchedCount + 2)...(targetWords.count - 3) {
                    if VoiceAutoFollowController.isWordMatch(targetWords[tStart], recentTokens[sIdx]) &&
                       VoiceAutoFollowController.isWordMatch(targetWords[tStart + 1], recentTokens[sIdx + 1]) &&
                       VoiceAutoFollowController.isWordMatch(targetWords[tStart + 2], recentTokens[sIdx + 2]) {
                        let slice = [targetWords[tStart], targetWords[tStart + 1], targetWords[tStart + 2]]
                        if slice.filter({ VoiceAutoFollowController.isContentWord($0) }).count >= 2 {
                            matchedCount = tStart + 3
                            sIdx += 3
                            matchedMidCurrent = true
                            break
                        }
                    }
                }
                if matchedMidCurrent { continue }
            }

            sIdx += 1
        }

        let didAdvanceCurrent = matchedCount > previousMatchedCount
        if didAdvanceCurrent {
            voiceController.spokenWordCount = matchedCount
        }

        let isFinished = matchedCount >= targetWords.count ||
            (targetWords.count >= 5 && matchedCount >= targetWords.count - 1 && Double(matchedCount) / Double(targetWords.count) >= 0.88)

        if isFinished {
            navigation.nextBeat()
            return
        }

        // Check if speaker started reading the next paragraph (either from the beginning OR directly from the middle)
        // with ambiguity protection against currentBeat and similar-looking paragraphs in the active section.
        let isNearEndOfCurrent = matchedCount >= max(1, targetWords.count - 2)
        if !didAdvanceCurrent || isNearEndOfCurrent {
            let allBeats = navigation.document.allNavigableBeats
            if let currentIdx = allBeats.firstIndex(where: { $0.id == activeBlock.id }),
               currentIdx + 1 < allBeats.count {
                // Find the immediate next navigable beat (and next spoken beat)
                var candidateBeats: [ScriptBlock] = [allBeats[currentIdx + 1]]
                for lookIdx in (currentIdx + 1)..<min(allBeats.count, currentIdx + 4) {
                    if allBeats[lookIdx].kind == .spokenLine && !candidateBeats.contains(where: { $0.id == allBeats[lookIdx].id }) {
                        candidateBeats.append(allBeats[lookIdx])
                        break
                    }
                }

                let tail = Array(spokenTokens.suffix(12))
                let currentContentWords = Set(targetWords.filter { VoiceAutoFollowController.isContentWord($0) })
                let sectionBeats = navigation.activeSection?.blocks.filter { $0.kind == .spokenLine } ?? []

                for candidate in candidateBeats {
                    let candWords = VoiceAutoFollowController.extractSpeakableWords(candidate.rawMarkdown)
                    guard !candWords.isEmpty else { continue }

                    var bestEndIdx = 0
                    var bestPhrase: [String] = []
                    var bestStartOffset = 0

                    for sStart in 0..<tail.count {
                        for cStart in 0..<candWords.count {
                            guard VoiceAutoFollowController.isWordMatch(candWords[cStart], tail[sStart]) else { continue }
                            var cPos = cStart + 1
                            var tPos = sStart + 1
                            while tPos < tail.count && cPos < candWords.count && VoiceAutoFollowController.isWordMatch(candWords[cPos], tail[tPos]) {
                                cPos += 1
                                tPos += 1
                            }
                            let matchedLen = cPos - cStart
                            let phrase = Array(candWords[cStart..<cPos])
                            let contentCount = phrase.filter { VoiceAutoFollowController.isContentWord($0) }.count
                            let distinctiveCount = phrase.filter { $0.count >= 5 && VoiceAutoFollowController.isContentWord($0) }.count

                            let validStart = (cStart <= 1 && matchedLen >= 2 && contentCount >= 1)
                            let validMiddle = (cStart >= 2 && ((matchedLen >= 3 && contentCount >= 2) || (matchedLen >= 2 && contentCount >= 2 && distinctiveCount >= 1)))

                            if (validStart || validMiddle) && matchedLen > bestPhrase.count {
                                bestPhrase = phrase
                                bestEndIdx = cPos
                                bestStartOffset = cStart
                            }
                        }
                    }

                    if !bestPhrase.isEmpty {
                        // Ambiguity Guard 1: Phrase must not appear contiguously in currentBeat
                        let inCurrentBeat = VoiceAutoFollowController.containsContiguousPhrase(targetWords, phrase: bestPhrase)
                        // Ambiguity Guard 2: If mid-paragraph, phrase must contain at least 1 content word not in currentBeat
                        let hasUniqueContentWord = bestPhrase.contains { w in
                            VoiceAutoFollowController.isContentWord(w) && !currentContentWords.contains(w)
                        }
                        // Ambiguity Guard 3: Check other beats in the selected section for duplicate template phrases
                        let duplicatedInSection = sectionBeats.contains { other in
                            guard other.id != candidate.id && other.id != activeBlock.id else { return false }
                            let otherWords = VoiceAutoFollowController.extractSpeakableWords(other.rawMarkdown)
                            return VoiceAutoFollowController.containsContiguousPhrase(otherWords, phrase: bestPhrase)
                        }

                        let passesAmbiguityGuards = !inCurrentBeat &&
                            (bestStartOffset <= 1 || hasUniqueContentWord) &&
                            (!duplicatedInSection || bestPhrase.count >= 4)

                        if passesAmbiguityGuards {
                            voiceController.pendingJumpWordCount = candWords.count > 1 ? min(candWords.count - 1, bestEndIdx) : bestEndIdx
                            navigation.selectBeat(candidate.id)
                            return
                        }
                    }
                }
            }
        }
    }

    public func start() {
        guard panelController == nil else {
            panelController?.showPanel()
            return
        }
        hotkeys.registerAll()
        let controller = PanelController(coordinator: self)
        self.panelController = controller
        controller.showPanel()
    }

    public func teardown() {
        voiceController.stopListening()
        hotkeys.unregisterAll()
        arrowCapture.emergencyDisable()
    }

    public func performGlobalAction(_ action: GlobalChordAction) {
        switch action {
        case .nextBeat:
            navigation.nextBeat()
        case .previousBeat:
            navigation.previousBeat()
        case .nextSection:
            navigation.nextMainSection()
        case .previousSection:
            navigation.previousMainSection()
        case .toggleCollapse:
            toggleCollapse()
        case .nearCamera:
            panelController?.positionNearCamera()
        }
    }

    public func toggleCollapse() {
        let nextState = !settings.isCollapsedToBubble
        settings.isCollapsedToBubble = nextState
        DispatchQueue.main.async { [weak self] in
            self?.panelController?.syncCollapseState(isBubble: nextState)
        }
    }

    public func closeTransientPopovers() {
        isSectionsPopoverOpen = false
        isToolsPopoverOpen = false
        isThemePopoverOpen = false
        isPreflightSheetOpen = false
        isCheatSheetOpen = false
    }

    public func applyEditedMarkdown(_ newMarkdown: String, label: String = "Manual Save") {
        editorDraftMarkdown = newMarkdown
        let parsed = parser.parse(newMarkdown)
        navigation.updateDocument(parsed)
        do {
            _ = try scriptStore.saveWorkingCopy(newMarkdown, label: label)
            lastSaveError = nil
        } catch {
            lastSaveError = error.localizedDescription
        }
    }

    public func restoreBundledOriginalScript() {
        do {
            let original = try scriptStore.restoreBundledOriginal()
            editorDraftMarkdown = original
            let parsed = parser.parse(original)
            navigation.updateDocument(parsed)
            lastSaveError = nil
        } catch {
            lastSaveError = error.localizedDescription
        }
    }

    public func openEditorWindow() {
        arrowCapture.suspendForEditor(true)
        if let existing = editorWindow {
            existing.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }

        let editorView = ScriptEditorView(coordinator: self)
        let hostingController = NSHostingController(rootView: editorView)
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 960, height: 660),
            styleMask: [.titled, .closable, .resizable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.tabbingMode = .disallowed
        window.title = "Pathfinder Glass — Script Editor & Versions"
        window.appearance = NSAppearance(named: settings.themeMode == .dark ? .darkAqua : .aqua)
        window.contentViewController = hostingController
        window.center()
        window.isReleasedWhenClosed = false

        NotificationCenter.default.addObserver(
            forName: NSWindow.willCloseNotification,
            object: window,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                guard let self = self else { return }
                self.applyEditedMarkdown(self.editorDraftMarkdown, label: "Editor Close Save")
                self.arrowCapture.suspendForEditor(false)
            }
        }

        self.editorWindow = window
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}

public struct RootOverlayContainerView: View {
    @ObservedObject public var coordinator: AppCoordinator
    @ObservedObject private var settings: SettingsStore

    public init(coordinator: AppCoordinator) {
        self.coordinator = coordinator
        self.settings = coordinator.settings
    }

    public var body: some View {
        Group {
            if settings.isCollapsedToBubble {
                CollapsedBubbleView(coordinator: coordinator)
            } else {
                ReadingPanelView(coordinator: coordinator)
            }
        }
    }
}
