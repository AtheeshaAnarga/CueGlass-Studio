import Foundation
import AppKit
import SwiftUI
import Combine
import AVFoundation
import Speech

public struct AudioInputDeviceItem: Identifiable, Hashable, Sendable {
    public let id: String
    public let name: String

    public init(id: String, name: String) {
        self.id = id
        self.name = name
    }
}

/// Non-isolated CoreAudio & Speech Recognition worker.
/// CRITICAL: Keeping `AVAudioEngine.inputNode.installTap`, `AVCaptureDevice.requestAccess`,
/// `SFSpeechRecognizer.requestAuthorization`, and `recognitionTask` inside a `nonisolated` class
/// ensures Swift 6 never synthesizes a `@MainActor` runtime executor assertion (`_swift_task_checkIsolated`)
/// on CoreAudio's real-time audio IO thread or TCC/Speech background queues.
///
/// BUFFER & CRASH SAFETY ARCHITECTURE:
/// 1. `AVAudioEngine` and its `inputNode` tap are installed ONCE per listening session and kept running
///    continuously. We NEVER stop `AVAudioEngine` or remove/re-install the tap during speech task rollovers,
///    eliminating CoreAudio real-time thread races (`AVAudioEngineImpl::RemoveTapOnNode`).
/// 2. The active `SFSpeechAudioBufferRecognitionRequest` pointer is swapped atomically under `requestLock`
///    every ~42 seconds (or at beat boundaries after 18s) so the speech buffer never overloads or hits
///    Apple's 60-second per-task wall.
/// 3. Each `SFSpeechRecognitionTask` is tagged with a monotonically increasing `taskGeneration: UInt64`
///    so asynchronous cancellation/error callbacks from retired tasks are strictly ignored and can never
///    trigger recursive restart storms.
private final class AudioSpeechCaptureWorker: @unchecked Sendable {
    private let audioEngine = AVAudioEngine()
    private let requestLock = NSLock()
    private var activeRecognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))

    private var isTapInstalled: Bool = false
    private var isSessionActive: Bool = false
    private var taskGeneration: UInt64 = 0
    private var taskStartedTimestamp: CFAbsoluteTime = 0
    private var rolloverTimer: Timer?
    private var configChangeObserver: NSObjectProtocol?

    private var lastLevelUpdateTimestamp: CFAbsoluteTime = 0
    private var isLevelUpdatePending: Bool = false

    var onAudioLevel: ((Double) -> Void)?
    var onTranscriptResult: ((String) -> Void)?
    var onTaskRotated: (() -> Void)?
    var onStatusChange: ((String, Bool) -> Void)?

    init() {}

    deinit {
        if let observer = configChangeObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    func requestPermissionsAndStart() {
        let currentAudioAuth = AVCaptureDevice.authorizationStatus(for: .audio)
        if currentAudioAuth == .denied || currentAudioAuth == .restricted {
            DispatchQueue.main.async { [weak self] in
                self?.onStatusChange?("Allow Microphone access in System Settings > Privacy & Security", false)
            }
            return
        }

        AVCaptureDevice.requestAccess(for: .audio) { [weak self] micGranted in
            guard let self = self else { return }
            guard micGranted else {
                DispatchQueue.main.async { [weak self] in
                    self?.onStatusChange?("Microphone permission denied — allow in System Settings", false)
                }
                return
            }

            SFSpeechRecognizer.requestAuthorization { [weak self] speechStatus in
                guard let self = self else { return }
                guard speechStatus == .authorized || speechStatus == .notDetermined else {
                    DispatchQueue.main.async { [weak self] in
                        self?.onStatusChange?("Allow Speech Recognition in System Settings > Privacy & Security", false)
                    }
                    return
                }

                DispatchQueue.main.async { [weak self] in
                    self?.startEngineOnMainQueue()
                }
            }
        }
    }

    func startEngineOnMainQueue() {
        stopInternal()

        guard let recognizer = speechRecognizer, recognizer.isAvailable else {
            onStatusChange?("Apple Speech Recognizer is currently unavailable on this Mac", false)
            return
        }

        let inputNode = audioEngine.inputNode
        let outFormat = inputNode.outputFormat(forBus: 0)
        let inFormat = inputNode.inputFormat(forBus: 0)

        guard (outFormat.channelCount > 0 && outFormat.sampleRate > 0) ||
              (inFormat.channelCount > 0 && inFormat.sampleRate > 0) else {
            onStatusChange?("No active macOS audio input channel detected", false)
            return
        }

        // Passing `nil` as format binds safely to the inputNode's native hardware output bus format
        // and prevents sample-rate mismatch NSExceptions during audio route changes.
        inputNode.installTap(onBus: 0, bufferSize: 2048, format: nil) { [weak self] buffer, _ in
            guard let self = self, buffer.frameLength > 0 else { return }

            self.requestLock.lock()
            let currentRequest = self.activeRecognitionRequest
            let now = CFAbsoluteTimeGetCurrent()
            let shouldComputeLevel = !self.isLevelUpdatePending && (now - self.lastLevelUpdateTimestamp >= 0.08)
            if shouldComputeLevel {
                self.lastLevelUpdateTimestamp = now
                self.isLevelUpdatePending = true
            }
            self.requestLock.unlock()

            currentRequest?.append(buffer)

            if shouldComputeLevel {
                let rms = Self.computeBufferRMS(buffer)
                let scaled = min(1.0, rms * 3.6)
                DispatchQueue.main.async { [weak self] in
                    guard let self = self else { return }
                    self.requestLock.lock()
                    self.isLevelUpdatePending = false
                    self.requestLock.unlock()
                    self.onAudioLevel?(scaled)
                }
            }
        }
        self.isTapInstalled = true

        do {
            audioEngine.prepare()
            try audioEngine.start()
            self.isSessionActive = true
            onStatusChange?("Listening to macOS System Audio Input", true)
        } catch {
            stopInternal()
            onStatusChange?("Audio Input Error: \(error.localizedDescription)", false)
            return
        }

        // Observe hardware audio route changes so AVAudioEngine recovers cleanly if headphones/mic change
        configChangeObserver = NotificationCenter.default.addObserver(
            forName: .AVAudioEngineConfigurationChange,
            object: audioEngine,
            queue: .main
        ) { [weak self] _ in
            guard let self = self, self.isSessionActive else { return }
            self.startEngineOnMainQueue()
        }

        rotateRecognitionTaskOnMainQueue()
        startRolloverWatchdogOnMainQueue()
    }

    /// Proactively rotates the recognition request at paragraph boundaries if the buffer has been accumulating for >= `minAgeSeconds`.
    func rotateIfOlderThan(seconds minAgeSeconds: CFAbsoluteTime) {
        guard isSessionActive else { return }
        let age = CFAbsoluteTimeGetCurrent() - taskStartedTimestamp
        if age >= minAgeSeconds {
            rotateRecognitionTaskOnMainQueue()
        }
    }

    /// Swaps in a fresh `SFSpeechAudioBufferRecognitionRequest` and `SFSpeechRecognitionTask`
    /// without stopping `AVAudioEngine` or touching the audio tap.
    private func rotateRecognitionTaskOnMainQueue() {
        guard isSessionActive else { return }
        guard let recognizer = speechRecognizer, recognizer.isAvailable else { return }

        // 1. Advance generation FIRST so any completion/cancellation callback from the retiring task is ignored
        self.taskGeneration &+= 1
        let generation = self.taskGeneration

        // 2. Detach & close the previous request and task cleanly
        requestLock.lock()
        let oldRequest = self.activeRecognitionRequest
        self.activeRecognitionRequest = nil
        requestLock.unlock()

        oldRequest?.endAudio()
        let oldTask = self.recognitionTask
        self.recognitionTask = nil
        oldTask?.cancel()

        // 3. Create a fresh buffer request and swap it into the live audio tap under lock
        let newRequest = SFSpeechAudioBufferRecognitionRequest()
        newRequest.shouldReportPartialResults = true
        newRequest.taskHint = .dictation
        if #available(macOS 13.0, *) {
            newRequest.addsPunctuation = false
        }

        requestLock.lock()
        self.activeRecognitionRequest = newRequest
        requestLock.unlock()

        self.taskStartedTimestamp = CFAbsoluteTimeGetCurrent()
        self.onTaskRotated?()

        // 4. Start the new recognition task guarded by `generation`
        self.recognitionTask = recognizer.recognitionTask(with: newRequest) { [weak self] result, error in
            guard let self = self else { return }
            let text = result?.bestTranscription.formattedString
            let isFinal = result?.isFinal ?? false
            let hasError = (error != nil)
            DispatchQueue.main.async { [weak self] in
                guard let self = self, self.isSessionActive, generation == self.taskGeneration else { return }
                self.handleTaskCallbackOnMainQueue(
                    text: text,
                    isFinal: isFinal,
                    hasError: hasError,
                    generation: generation
                )
            }
        }
    }

    private func handleTaskCallbackOnMainQueue(
        text: String?,
        isFinal: Bool,
        hasError: Bool,
        generation: UInt64
    ) {
        guard isSessionActive, generation == self.taskGeneration else { return }

        if let validText = text, !validText.isEmpty {
            onTranscriptResult?(validText)
        }

        if isFinal {
            rotateRecognitionTaskOnMainQueue()
        } else if hasError {
            // Retire current task immediately and schedule a single debounced rotation after 250ms
            // so transient Speech errors or silence timeouts can never cause a tight restart loop.
            self.taskGeneration &+= 1
            let retryGeneration = self.taskGeneration

            requestLock.lock()
            let failedReq = self.activeRecognitionRequest
            self.activeRecognitionRequest = nil
            requestLock.unlock()

            failedReq?.endAudio()
            let failedTask = self.recognitionTask
            self.recognitionTask = nil
            failedTask?.cancel()

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                guard let self = self, self.isSessionActive, self.taskGeneration == retryGeneration else { return }
                self.rotateRecognitionTaskOnMainQueue()
            }
        }
    }

    private func startRolloverWatchdogOnMainQueue() {
        rolloverTimer?.invalidate()
        rolloverTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            guard let self = self, self.isSessionActive else { return }
            // Proactively roll over the recognition buffer at 42s (well before Apple's ~60s limit)
            if CFAbsoluteTimeGetCurrent() - self.taskStartedTimestamp >= 42.0 {
                self.rotateRecognitionTaskOnMainQueue()
            }
        }
    }

    func stop() {
        isSessionActive = false
        stopInternal()
    }

    private func stopInternal() {
        self.taskGeneration &+= 1
        rolloverTimer?.invalidate()
        rolloverTimer = nil

        if let observer = configChangeObserver {
            NotificationCenter.default.removeObserver(observer)
            configChangeObserver = nil
        }

        requestLock.lock()
        let currentReq = self.activeRecognitionRequest
        self.activeRecognitionRequest = nil
        self.isLevelUpdatePending = false
        requestLock.unlock()

        currentReq?.endAudio()
        let currentTask = self.recognitionTask
        self.recognitionTask = nil
        currentTask?.cancel()

        if audioEngine.isRunning {
            audioEngine.stop()
        }
        if isTapInstalled {
            audioEngine.inputNode.removeTap(onBus: 0)
            isTapInstalled = false
        }
        audioEngine.reset()
    }

    private static func computeBufferRMS(_ buffer: AVAudioPCMBuffer) -> Double {
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
}

/// Native macOS System Audio Input & Siri Dictation Voice Auto-Follow Engine
@MainActor
public final class VoiceAutoFollowController: ObservableObject, @unchecked Sendable {
    @Published public var isListening: Bool = false
    @Published public var spokenWordCount: Int = 0
    @Published public var activeBeatWordTotal: Int = 0
    @Published public var audioInputLevel: Double = 0.0
    @Published public var statusMessage: String = "System Default Audio Input"
    @Published public var lastMatchedVoiceWord: String = ""
    @Published public var availableAudioDevices: [AudioInputDeviceItem] = []
    @Published public var selectedAudioDeviceID: String = "default"

    private let worker = AudioSpeechCaptureWorker()
    private var consumedResultTokenOffset: Int = 0
    private var latestRawTokenCount: Int = 0
    private var lastEvaluatedTail: String = ""
    public var pendingJumpWordCount: Int = 0

    public var onEvaluateTranscript: ((String) -> Void)?

    public init() {
        refreshAudioDevices()
        worker.onAudioLevel = { [weak self] level in
            guard let self = self, self.isListening else { return }
            self.audioInputLevel = level
        }
        worker.onStatusChange = { [weak self] message, listening in
            guard let self = self else { return }
            self.statusMessage = message
            self.isListening = listening
            if !listening {
                self.audioInputLevel = 0.0
            }
        }
        worker.onTaskRotated = { [weak self] in
            guard let self = self else { return }
            // A fresh SFSpeechAudioBufferRecognitionRequest started with an empty transcript buffer.
            // Reset only the raw buffer offset while preserving spokenWordCount on the active beat.
            self.consumedResultTokenOffset = 0
            self.latestRawTokenCount = 0
            self.lastEvaluatedTail = ""
        }
        worker.onTranscriptResult = { [weak self] transcriptText in
            guard let self = self, self.isListening else { return }
            let tokens = transcriptText.split(whereSeparator: { $0.isWhitespace }).map(String.init)
            self.latestRawTokenCount = tokens.count

            // If SFSpeechRecognizer revised a partial hypothesis (e.g. "going to" -> "gonna"),
            // clamp offset to the end of the buffer instead of resetting to 0 (which would re-feed old paragraphs).
            if tokens.count < self.consumedResultTokenOffset {
                self.consumedResultTokenOffset = max(0, tokens.count - 1)
            }

            // Cap the unconsumed sliding window to at most 16 words so off-script speech never accumulates.
            if tokens.count - self.consumedResultTokenOffset > 16 {
                self.consumedResultTokenOffset = tokens.count - 16
            }

            let unconsumedTokens = tokens.dropFirst(self.consumedResultTokenOffset)
            guard !unconsumedTokens.isEmpty else { return }

            let unconsumed = unconsumedTokens.joined(separator: " ")
            guard unconsumed != self.lastEvaluatedTail else { return }
            self.lastEvaluatedTail = unconsumed

            self.onEvaluateTranscript?(unconsumed)
        }
    }

    /// Drains `count` matched tokens from the front of the unconsumed speech buffer so matched words
    /// are never re-evaluated against later words in the same paragraph.
    public func advanceConsumedOffset(by count: Int) {
        guard count > 0 else { return }
        consumedResultTokenOffset = min(latestRawTokenCount, consumedResultTokenOffset + count)
    }

    public func refreshAudioDevices() {
        var items: [AudioInputDeviceItem] = [
            AudioInputDeviceItem(id: "default", name: "System Default Audio Input (macOS Sound Settings)")
        ]
        let discovery = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.microphone, .external],
            mediaType: .audio,
            position: .unspecified
        )
        for dev in discovery.devices {
            items.append(AudioInputDeviceItem(id: dev.uniqueID, name: dev.localizedName))
        }
        self.availableAudioDevices = items
        if !items.contains(where: { $0.id == selectedAudioDeviceID }) {
            self.selectedAudioDeviceID = "default"
        }
    }

    public func resetForNewBeat(totalWords: Int = 0) {
        consumedResultTokenOffset = latestRawTokenCount
        lastEvaluatedTail = ""
        activeBeatWordTotal = totalWords
        lastMatchedVoiceWord = ""
        if pendingJumpWordCount > 0 {
            spokenWordCount = pendingJumpWordCount
            pendingJumpWordCount = 0
        } else {
            spokenWordCount = 0
        }
        // Proactively rotate the speech recognition buffer at beat boundaries if it is >= 18s old
        worker.rotateIfOlderThan(seconds: 18.0)
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
        statusMessage = "Starting macOS Audio Input…"
        consumedResultTokenOffset = 0
        latestRawTokenCount = 0
        lastEvaluatedTail = ""
        worker.requestPermissionsAndStart()
    }

    public func stopListening() {
        isListening = false
        audioInputLevel = 0.0
        lastMatchedVoiceWord = ""
        lastEvaluatedTail = ""
        statusMessage = "System Default Audio Input"
        worker.stop()
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
public final class AppCoordinator: ObservableObject, @unchecked Sendable {
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
    @Published public var isPreflightSheetOpen: Bool = false {
        didSet {
            if isPreflightSheetOpen {
                isPreflightSheetOpen = false
                openPreflightWindow()
            }
        }
    }
    @Published public var isCheatSheetOpen: Bool = false {
        didSet {
            if isCheatSheetOpen {
                isCheatSheetOpen = false
                openSettingsWindow()
            }
        }
    }
    @Published public var editorDraftMarkdown: String
    @Published public var lastSaveError: String? = nil
    @Published public var recoveredBannerMessage: String? = nil

    public var panelController: PanelController?
    private var editorWindow: NSWindow?
    private var settingsWindow: NSWindow?
    private var preflightWindow: NSWindow?
    private var cancellables = Set<AnyCancellable>()

    public init(
        scriptStore: ScriptStore = ScriptStore(),
        settings: SettingsStore? = nil,
        parser: MarkdownScriptParser = MarkdownScriptParser()
    ) {
        let resolvedSettings = settings ?? SettingsStore()
        self.scriptStore = scriptStore
        self.settings = resolvedSettings
        self.parser = parser

        let loaded = scriptStore.loadOrInitializeWorkingCopy()
        let parsed = parser.parse(loaded.markdown)
        self.editorDraftMarkdown = loaded.markdown
        self.navigation = ScriptNavigationController(
            document: parsed,
            initialBeatID: resolvedSettings.activeBeatID
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

        // Synchronize AppKit NSPanel & Standalone Windows appearance asynchronously
        settings.$themeMode
            .dropFirst()
            .removeDuplicates()
            .sink { [weak self] newMode in
                DispatchQueue.main.async { [weak self] in
                    guard let self = self else { return }
                    let appAppearance = NSAppearance(named: newMode == .dark ? .darkAqua : .aqua)
                    self.panelController?.syncThemeAppearance(newMode)
                    self.editorWindow?.appearance = appAppearance
                    self.settingsWindow?.appearance = appAppearance
                    self.preflightWindow?.appearance = appAppearance
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
        var latestMatchedWord = voiceController.lastMatchedVoiceWord
        let recentTokens = Array(spokenTokens.suffix(16))

        var sIdx = 0
        var lastConsumedTokenIdx = 0
        while sIdx < recentTokens.count && matchedCount < targetWords.count {
            let token = recentTokens[sIdx]
            let expected = targetWords[matchedCount]

            if VoiceAutoFollowController.isWordMatch(expected, token) {
                latestMatchedWord = expected
                matchedCount += 1
                sIdx += 1
                lastConsumedTokenIdx = sIdx
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
                            latestMatchedWord = lookTarget
                            matchedCount += skip + 1
                            sIdx += 1
                            lastConsumedTokenIdx = sIdx
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
                            latestMatchedWord = targetWords[tStart + 2]
                            matchedCount = tStart + 3
                            sIdx += 3
                            lastConsumedTokenIdx = sIdx
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
            voiceController.lastMatchedVoiceWord = latestMatchedWord
            if lastConsumedTokenIdx > 0 {
                voiceController.advanceConsumedOffset(by: lastConsumedTokenIdx)
            }
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
            let allBeats = navigation.document.liveFlowBeats
            if let currentIdx = allBeats.firstIndex(where: { $0.id == activeBlock.id }),
               currentIdx + 1 < allBeats.count {
                var candidateBeats: [ScriptBlock] = [allBeats[currentIdx + 1]]
                for lookIdx in (currentIdx + 1)..<min(allBeats.count, currentIdx + 4) {
                    if allBeats[lookIdx].kind == .speech && !candidateBeats.contains(where: { $0.id == allBeats[lookIdx].id }) {
                        candidateBeats.append(allBeats[lookIdx])
                        break
                    }
                }

                let unconsumedForNext = Array(recentTokens.dropFirst(lastConsumedTokenIdx))
                let tail = Array((unconsumedForNext.isEmpty ? recentTokens : unconsumedForNext).suffix(12))
                guard !tail.isEmpty else { return }

                let currentContentWords = Set(targetWords.filter { VoiceAutoFollowController.isContentWord($0) })
                let sectionBeats = navigation.activeSection?.blocks.filter { $0.kind == .speech } ?? []

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
                        let inCurrentBeat = VoiceAutoFollowController.containsContiguousPhrase(targetWords, phrase: bestPhrase)
                        let hasUniqueContentWord = bestPhrase.contains { w in
                            VoiceAutoFollowController.isContentWord(w) && !currentContentWords.contains(w)
                        }
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
        settingsWindow?.orderOut(nil)
        preflightWindow?.orderOut(nil)
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

    public func openSettingsWindow() {
        closeTransientPopovers()
        voiceController.refreshAudioDevices()
        if let existing = settingsWindow {
            existing.appearance = NSAppearance(named: settings.themeMode == .dark ? .darkAqua : .aqua)
            existing.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }

        let settingsView = SettingsView(coordinator: self)
        let hostingController = NSHostingController(rootView: settingsView)
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 720, height: 640),
            styleMask: [.titled, .closable, .resizable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.minSize = NSSize(width: 600, height: 480)
        window.tabbingMode = .disallowed
        window.title = "CueGlass Studio — Tahoe Liquid Glass Cap Settings & Voice Follow"
        window.appearance = NSAppearance(named: settings.themeMode == .dark ? .darkAqua : .aqua)
        window.contentViewController = hostingController
        window.center()
        window.isReleasedWhenClosed = false
        window.level = .floating

        self.settingsWindow = window
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    public func closeSettingsWindow() {
        settingsWindow?.orderOut(nil)
    }

    public func openPreflightWindow() {
        closeTransientPopovers()
        if let existing = preflightWindow {
            existing.appearance = NSAppearance(named: settings.themeMode == .dark ? .darkAqua : .aqua)
            existing.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }

        let preflightView = PreflightView(coordinator: self)
        let hostingController = NSHostingController(rootView: preflightView)
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 640, height: 520),
            styleMask: [.titled, .closable, .resizable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.minSize = NSSize(width: 520, height: 400)
        window.tabbingMode = .disallowed
        window.title = "CueGlass Studio — Preflight Readiness & Zoom Safety Check"
        window.appearance = NSAppearance(named: settings.themeMode == .dark ? .darkAqua : .aqua)
        window.contentViewController = hostingController
        window.center()
        window.isReleasedWhenClosed = false
        window.level = .floating

        self.preflightWindow = window
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    public func closePreflightWindow() {
        preflightWindow?.orderOut(nil)
    }

    public func openEditorWindow() {
        arrowCapture.suspendForEditor(true)
        if let existing = editorWindow {
            existing.appearance = NSAppearance(named: settings.themeMode == .dark ? .darkAqua : .aqua)
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
        window.minSize = NSSize(width: 720, height: 480)
        window.tabbingMode = .disallowed
        window.title = "CueGlass Studio — Script Editor & Versions"
        window.appearance = NSAppearance(named: settings.themeMode == .dark ? .darkAqua : .aqua)
        window.contentViewController = hostingController
        window.center()
        window.isReleasedWhenClosed = false
        window.level = .floating

        NotificationCenter.default.addObserver(
            forName: NSWindow.willCloseNotification,
            object: window,
            queue: .main
        ) { [weak self] _ in
            DispatchQueue.main.async { [weak self] in
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
