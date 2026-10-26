import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Zap,
  Edit3,
  Keyboard,
  Minimize2,
  AlignLeft,
  Crosshair,
  AlertTriangle,
  FastForward,
  RotateCcw,
  Info,
  HelpCircle,
  Code2,
  Video,
  MessageSquare,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  Settings,
  Sun,
  Moon,
  Sparkles,
  Copy,
  Clock,
  Monitor,
  Mic,
  Play,
  Square,
  Maximize2,
  Layers,
  Droplets,
} from 'lucide-react';
import { parseMarkdownScript } from './core/parser';
import {
  evaluateThreeBeatWindow,
  extractSpeakableWords,
  getThreeBeatWindow,
} from './core/voiceTracker';
import {
  createInitialNavState,
  getActiveBlock,
  getActiveSection,
  getBeatPositionInSection,
  getPendingThankSpeakerWaypoint,
  invokeSnippet,
  jumpToSectionById,
  jumpToThanksWaypoint,
  NavigationState,
  remapNavStateAfterEdit,
  returnToLiveBeat,
  selectBeatById,
  stepNextBeat,
  stepNextSection,
  stepPrevBeat,
  stepPrevSection,
} from './core/navigation';
import {
  clampWindowFrame,
  COLLAPSED_BUBBLE_SIZE,
  computeNearCameraBubbleFrame,
  computeNearCameraFrame,
  DEFAULT_EXPANDED_SIZE,
} from './core/geometry';
import { InMemoryOrLocalScriptStore } from './core/store';
import {
  AppleGlassTintPreset,
  AppleGlassVariant,
  EmergencySnippet,
  FontWeightOption,
  ScriptBlock,
  ScriptBlockKind,
  WindowLayoutMode,
  WindowRect,
} from './core/types';
import { UNIVERSAL_AI_MASTER_PROMPT } from './core/canonicalScript';
import { RichTextRenderer } from './components/RichTextRenderer';
import { SectionsPalette } from './components/SectionsPalette';
import { QuickReferencePopover } from './components/QuickReferencePopover';
import { PreflightModal } from './components/PreflightModal';
import { ScriptEditorModal } from './components/ScriptEditorModal';
import { ShortcutsSettingsModal } from './components/ShortcutsSettingsModal';
import { NativeXcodeModal } from './components/NativeXcodeModal';
import { AIPromptGuideModal } from './components/AIPromptGuideModal';

const TOP_MENU_BAR_HEIGHT = 34;

export default function App() {
  const storeRef = useRef<InMemoryOrLocalScriptStore>(
    new InMemoryOrLocalScriptStore()
  );
  const initialStoreSnap = useMemo(
    () => storeRef.current.loadOrInitialize(),
    []
  );

  const [workingMarkdown, setWorkingMarkdown] = useState<string>(
    initialStoreSnap.workingMarkdown
  );
  const [revisions, setRevisions] = useState(initialStoreSnap.revisions);
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);

  const document = useMemo(
    () => parseMarkdownScript(workingMarkdown),
    [workingMarkdown]
  );

  // Persistent Liquid Glass Theme ('light' | 'dark') — Default is Apple Liquid Glass Light
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const saved =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('cg.themeMode')
        : null;
    return saved === 'dark' ? 'dark' : 'light';
  });

  // Persistent Window Surface Layout Mode ('fullLiquidGlass' | 'classicCard')
  const [windowLayoutMode, setWindowLayoutMode] = useState<WindowLayoutMode>(
    () => {
      const saved =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('cg.windowLayoutMode')
          : null;
      return saved === 'classicCard' ? 'classicCard' : 'fullLiquidGlass';
    }
  );

  // Official Apple macOS 26 Tahoe Glass struct properties:
  // Defaults to Original Apple Clear Liquid Glass (Glass.clear)
  const [glassVariant, setGlassVariant] = useState<AppleGlassVariant>(() => {
    const saved =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('cg.glassVariant')
        : null;
    return saved === 'regular' || saved === 'identity' ? saved : 'clear';
  });

  const [glassTintPreset, setGlassTintPreset] = useState<AppleGlassTintPreset>(
    () => {
      const saved =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('cg.glassTintPreset')
          : null;
      return saved === 'tahoeBlue' ||
        saved === 'ultraviolet' ||
        saved === 'emeraldMist' ||
        saved === 'amberGold'
        ? saved
        : 'crystalNeutral';
    }
  );

  const [glassInteractive, setGlassInteractive] = useState<boolean>(() => {
    const saved =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('cg.glassInteractive')
        : null;
    return saved === 'false' ? false : true;
  });

  // Persistent Auto Voice Follow Spoken Word Darkening Settings
  const [voiceDarkenWords, setVoiceDarkenWords] = useState<boolean>(() => {
    const saved =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('cg.voiceDarkenWords')
        : null;
    return saved === 'false' ? false : true;
  });

  const [voiceDarkenOpacity, setVoiceDarkenOpacity] = useState<number>(() => {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('cg.voiceDarkenOpacity')
        : null;
    if (raw === null) return 32;
    const saved = Number(raw);
    return !Number.isNaN(saved) && saved >= 15 && saved <= 75 ? saved : 32;
  });

  const [voiceShowTargetUnderline, setVoiceShowTargetUnderline] =
    useState<boolean>(() => {
      const saved =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('cg.voiceShowTargetUnderline')
          : null;
      return saved === 'false' ? false : true;
    });

  // Persistent Cap Settings: Liquidness, Transparency, Glass Effect Level, Font Boldness, Font Size, Line Height, Active Beat Glow
  const [liquidness, setLiquidness] = useState<number>(() => {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('cg.liquidness')
        : null;
    if (raw === null) return 86;
    const saved = Number(raw);
    return !Number.isNaN(saved) && saved >= 10 && saved <= 100 ? saved : 86;
  });

  const [transparency, setTransparency] = useState<number>(() => {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('cg.transparency')
        : null;
    if (raw === null) return 82;
    const saved = Number(raw);
    return !Number.isNaN(saved) && saved >= 10 && saved <= 95 ? saved : 82;
  });

  const [glassEffectLevel, setGlassEffectLevel] = useState<number>(() => {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('cg.glassEffectLevel')
        : null;
    if (raw === null) return 90;
    const saved = Number(raw);
    return !Number.isNaN(saved) && saved >= 15 && saved <= 100 ? saved : 90;
  });

  const [fontWeight, setFontWeight] = useState<FontWeightOption>(() => {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('cg.fontWeight')
        : null;
    if (raw === null) return 500;
    const saved = Number(raw);
    return saved === 400 || saved === 500 || saved === 600 || saved === 700
      ? (saved as FontWeightOption)
      : 500;
  });

  const [fontSize, setFontSize] = useState<number>(() => {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('cg.fontSize')
        : null;
    if (raw === null) return 26;
    const saved = Number(raw);
    return !Number.isNaN(saved) && saved >= 18 && saved <= 48 ? saved : 26;
  });

  const [lineHeight, setLineHeight] = useState<number>(() => {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('cg.lineHeight')
        : null;
    if (raw === null) return 1.44;
    const saved = Number(raw);
    return !Number.isNaN(saved) && saved >= 1.25 && saved <= 1.85 ? saved : 1.44;
  });

  const [activeBeatGlow, setActiveBeatGlow] = useState<number>(() => {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('cg.activeBeatGlow')
        : null;
    if (raw === null) return 82;
    const saved = Number(raw);
    return !Number.isNaN(saved) && saved >= 10 && saved <= 100 ? saved : 82;
  });

  const [narrowWidth, setNarrowWidth] = useState<boolean>(false);
  const [showOrganizerCues, setShowOrganizerCues] = useState<boolean>(true);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  const isDarkTheme = themeMode === 'dark';
  const isFullLiquidWindow = windowLayoutMode === 'fullLiquidGlass';

  useEffect(() => {
    try {
      window.localStorage.setItem('cg.themeMode', themeMode);
      window.localStorage.setItem('cg.windowLayoutMode', windowLayoutMode);
      window.localStorage.setItem('cg.glassVariant', glassVariant);
      window.localStorage.setItem('cg.glassTintPreset', glassTintPreset);
      window.localStorage.setItem('cg.glassInteractive', String(glassInteractive));
      window.localStorage.setItem('cg.voiceDarkenWords', String(voiceDarkenWords));
      window.localStorage.setItem(
        'cg.voiceDarkenOpacity',
        String(voiceDarkenOpacity)
      );
      window.localStorage.setItem(
        'cg.voiceShowTargetUnderline',
        String(voiceShowTargetUnderline)
      );
      window.localStorage.setItem('cg.liquidness', String(liquidness));
      window.localStorage.setItem('cg.transparency', String(transparency));
      window.localStorage.setItem('cg.glassEffectLevel', String(glassEffectLevel));
      window.localStorage.setItem('cg.fontWeight', String(fontWeight));
      window.localStorage.setItem('cg.fontSize', String(fontSize));
      window.localStorage.setItem('cg.lineHeight', String(lineHeight));
      window.localStorage.setItem('cg.activeBeatGlow', String(activeBeatGlow));
    } catch {
      // ignore storage errors
    }
  }, [
    themeMode,
    windowLayoutMode,
    glassVariant,
    glassTintPreset,
    glassInteractive,
    voiceDarkenWords,
    voiceDarkenOpacity,
    voiceShowTargetUnderline,
    liquidness,
    transparency,
    glassEffectLevel,
    fontWeight,
    fontSize,
    lineHeight,
    activeBeatGlow,
  ]);

  // Persistent reading & navigation state
  const [navState, setNavState] = useState<NavigationState>(() => {
    const savedBeat =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('cg.activeBeatID')
        : null;
    return createInitialNavState(document, savedBeat);
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('cg.activeBeatID', navState.activeBeatID);
    } catch {
      // ignore storage quota errors
    }
  }, [navState.activeBeatID]);

  // Opt-in Global Bare Arrow Capture (ALWAYS defaults OFF on launch per spec)
  const [bareArrowCaptureEnabled, setBareArrowCaptureEnabled] =
    useState<boolean>(false);
  const [bareArrowPermissionState, setBareArrowPermissionState] = useState<
    'granted' | 'prompt' | 'denied'
  >('granted');

  // Simulated focus & Zoom backdrop mode
  const [activeAppFocus, setActiveAppFocus] = useState<'panel' | 'zoom'>('panel');
  const [zoomBackdropStyle, setZoomBackdropStyle] = useState<
    'darkZoom' | 'lightSlides' | 'studioDesk'
  >('darkZoom');
  const [zoomChatDraft, setZoomChatDraft] = useState<string>('');
  const [zoomChatMessages, setZoomChatMessages] = useState<
    Array<{ sender: string; text: string }>
  >([
    {
      sender: 'Co-Host (Live Producer)',
      text: 'CueGlass Studio ready! Slides & audio verified for all speakers.',
    },
  ]);

  // Checklist & Preflight state
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(
    () => {
      try {
        const raw = window.localStorage.getItem('cg.checklist');
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    }
  );
  const [acknowledgedPlaceholders, setAcknowledgedPlaceholders] = useState<
    string[]
  >(() => {
    try {
      const raw = window.localStorage.getItem('cg.ackPlaceholders');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Popovers & Modals
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(true);
  const [isCollapsedToBubble, setIsCollapsedToBubble] =
    useState<boolean>(false);
  const [isSectionsOpen, setIsSectionsOpen] = useState<boolean>(false);
  const [isToolsOpen, setIsToolsOpen] = useState<boolean>(false);
  const [isThemePopoverOpen, setIsThemePopoverOpen] = useState<boolean>(false);
  const [toolsInitialTab, setToolsInitialTab] = useState<number>(0);
  const [isPreflightOpen, setIsPreflightOpen] = useState<boolean>(false);
  const [preflightFocusToken, setPreflightFocusToken] = useState<string | null>(
    null
  );
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isNativeXcodeOpen, setIsNativeXcodeOpen] = useState<boolean>(false);
  const [isAIPromptOpen, setIsAIPromptOpen] = useState<boolean>(false);
  const [isMenuBarMenuOpen, setIsMenuBarMenuOpen] = useState<boolean>(false);
  const [isBubbleContextMenuOpen, setIsBubbleContextMenuOpen] =
    useState<boolean>(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState<boolean>(false);
  const [quickCopiedPrompt, setQuickCopiedPrompt] = useState<boolean>(false);
  const [copiedBuildScript, setCopiedBuildScript] = useState<boolean>(false);

  const handleCopySelfContainedDMGScript = useCallback(async () => {
    try {
      const res = await fetch('/Build-Pathfinder-Glass-DMG.command');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedBuildScript(true);
      window.setTimeout(() => setCopiedBuildScript(false), 3000);
    } catch {
      setIsNativeXcodeOpen(true);
    }
  }, []);

  // Live Siri Dictation / Voice Auto-Follow State (Ephemeral 3-Beat Sliding Window: Previous, Current, Next)
  // Stores ZERO persistent word-position memory across the document: resets when switching lines.
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [spokenWordCount, setSpokenWordCount] = useState<number>(0);
  const [lastMatchedVoiceWord, setLastMatchedVoiceWord] = useState<string>('');
  const [voiceMicStatus, setVoiceMicStatus] = useState<'idle' | 'listening' | 'permission-denied'>('idle');
  const [audioInputDevices, setAudioInputDevices] = useState<
    Array<{ deviceId: string; label: string }>
  >([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>(
    () => {
      const saved =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('cg.selectedAudioDeviceId')
          : null;
      return saved || 'default';
    }
  );
  const [voiceAudioLevel, setVoiceAudioLevel] = useState<number>(0);
  const pendingJumpWordCountRef = useRef<number>(0);
  const spokenWordCountRef = useRef<number>(0);
  spokenWordCountRef.current = spokenWordCount;

  const refreshAudioDevices = useCallback(async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.enumerateDevices
    ) {
      return;
    }
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const inputs = allDevices
        .filter((d) => d.kind === 'audioinput')
        .map((d, idx) => ({
          deviceId: d.deviceId || `input-${idx}`,
          label: d.label || `System Audio Input ${idx + 1}`,
        }));
      setAudioInputDevices(inputs);
    } catch {
      // ignore enumeration errors
    }
  }, []);

  useEffect(() => {
    refreshAudioDevices();
    if (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      navigator.mediaDevices.addEventListener
    ) {
      navigator.mediaDevices.addEventListener(
        'devicechange',
        refreshAudioDevices
      );
      return () => {
        navigator.mediaDevices.removeEventListener(
          'devicechange',
          refreshAudioDevices
        );
      };
    }
  }, [refreshAudioDevices]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'cg.selectedAudioDeviceId',
        selectedAudioDeviceId
      );
    } catch {
      // ignore
    }
  }, [selectedAudioDeviceId]);

  // Tracks how many words in the current continuous Web Speech API result stream belonged to prior beats
  // so continuous sentences across beat boundaries never bleed old words into the newly selected beat.
  const beatBoundaryWordOffsetRef = useRef<number>(0);
  const latestRawResultWordCountRef = useRef<number>(0);

  // Reset spokenWordCount whenever the active beat changes (or apply initial jump offset if jumping into nextBeat)
  useEffect(() => {
    beatBoundaryWordOffsetRef.current = latestRawResultWordCountRef.current;
    if (pendingJumpWordCountRef.current > 0) {
      setSpokenWordCount(pendingJumpWordCountRef.current);
      pendingJumpWordCountRef.current = 0;
    } else {
      setSpokenWordCount(0);
    }
  }, [navState.activeBeatID]);

  // macOS Tahoe Slider Drag -> Turns into Translucent Refractive Liquid Glass Capsule while dragging
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range') {
        target.classList.add('is-dragging');
      }
    };
    const clearDraggingSliders = () => {
      window.document
        .querySelectorAll('input[type="range"].is-dragging')
        .forEach((el) => el.classList.remove('is-dragging'));
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('pointerup', clearDraggingSliders, true);
    window.addEventListener('pointercancel', clearDraggingSliders, true);
    window.addEventListener('blur', clearDraggingSliders);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('pointerup', clearDraggingSliders, true);
      window.removeEventListener('pointercancel', clearDraggingSliders, true);
      window.removeEventListener('blur', clearDraggingSliders);
    };
  }, []);

  // Process incoming live speech transcript through the lightweight 3-beat window
  // Strictly driven by spoken words in sequential order (with phonetic + lookahead error recovery).
  const processLiveSpeechTranscript = useCallback(
    (transcript: string, alternativeTranscripts?: string[]) => {
      if (!transcript.trim()) return;
      const threeBeatWin = getThreeBeatWindow(document, navState.activeBeatID);
      const decision = evaluateThreeBeatWindow(
        threeBeatWin,
        transcript,
        spokenWordCountRef.current,
        alternativeTranscripts
      );

      if (decision.lastMatchedWord) {
        setLastMatchedVoiceWord(decision.lastMatchedWord);
      }

      if (decision.action === 'advanceToNext' && decision.targetBeatID) {
        // Current line finished! Advance to next line with 0 stored memory
        beatBoundaryWordOffsetRef.current = latestRawResultWordCountRef.current;
        setSpokenWordCount(decision.totalSpeakableWords);
        pendingJumpWordCountRef.current = 0;
        setNavState((s) => selectBeatById(document, s, decision.targetBeatID!));
      } else if (
        decision.action === 'jumpToNextWithProgress' &&
        decision.targetBeatID
      ) {
        // User started speaking next line before switching -> auto-switch to next line at matched word offset
        beatBoundaryWordOffsetRef.current = latestRawResultWordCountRef.current;
        pendingJumpWordCountRef.current = decision.spokenWordCount;
        setNavState((s) => selectBeatById(document, s, decision.targetBeatID!));
      } else if (
        decision.action === 'stepBackToPrev' &&
        decision.targetBeatID
      ) {
        beatBoundaryWordOffsetRef.current = latestRawResultWordCountRef.current;
        pendingJumpWordCountRef.current = decision.spokenWordCount;
        setNavState((s) => selectBeatById(document, s, decision.targetBeatID!));
      } else if (decision.spokenWordCount !== spokenWordCountRef.current) {
        setSpokenWordCount(decision.spokenWordCount);
      }
    },
    [document, navState.activeBeatID]
  );

  // Expose deterministic test/automation hook on window for verifying exact word-by-word voice tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__cueGlassFeedSpeech = (
      transcript: string,
      alternatives?: string[]
    ) => {
      processLiveSpeechTranscript(transcript, alternatives);
    };
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__cueGlassFeedSpeech;
    };
  }, [processLiveSpeechTranscript]);

  // Built-in macOS Siri Dictation / Web Speech API + System Audio Input Stream — Strictly Speech-Driven
  useEffect(() => {
    if (!isVoiceListening) {
      setVoiceMicStatus('idle');
      setLastMatchedVoiceWord('');
      setVoiceAudioLevel(0);
      return;
    }

    let isCancelled = false;
    let restartTimer: number | null = null;
    let levelRafId: number | null = null;
    let mediaStream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recognition: any = null;

    // 1. Acquire System Audio Input Stream & Live Level Meter (ensures macOS/browser audio route is active)
    const startSystemAudioStream = async () => {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        return;
      }
      try {
        const audioConstraints: MediaTrackConstraints =
          selectedAudioDeviceId && selectedAudioDeviceId !== 'default'
            ? {
                deviceId: { ideal: selectedAudioDeviceId },
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            : {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              };

        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: false,
        });

        if (isCancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        setVoiceMicStatus('listening');
        refreshAudioDevices();

        const AudioContextCtor =
          window.AudioContext ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).webkitAudioContext;
        if (AudioContextCtor) {
          audioCtx = new AudioContextCtor();
          const source = audioCtx.createMediaStreamSource(mediaStream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.65;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let lastSampleTime = 0;

          const sampleLevel = (now: number) => {
            if (isCancelled) return;
            if (now - lastSampleTime >= 65) {
              lastSampleTime = now;
              analyser.getByteTimeDomainData(dataArray);
              let sumSquares = 0;
              for (let i = 0; i < dataArray.length; i++) {
                const normalized = (dataArray[i] - 128) / 128;
                sumSquares += normalized * normalized;
              }
              const rms = Math.sqrt(sumSquares / dataArray.length);
              const scaled = Math.min(100, Math.round(rms * 340));
              setVoiceAudioLevel(scaled);
            }
            levelRafId = window.requestAnimationFrame(sampleLevel);
          };

          levelRafId = window.requestAnimationFrame(sampleLevel);
        }
      } catch (err) {
        if (isCancelled) return;
        const errName = (err as { name?: string })?.name || '';
        if (
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError'
        ) {
          setVoiceMicStatus('permission-denied');
        }
      }
    };

    startSystemAudioStream();

    // 2. Start Continuous Speech Recognition on the active system audio input
    const SpeechRecognitionCtor =
      typeof window !== 'undefined'
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).SpeechRecognition ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognitionCtor) {
      try {
        recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          if (!isCancelled) {
            setVoiceMicStatus('listening');
          }
        };

        let lastResultIndex = -1;
        let lastEvaluatedUnconsumed = '';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          if (isCancelled) return;
          setVoiceMicStatus('listening');

          // Collect the active recognition stream from resultIndex onward
          const activeResultIdx =
            typeof event.resultIndex === 'number'
              ? event.resultIndex
              : Math.max(0, event.results.length - 1);

          if (activeResultIdx !== lastResultIndex) {
            lastResultIndex = activeResultIdx;
            beatBoundaryWordOffsetRef.current = 0;
            latestRawResultWordCountRef.current = 0;
            lastEvaluatedUnconsumed = '';
          }

          let primaryCombined = '';
          const alt1Parts: string[] = [];
          const alt2Parts: string[] = [];

          for (let i = activeResultIdx; i < event.results.length; i++) {
            const res = event.results[i];
            if (res && res[0]) {
              primaryCombined += ' ' + res[0].transcript;
            }
            if (res && res[1]) {
              alt1Parts.push(res[1].transcript);
            } else if (res && res[0]) {
              alt1Parts.push(res[0].transcript);
            }
            if (res && res[2]) {
              alt2Parts.push(res[2].transcript);
            } else if (res && res[0]) {
              alt2Parts.push(res[0].transcript);
            }
          }

          const allPrimaryTokens = primaryCombined
            .trim()
            .split(/\s+/)
            .filter(Boolean);
          latestRawResultWordCountRef.current = allPrimaryTokens.length;

          // If interim hypothesis merged two words (e.g. "going to" -> "gonna"), clamp to end instead of resetting to 0
          if (allPrimaryTokens.length < beatBoundaryWordOffsetRef.current) {
            beatBoundaryWordOffsetRef.current = Math.max(
              0,
              allPrimaryTokens.length - 1
            );
          }

          // Cap unconsumed sliding window to 16 words so long continuous speech never overloads the matcher
          if (
            allPrimaryTokens.length - beatBoundaryWordOffsetRef.current >
            16
          ) {
            beatBoundaryWordOffsetRef.current = allPrimaryTokens.length - 16;
          }

          const unconsumedPrimary = allPrimaryTokens
            .slice(beatBoundaryWordOffsetRef.current)
            .join(' ');

          const alternatives: string[] = [];
          const alt1Joined = alt1Parts
            .join(' ')
            .trim()
            .split(/\s+/)
            .slice(beatBoundaryWordOffsetRef.current)
            .join(' ');
          const alt2Joined = alt2Parts
            .join(' ')
            .trim()
            .split(/\s+/)
            .slice(beatBoundaryWordOffsetRef.current)
            .join(' ');

          if (alt1Joined && alt1Joined !== unconsumedPrimary) {
            alternatives.push(alt1Joined);
          }
          if (
            alt2Joined &&
            alt2Joined !== unconsumedPrimary &&
            alt2Joined !== alt1Joined
          ) {
            alternatives.push(alt2Joined);
          }

          if (
            unconsumedPrimary &&
            unconsumedPrimary !== lastEvaluatedUnconsumed
          ) {
            lastEvaluatedUnconsumed = unconsumedPrimary;
            processLiveSpeechTranscript(unconsumedPrimary, alternatives);
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          if (isCancelled) return;
          const errCode = event?.error;
          if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
            setVoiceMicStatus('permission-denied');
          }
          // For 'no-speech', 'aborted', 'network', or 'audio-capture', onend will cleanly restart listening
        };

        recognition.onend = () => {
          if (!isCancelled && isVoiceListening) {
            // Reset result offset because a fresh recognition session starts with an empty results array
            beatBoundaryWordOffsetRef.current = 0;
            latestRawResultWordCountRef.current = 0;
            restartTimer = window.setTimeout(() => {
              if (!isCancelled && isVoiceListening) {
                try {
                  recognition.start();
                } catch {
                  // ignore overlapping start attempts
                }
              }
            }, 120);
          }
        };

        recognition.start();
        setVoiceMicStatus('listening');
      } catch {
        // Ignore initial start exception if browser blocks auto-start
      }
    }

    return () => {
      isCancelled = true;
      if (restartTimer !== null) {
        window.clearTimeout(restartTimer);
      }
      if (levelRafId !== null) {
        window.cancelAnimationFrame(levelRafId);
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
      if (recognition) {
        try {
          recognition.onend = null;
          recognition.onerror = null;
          recognition.onresult = null;
          recognition.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [
    isVoiceListening,
    selectedAudioDeviceId,
    processLiveSpeechTranscript,
    refreshAudioDevices,
  ]);

  const handleQuickCopyAIPrompt = async () => {
    try {
      await navigator.clipboard.writeText(UNIVERSAL_AI_MASTER_PROMPT);
    } catch {
      const ta = window.document.createElement('textarea');
      ta.value = UNIVERSAL_AI_MASTER_PROMPT;
      window.document.body.appendChild(ta);
      ta.select();
      window.document.execCommand('copy');
      window.document.body.removeChild(ta);
    }
    setQuickCopiedPrompt(true);
    setTimeout(() => setQuickCopiedPrompt(false), 2400);
  };

  // Viewport & Panel Geometry
  const getVisibleWorkspace = useCallback((): WindowRect => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const h = typeof window !== 'undefined' ? window.innerHeight : 900;
    return {
      x: 0,
      y: TOP_MENU_BAR_HEIGHT,
      width: w,
      height: Math.max(300, h - TOP_MENU_BAR_HEIGHT),
    };
  }, []);

  const [expandedFrame, setExpandedFrame] = useState<WindowRect>(() => {
    const visible = getVisibleWorkspace();
    try {
      const raw = window.localStorage.getItem('cg.expandedFrame');
      if (raw) {
        return clampWindowFrame(JSON.parse(raw), visible, false);
      }
    } catch {
      // ignore
    }
    return computeNearCameraFrame(visible, DEFAULT_EXPANDED_SIZE);
  });

  const [bubbleFrame, setBubbleFrame] = useState<WindowRect>(() => {
    const visible = getVisibleWorkspace();
    try {
      const raw = window.localStorage.getItem('cg.bubbleFrame');
      if (raw) {
        return clampWindowFrame(JSON.parse(raw), visible, true);
      }
    } catch {
      // ignore
    }
    return computeNearCameraBubbleFrame(visible);
  });

  // Re-clamp safely on window resize / monitor change
  useEffect(() => {
    const handleResize = () => {
      const visible = getVisibleWorkspace();
      setExpandedFrame((prev) => clampWindowFrame(prev, visible, false));
      setBubbleFrame((prev) => clampWindowFrame(prev, visible, true));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getVisibleWorkspace]);

  // Persist frames
  useEffect(() => {
    try {
      window.localStorage.setItem(
        'cg.expandedFrame',
        JSON.stringify(expandedFrame)
      );
      window.localStorage.setItem(
        'cg.bubbleFrame',
        JSON.stringify(bubbleFrame)
      );
    } catch {
      // ignore
    }
  }, [expandedFrame, bubbleFrame]);

  const snapNearCamera = useCallback(() => {
    const visible = getVisibleWorkspace();
    setIsPanelVisible(true);
    if (isCollapsedToBubble) {
      setBubbleFrame(computeNearCameraBubbleFrame(visible));
    } else {
      setExpandedFrame((prev) =>
        computeNearCameraFrame(visible, {
          width: prev.width,
          height: prev.height,
        })
      );
    }
  }, [getVisibleWorkspace, isCollapsedToBubble]);

  const toggleCollapseToBubble = useCallback(() => {
    setIsPanelVisible(true);
    setIsSectionsOpen(false);
    setIsToolsOpen(false);
    setIsThemePopoverOpen(false);
    setIsBubbleContextMenuOpen(false);
    setIsCollapsedToBubble((prev) => !prev);
  }, []);

  // Dragging & Resizing handlers for Floating Panel and Collapsed Bubble
  const dragInfoRef = useRef<{
    mode: 'movePanel' | 'resizePanel' | 'moveBubble';
    startX: number;
    startY: number;
    initialRect: WindowRect;
    hasMoved: boolean;
  } | null>(null);

  const startPointerDrag = (
    e: React.PointerEvent,
    mode: 'movePanel' | 'resizePanel' | 'moveBubble'
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const initialRect = mode === 'moveBubble' ? bubbleFrame : expandedFrame;
    dragInfoRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initialRect,
      hasMoved: false,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const info = dragInfoRef.current;
      if (!info) return;
      const dx = moveEvent.clientX - info.startX;
      const dy = moveEvent.clientY - info.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        info.hasMoved = true;
      }
      const visible = getVisibleWorkspace();

      if (info.mode === 'movePanel') {
        setExpandedFrame(
          clampWindowFrame(
            {
              ...info.initialRect,
              x: info.initialRect.x + dx,
              y: info.initialRect.y + dy,
            },
            visible,
            false
          )
        );
      } else if (info.mode === 'resizePanel') {
        setExpandedFrame(
          clampWindowFrame(
            {
              ...info.initialRect,
              width: info.initialRect.width + dx,
              height: info.initialRect.height + dy,
            },
            visible,
            false
          )
        );
      } else if (info.mode === 'moveBubble') {
        setBubbleFrame(
          clampWindowFrame(
            {
              ...info.initialRect,
              x: info.initialRect.x + dx,
              y: info.initialRect.y + dy,
            },
            visible,
            true
          )
        );
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      setTimeout(() => {
        dragInfoRef.current = null;
      }, 20);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Scroll active beat to upper 22% of reading viewport
  const readingViewportRef = useRef<HTMLDivElement | null>(null);
  const beatElementsRef = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (isCollapsedToBubble || navState.activeOnDemandSnippet) return;
    const container = readingViewportRef.current;
    const activeEl = beatElementsRef.current[navState.activeBeatID];
    if (!container || !activeEl) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const currentOffsetInViewport = activeRect.top - containerRect.top;
    const targetTopOffset = Math.max(16, containerRect.height * 0.22);
    const nextScrollTop =
      container.scrollTop + (currentOffsetInViewport - targetTopOffset);

    container.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [
    navState.activeBeatID,
    navState.activeOnDemandSnippet,
    isCollapsedToBubble,
    fontSize,
    lineHeight,
    reduceMotion,
  ]);

  // Derived script states
  const activeSection = getActiveSection(document, navState);
  const activeBlock = getActiveBlock(document, navState);
  const beatPosition = getBeatPositionInSection(document, navState);
  const pendingThankWaypoint = getPendingThankSpeakerWaypoint(
    document,
    navState
  );

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditorOpen || isAIPromptOpen) return;

      const target = e.target as HTMLElement | null;
      const isTypingInInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Theme toggle shortcut: Command/Ctrl + Shift + T
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 't'
      ) {
        e.preventDefault();
        setThemeMode((m) => (m === 'light' ? 'dark' : 'light'));
        return;
      }

      // Safe Global Chords (Control + Option/Alt)
      if (e.ctrlKey && e.altKey) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setNavState((s) => stepNextBeat(document, s));
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setNavState((s) => stepPrevBeat(document, s));
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setNavState((s) => stepNextSection(document, s));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setNavState((s) => stepPrevSection(document, s));
          return;
        }
        if (e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 'm') {
          e.preventDefault();
          toggleCollapseToBubble();
          return;
        }
        if (e.key.toLowerCase() === 'h' || e.key === '0') {
          e.preventDefault();
          snapNearCamera();
          return;
        }
      }

      // Escape closes transient popovers/modals
      if (e.key === 'Escape') {
        if (
          isSectionsOpen ||
          isToolsOpen ||
          isThemePopoverOpen ||
          isPreflightOpen ||
          isShortcutsOpen ||
          isNativeXcodeOpen ||
          isAIPromptOpen ||
          isMenuBarMenuOpen ||
          isBubbleContextMenuOpen ||
          isEventDetailsOpen
        ) {
          e.preventDefault();
          setIsSectionsOpen(false);
          setIsToolsOpen(false);
          setIsThemePopoverOpen(false);
          setIsPreflightOpen(false);
          setIsShortcutsOpen(false);
          setIsNativeXcodeOpen(false);
          setIsAIPromptOpen(false);
          setIsMenuBarMenuOpen(false);
          setIsBubbleContextMenuOpen(false);
          setIsEventDetailsOpen(false);
          return;
        }
        if (navState.activeOnDemandSnippet) {
          e.preventDefault();
          setNavState((s) => returnToLiveBeat(document, s));
          return;
        }
      }

      // Font size shortcuts Command/Ctrl + Plus/Minus
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setFontSize((f) => Math.min(48, f + 2));
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          setFontSize((f) => Math.max(18, f - 2));
          return;
        }
      }

      if (isTypingInInput) return;

      // Single-key 'T' for Thank Speaker waypoint when panel is focused
      if (
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        e.key.toLowerCase() === 't' &&
        pendingThankWaypoint
      ) {
        e.preventDefault();
        setNavState((s) => jumpToThanksWaypoint(document, s));
        return;
      }

      const canUseBareArrows =
        activeAppFocus === 'panel' ||
        (bareArrowCaptureEnabled && bareArrowPermissionState === 'granted');

      if (!canUseBareArrows) return;

      if (
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        e.key === 'ArrowRight'
      ) {
        e.preventDefault();
        setNavState((s) => stepNextBeat(document, s));
      } else if (
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        e.key === 'ArrowLeft'
      ) {
        e.preventDefault();
        setNavState((s) => stepPrevBeat(document, s));
      } else if (
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        e.key === 'ArrowDown'
      ) {
        e.preventDefault();
        setNavState((s) => stepNextSection(document, s));
      } else if (
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        e.key === 'ArrowUp'
      ) {
        e.preventDefault();
        setNavState((s) => stepPrevSection(document, s));
      } else if (e.key === ' ') {
        e.preventDefault();
        if (e.shiftKey) {
          setNavState((s) => stepPrevBeat(document, s));
        } else {
          setNavState((s) => stepNextBeat(document, s));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    document,
    isEditorOpen,
    isAIPromptOpen,
    isSectionsOpen,
    isToolsOpen,
    isThemePopoverOpen,
    isPreflightOpen,
    isShortcutsOpen,
    isNativeXcodeOpen,
    isMenuBarMenuOpen,
    isBubbleContextMenuOpen,
    isEventDetailsOpen,
    navState.activeOnDemandSnippet,
    activeAppFocus,
    bareArrowCaptureEnabled,
    bareArrowPermissionState,
    pendingThankWaypoint,
    snapNearCamera,
    toggleCollapseToBubble,
  ]);

  const unconfirmedCriticalPlaceholders = useMemo(
    () =>
      document.allPlaceholders.filter(
        (p) =>
          p.isDataScienceCritical && !acknowledgedPlaceholders.includes(p.id)
      ),
    [document.allPlaceholders, acknowledgedPlaceholders]
  );

  const handleSaveMarkdown = (nextMarkdown: string, label: string) => {
    try {
      const snap = storeRef.current.saveWorkingCopy(nextMarkdown, label);
      const nextDoc = parseMarkdownScript(snap.workingMarkdown);
      setWorkingMarkdown(snap.workingMarkdown);
      setRevisions(snap.revisions);
      setNavState((prev) => remapNavStateAfterEdit(document, nextDoc, prev));
      setLastSaveError(null);
    } catch (err) {
      setLastSaveError(
        err instanceof Error ? err.message : 'Failed to save working script'
      );
    }
  };

  const handleRestoreBundled = () => {
    const snap = storeRef.current.restoreBundledOriginal();
    const nextDoc = parseMarkdownScript(snap.workingMarkdown);
    setWorkingMarkdown(snap.workingMarkdown);
    setRevisions(snap.revisions);
    setNavState((prev) => remapNavStateAfterEdit(document, nextDoc, prev));
    setLastSaveError(null);
  };

  const handleSimulateCorruptionRecovery = () => {
    storeRef.current.simulateCorruptedWorkingWrite();
    const recovered = storeRef.current.loadOrInitialize();
    setWorkingMarkdown(recovered.workingMarkdown);
    setRevisions(recovered.revisions);
  };

  const handleResolvePlaceholderInScript = (
    rawToken: string,
    replacementValue: string
  ) => {
    const updated = workingMarkdown.split(rawToken).join(replacementValue);
    handleSaveMarkdown(updated, `Filled ${rawToken}`);
  };

  const handleToggleChecklist = (blockID: string) => {
    setChecklistState((prev) => {
      const next = { ...prev, [blockID]: !prev[blockID] };
      try {
        window.localStorage.setItem('cg.checklist', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleToggleAcknowledgePlaceholder = (id: string) => {
    setAcknowledgedPlaceholders((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      try {
        window.localStorage.setItem('cg.ackPlaceholders', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const liveProgressFraction = useMemo(() => {
    const total = Math.max(1, document.liveFlowBeats.length);
    const idx = document.liveFlowBeats.findIndex(
      (b) => b.id === navState.activeBeatID
    );
    return Math.min(1, Math.max(0.04, (idx + 1) / total));
  }, [document.liveFlowBeats, navState.activeBeatID]);

  // Dynamic Apple macOS 26 Tahoe Clear Liquid Glass vs. Classic Card UI Physics
  const glassPhysics = useMemo(() => {
    // When Classic Card UI is selected: ZERO Liquid Glass (simple, solid, traditional UI)
    if (!isFullLiquidWindow) {
      if (isDarkTheme) {
        return {
          panelBackground: '#141A26',
          backdropFilter: 'none',
          webkitBackdropFilter: 'none',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
          viewportBackground: '#0F1521',
          barBackground: '#141A26',
          activeBeatStyle: {
            background: '#1C2536',
            boxShadow: 'none',
            borderColor: '#2E3B52',
          },
        };
      }
      return {
        panelBackground: '#FFFFFF',
        backdropFilter: 'none',
        webkitBackdropFilter: 'none',
        boxShadow: '0 14px 36px rgba(15, 23, 42, 0.14)',
        viewportBackground: '#F8FAFC',
        barBackground: '#FFFFFF',
        activeBeatStyle: {
          background: '#FFFFFF',
          boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06)',
          borderColor: '#CBD5E1',
        },
      };
    }

    // When Full-Window Liquid Glass is ON: Original Apple Clear Liquid Glass (borderless, pure optical translucency)
    const blurPx =
      glassVariant === 'identity'
        ? 4
        : Math.round(
            (glassVariant === 'clear' ? 22 : 28) + (glassEffectLevel / 100) * 26
          );
    const saturatePct =
      glassVariant === 'identity'
        ? 110
        : Math.round(165 + (glassEffectLevel / 100) * 55);
    const liq = liquidness / 100;
    const glow = activeBeatGlow / 100;

    const tintMap: Record<AppleGlassTintPreset, string> = {
      crystalNeutral: isDarkTheme ? '148, 163, 184' : '248, 251, 255',
      tahoeBlue: isDarkTheme ? '56, 189, 248' : '219, 234, 254',
      ultraviolet: isDarkTheme ? '139, 92, 246' : '237, 233, 254',
      emeraldMist: isDarkTheme ? '16, 185, 129' : '209, 250, 229',
      amberGold: isDarkTheme ? '245, 158, 11' : '254, 243, 199',
    };
    const tintRGB = tintMap[glassTintPreset];

    if (isDarkTheme) {
      const darkBaseAlpha =
        glassVariant === 'clear'
          ? 0.56
          : glassVariant === 'identity'
          ? 0.56
          : 0.68;
      const darkAlpha = Math.max(
        0.22,
        Math.min(0.88, darkBaseAlpha + (1 - transparency / 100) * 0.28)
      );
      return {
        panelBackground: `linear-gradient(165deg, rgba(16, 23, 38, ${darkAlpha.toFixed(2)}) 0%, rgba(11, 16, 28, ${(darkAlpha * 0.92).toFixed(2)}) 100%)`,
        backdropFilter: `url(#apple-tahoe-window-lens) blur(${blurPx}px) saturate(${saturatePct}%) brightness(1.04)`,
        webkitBackdropFilter: `blur(${blurPx}px) saturate(${saturatePct}%) brightness(1.04)`,
        boxShadow: `0 24px 60px rgba(0, 0, 0, 0.50), 0 4px 14px rgba(0, 0, 0, 0.28)`,
        viewportBackground: 'transparent',
        barBackground: 'transparent',
        activeBeatStyle: {
          background: `rgba(255, 255, 255, ${(0.07 + glow * 0.07).toFixed(2)})`,
          boxShadow: 'none',
          borderColor: 'transparent',
        },
      };
    }

    // Original Apple Clear Liquid Glass Light (Luminous Crystal Lens — high contrast over any desktop backdrop, zero outline lines)
    const lightBaseAlpha =
      glassVariant === 'clear'
        ? 0.72
        : glassVariant === 'identity'
        ? 0.45
        : 0.82;
    const lightAlpha = Math.max(
      0.42,
      Math.min(0.94, lightBaseAlpha + (1 - transparency / 100) * 0.20)
    );
    return {
      panelBackground: `linear-gradient(165deg, rgba(252, 254, 255, ${lightAlpha.toFixed(2)}) 0%, rgba(${tintRGB}, ${(lightAlpha * 0.92).toFixed(2)}) 100%)`,
      backdropFilter: `url(#apple-tahoe-window-lens) blur(${blurPx}px) saturate(${saturatePct}%) brightness(${(1.12 + liq * 0.08).toFixed(2)})`,
      webkitBackdropFilter: `blur(${blurPx}px) saturate(${saturatePct}%) brightness(${(1.12 + liq * 0.08).toFixed(2)})`,
      boxShadow: `0 24px 56px rgba(8, 15, 30, 0.24), 0 4px 14px rgba(8, 15, 30, 0.08)`,
      viewportBackground: 'transparent',
      barBackground: 'transparent',
      activeBeatStyle: {
        background: `rgba(255, 255, 255, ${(0.42 + glow * 0.22).toFixed(2)})`,
        boxShadow: 'none',
        borderColor: 'transparent',
      },
    };
  }, [
    isDarkTheme,
    isFullLiquidWindow,
    glassVariant,
    glassTintPreset,
    liquidness,
    transparency,
    glassEffectLevel,
    activeBeatGlow,
  ]);

  const isCueBlock = (kind: ScriptBlockKind) =>
    kind === 'organizerCue' ||
    kind === 'conditionalCue' ||
    kind === 'timingCue' ||
    kind === 'visualCue' ||
    kind === 'deliveryCue' ||
    kind === 'actionCue';

  const renderCueCard = (block: ScriptBlock, isActive: boolean) => {
    const cueMeta: Record<
      string,
      {
        label: string;
        liquidLight: string;
        liquidDark: string;
        classicLight: string;
        classicDark: string;
        lightBadge: string;
        darkBadge: string;
        icon: React.ReactNode;
      }
    > = {
      organizerCue: {
        label: 'Organizer Cue',
        liquidLight: 'bg-amber-500/15 text-amber-950',
        liquidDark: 'bg-amber-500/16 text-amber-100',
        classicLight: 'bg-amber-50 border border-amber-200 text-amber-950',
        classicDark: 'bg-amber-950/45 border border-amber-800/50 text-amber-100',
        lightBadge: 'bg-amber-500/20 text-amber-900',
        darkBadge: 'bg-amber-400/25 text-amber-200',
        icon: <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />,
      },
      conditionalCue: {
        label: 'Conditional Rule',
        liquidLight: 'bg-orange-500/15 text-orange-950',
        liquidDark: 'bg-orange-500/16 text-orange-100',
        classicLight: 'bg-orange-50 border border-orange-200 text-orange-950',
        classicDark: 'bg-orange-950/45 border border-orange-800/50 text-orange-100',
        lightBadge: 'bg-orange-500/20 text-orange-900',
        darkBadge: 'bg-orange-400/25 text-orange-200',
        icon: <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-orange-600" />,
      },
      timingCue: {
        label: 'Timing & Pacing',
        liquidLight: 'bg-emerald-500/15 text-emerald-950',
        liquidDark: 'bg-emerald-500/16 text-emerald-100',
        classicLight: 'bg-emerald-50 border border-emerald-200 text-emerald-950',
        classicDark: 'bg-emerald-950/45 border border-emerald-800/50 text-emerald-100',
        lightBadge: 'bg-emerald-500/20 text-emerald-900',
        darkBadge: 'bg-emerald-400/25 text-emerald-200',
        icon: <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />,
      },
      visualCue: {
        label: 'Slide / Visual',
        liquidLight: 'bg-sky-500/15 text-sky-950',
        liquidDark: 'bg-sky-500/16 text-sky-100',
        classicLight: 'bg-sky-50 border border-sky-200 text-sky-950',
        classicDark: 'bg-sky-950/45 border border-sky-800/50 text-sky-100',
        lightBadge: 'bg-sky-500/20 text-sky-900',
        darkBadge: 'bg-sky-400/25 text-sky-200',
        icon: <Monitor className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-600" />,
      },
      deliveryCue: {
        label: 'Vocal Delivery',
        liquidLight: 'bg-purple-500/15 text-purple-950',
        liquidDark: 'bg-purple-500/16 text-purple-100',
        classicLight: 'bg-purple-50 border border-purple-200 text-purple-950',
        classicDark: 'bg-purple-950/45 border border-purple-800/50 text-purple-100',
        lightBadge: 'bg-purple-500/20 text-purple-900',
        darkBadge: 'bg-purple-400/25 text-purple-200',
        icon: <Mic className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-600" />,
      },
      actionCue: {
        label: 'Stage Action',
        liquidLight: 'bg-teal-500/15 text-teal-950',
        liquidDark: 'bg-teal-500/16 text-teal-100',
        classicLight: 'bg-teal-50 border border-teal-200 text-teal-950',
        classicDark: 'bg-teal-950/45 border border-teal-800/50 text-teal-100',
        lightBadge: 'bg-teal-500/20 text-teal-900',
        darkBadge: 'bg-teal-400/25 text-teal-200',
        icon: <Play className="w-3.5 h-3.5 shrink-0 mt-0.5 text-teal-600" />,
      },
    };

    const meta = cueMeta[block.kind] ?? cueMeta.organizerCue;
    const surfaceClass = isFullLiquidWindow
      ? `${isDarkTheme ? meta.liquidDark : meta.liquidLight}`
      : isDarkTheme
      ? meta.classicDark
      : meta.classicLight;

    return (
      <div
        className={`px-3 py-1.5 rounded-xl flex items-start gap-2 transition-colors ${surfaceClass}`}
        style={{
          fontSize: `${Math.max(12.5, Math.round(fontSize * 0.52))}px`,
          lineHeight: 1.35,
        }}
      >
        {meta.icon}
        <div className="font-medium">
          <span
            className={`uppercase text-[10px] font-bold tracking-wider mr-1.5 px-1.5 py-0.5 rounded-md ${
              isDarkTheme ? meta.darkBadge : meta.lightBadge
            }`}
          >
            {meta.label}
          </span>
          <RichTextRenderer
            markdown={block.displayText}
            isActive={isActive}
            isDark={isDarkTheme}
            fontWeight={fontWeight}
            onPlaceholderClick={(token) => {
              setPreflightFocusToken(token);
              setIsPreflightOpen(true);
            }}
          />
        </div>
      </div>
    );
  };

  // Displacement scale driven by Liquidness (Refraction & Lens Curvature)
  const windowLensScale = Math.round(2 + (liquidness / 100) * 10);
  const buttonLensScale = Math.round(1 + (liquidness / 100) * 5);

  return (
    <div
      data-theme={themeMode}
      data-layout={windowLayoutMode}
      className="relative w-screen h-screen overflow-hidden select-none flex flex-col"
    >
      {/* Official Apple macOS 26 Tahoe SVG Optical Refraction Filter Pipeline */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed w-0 h-0 overflow-hidden"
      >
        <defs>
          <filter
            id="apple-tahoe-window-lens"
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.018"
              numOctaves={2}
              seed={7}
              result="lensNoise"
            />
            <feGaussianBlur in="lensNoise" stdDeviation="3" result="smoothLens" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="smoothLens"
              scale={windowLensScale}
              xChannelSelector="R"
              yChannelSelector="G"
              result="refractedWindow"
            />
            <feSpecularLighting
              in="smoothLens"
              surfaceScale={2.2}
              specularConstant={0.45}
              specularExponent={24}
              lightingColor="#ffffff"
              result="specularRim"
            >
              <fePointLight x={-160} y={-220} z={260} />
            </feSpecularLighting>
            <feComposite
              in="specularRim"
              in2="SourceAlpha"
              operator="in"
              result="clippedRim"
            />
            <feComposite
              in="refractedWindow"
              in2="clippedRim"
              operator="arithmetic"
              k1={0}
              k2={1}
              k3={0.18}
              k4={0}
            />
          </filter>

          <filter
            id="apple-tahoe-button-lens"
            x="-15%"
            y="-15%"
            width="130%"
            height="130%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.025 0.032"
              numOctaves={2}
              seed={11}
              result="btnNoise"
            />
            <feGaussianBlur in="btnNoise" stdDeviation="1.8" result="smoothBtn" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="smoothBtn"
              scale={buttonLensScale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* macOS Tahoe Menu Bar & 15-inch MacBook Air Camera Notch Safe Region */}
      <header
        aria-label="macOS System Menu Bar"
        style={{ height: TOP_MENU_BAR_HEIGHT }}
        className="relative z-40 w-full px-4 flex items-center justify-between gap-6 bg-slate-950/88 text-white/90 border-b border-white/10 backdrop-blur-md text-xs shrink-0"
      >
        {/* Zone 1: Brand / Menu Bar Utility Recovery Item */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuBarMenuOpen((v) => !v)}
              aria-label="CueGlass Studio Menu Bar Item"
              className="apple-glass-btn-dark flex items-center gap-2 px-2.5 py-1 rounded-md text-white font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <img
                src="/cueglass-icon.svg"
                alt=""
                className="w-4 h-4 rounded-sm"
              />
              <span>CueGlass Studio</span>
            </button>

            {isMenuBarMenuOpen && (
              <div
                role="menu"
                aria-label="Menu Bar Recovery Menu"
                className="liquid-glass-Popover absolute left-0 top-full mt-1.5 w-64 rounded-2xl border border-white/80 p-1.5 text-slate-900 shadow-2xl z-50 space-y-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsPanelVisible((v) => !v);
                    setIsMenuBarMenuOpen(false);
                  }}
                  className="apple-glass-btn w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-900 cursor-pointer"
                >
                  <span>
                    {isPanelVisible
                      ? 'Hide Script Overlay'
                      : 'Show Script Overlay'}
                  </span>
                  {isPanelVisible ? (
                    <EyeOff className="w-3.5 h-3.5 opacity-70" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 opacity-70" />
                  )}
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    toggleCollapseToBubble();
                    setIsMenuBarMenuOpen(false);
                  }}
                  className="apple-glass-btn w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-900 cursor-pointer"
                >
                  <span>
                    {isCollapsedToBubble
                      ? 'Expand Reading Panel'
                      : 'Collapse to Glass Dot'}
                  </span>
                  <span className="font-mono-tabular text-[11px] opacity-70">
                    ⌃⌥P
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    snapNearCamera();
                    setIsMenuBarMenuOpen(false);
                  }}
                  className="apple-glass-btn w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-900 cursor-pointer"
                >
                  <span>Near Camera</span>
                  <span className="font-mono-tabular text-[11px] opacity-70">
                    ⌃⌥H
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setWindowLayoutMode((m) =>
                      m === 'fullLiquidGlass' ? 'classicCard' : 'fullLiquidGlass'
                    );
                    setIsMenuBarMenuOpen(false);
                  }}
                  className="apple-glass-btn w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-900 cursor-pointer"
                >
                  <span>
                    {isFullLiquidWindow
                      ? 'Switch to Classic Card Layout'
                      : 'Switch to Full-Window Liquid Glass'}
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setThemeMode((m) => (m === 'light' ? 'dark' : 'light'));
                    setIsMenuBarMenuOpen(false);
                  }}
                  className="apple-glass-btn w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-900 cursor-pointer"
                >
                  <span>
                    {isDarkTheme
                      ? 'Switch to Apple Liquid Glass Light'
                      : 'Switch to Dark Obsidian Glass'}
                  </span>
                  <span className="font-mono-tabular text-[11px] opacity-70">
                    ⌘⇧T
                  </span>
                </button>

                <div className="my-1 border-t border-slate-900/10" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsAIPromptOpen(true);
                    setIsMenuBarMenuOpen(false);
                  }}
                  className="apple-glass-btn-prominent w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                >
                  <span>AI Script Prompt &amp; Syntax Guide…</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsShortcutsOpen(true);
                    setIsMenuBarMenuOpen(false);
                  }}
                  className="apple-glass-btn w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-900 cursor-pointer"
                >
                  <span>Liquid Glass Cap Settings…</span>
                  <span className="font-mono-tabular text-[11px] opacity-70">
                    ⌘,
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsEditorOpen(true);
                    setIsMenuBarMenuOpen(false);
                  }}
                  className="apple-glass-btn w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-900 cursor-pointer"
                >
                  <span>Open Script Editor…</span>
                  <span className="font-mono-tabular text-[11px] opacity-70">
                    ⌘E
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsNativeXcodeOpen(true);
                    setIsMenuBarMenuOpen(false);
                  }}
                  className="apple-glass-btn w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-900 cursor-pointer"
                >
                  <span>Native Xcode Project &amp; DMG…</span>
                </button>
              </div>
            )}
          </div>

          {/* 1-Click AI Script Prompt Studio & Direct Copy Button in Menu Bar */}
          <button
            type="button"
            onClick={() => setIsAIPromptOpen(true)}
            className="apple-glass-btn-dark inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sky-200 border border-sky-400/35 text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
            title="Open Universal AI Script Prompt & Structured Syntax Guide for Gemini, Claude, and ChatGPT"
          >
            <Sparkles className="w-3 h-3 text-sky-300" />
            <span>AI Prompt &amp; Syntax Guide</span>
          </button>

          <button
            type="button"
            onClick={handleQuickCopyAIPrompt}
            aria-label="Quick Copy AI Script Prompt"
            title="1-Click Copy Complete AI Instructions & Script Examples to Clipboard"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              quickCopiedPrompt
                ? 'apple-glass-btn-prominent text-white'
                : 'apple-glass-btn-dark text-slate-200'
            }`}
          >
            {quickCopiedPrompt ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copied AI Prompt!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="hidden lg:inline">Copy AI Instructions</span>
              </>
            )}
          </button>
        </div>

        {/* Center Camera Housing / Notch Reference (15-inch MacBook Air) */}
        <div
          aria-label="Built-in MacBook Camera Housing"
          className="hidden xl:flex items-center justify-center gap-2.5 px-5 h-full bg-black rounded-b-xl border-x border-b border-white/10 shadow-md shrink-0"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
          <span className="text-[10px] font-mono-tabular tracking-wider text-slate-400">
            1080p FaceTime HD Camera
          </span>
        </div>

        {/* Zone 3: Primary Action & Coexistence Mode Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              setWindowLayoutMode((m) =>
                m === 'fullLiquidGlass' ? 'classicCard' : 'fullLiquidGlass'
              )
            }
            className="apple-glass-btn-dark hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-200 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            title="Switch between Full-Window Liquid Glass and Classic Structured Card Layout"
          >
            <Layers className="w-3 h-3 text-sky-400" />
            <span>
              Layout:{' '}
              {isFullLiquidWindow ? 'Full Liquid Glass' : 'Classic Card'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setZoomBackdropStyle((s) =>
                s === 'darkZoom'
                  ? 'lightSlides'
                  : s === 'lightSlides'
                  ? 'studioDesk'
                  : 'darkZoom'
              )
            }
            className="apple-glass-btn-dark hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-200 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Video className="w-3 h-3" />
            <span>
              Backdrop:{' '}
              {zoomBackdropStyle === 'darkZoom'
                ? 'Dark Zoom'
                : zoomBackdropStyle === 'lightSlides'
                ? 'Light Slides'
                : 'Minimal Studio'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopySelfContainedDMGScript}
            title="Copies the entire self-contained macOS build script to clipboard — just paste (⌘V) in Terminal and press Return!"
            className="apple-glass-btn-prominent inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-white text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedBuildScript ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied! Paste in Terminal</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Terminal Builder</span>
              </>
            )}
          </button>

          <a
            href="/Build-Pathfinder-Glass-DMG.command"
            download="Build-Pathfinder-Glass-DMG.command"
            title="Download self-contained macOS .command file that automatically builds Release .app and exports the installable .dmg"
            className="apple-glass-btn-dark inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-white text-[11px] font-semibold transition-all whitespace-nowrap shrink-0"
          >
            <span>Download .command</span>
          </a>

          <button
            type="button"
            onClick={() => setIsNativeXcodeOpen(true)}
            className="apple-glass-btn-prominent inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-white text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Xcode &amp; .dmg</span>
          </button>
        </div>
      </header>

      {/* Main MacBook Air Screen Workspace (Simulated Zoom Coexistence Stage + Floating NSPanel) */}
      <main
        onClick={() => {
          setIsMenuBarMenuOpen(false);
          setIsBubbleContextMenuOpen(false);
        }}
        className={`relative flex-1 w-full overflow-hidden transition-colors duration-300 ${
          zoomBackdropStyle === 'darkZoom'
            ? 'bg-gradient-to-br from-[#0F172A] via-[#131F36] to-[#0B1120] text-slate-200'
            : zoomBackdropStyle === 'lightSlides'
            ? 'bg-gradient-to-br from-[#E2ECF8] via-[#EEF4FC] to-[#DBE7F6] text-slate-800'
            : 'bg-gradient-to-br from-[#1B2434] via-[#1F293B] to-[#111827] text-slate-200'
        }`}
      >
        {/* Subtle ambient studio background orbs behind the floating window so Liquid Glass refraction & blur are vividly visible */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className={`absolute left-1/2 -translate-x-1/2 -top-12 w-[560px] h-[280px] rounded-full blur-3xl transition-opacity ${
              zoomBackdropStyle === 'lightSlides'
                ? 'bg-gradient-to-r from-sky-300/65 via-blue-300/55 to-indigo-300/60 opacity-90'
                : 'bg-gradient-to-r from-sky-500/25 via-blue-500/20 to-indigo-500/25 opacity-85'
            }`}
          />
        </div>

        {/* Background Zoom Coexistence Stage (Bottom half of screen so top remains uncluttered near camera) */}
        <div className="w-full h-full flex flex-col justify-end p-5 pointer-events-auto">
          <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-end opacity-95">
            {/* Speaker Gallery / Slide Preview */}
            <div
              onClick={() => setActiveAppFocus('zoom')}
              className={`lg:col-span-8 rounded-2xl p-4 transition-colors cursor-pointer ${
                zoomBackdropStyle === 'lightSlides'
                  ? 'apple-glass-card text-slate-900'
                  : 'apple-glass-card-dark text-slate-100'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Video className="w-4 h-4 text-sky-400" />
                  <span>
                    Live Broadcast &amp; Meeting Coexistence Stage — Universal Multi-Event Studio
                  </span>
                </div>
                <span className="text-[11px] font-mono-tabular opacity-75">
                  Glass.{glassVariant} · Liquidness {liquidness}% · Blur {glassEffectLevel}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  {
                    name: 'Atheesha Anarga',
                    role: '01 · Host & Moderator',
                    secId: 'sec-01',
                  },
                  {
                    name: 'Asindu De Silva',
                    role: '04 · Artificial Intelligence',
                    secId: 'sec-04',
                  },
                  {
                    name: 'Sandeep Nilwakka',
                    role: '05 · Cybersecurity',
                    secId: 'sec-05',
                  },
                  {
                    name: 'Pansilu Jayawardane',
                    role: '07 · Systems & CS',
                    secId: 'sec-07',
                  },
                ].map((participant) => {
                  const isCurrentSpeaker =
                    activeSection?.id === participant.secId;
                  return (
                    <button
                      key={participant.name}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNavState((s) =>
                          jumpToSectionById(document, s, participant.secId)
                        );
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isCurrentSpeaker
                          ? 'apple-glass-btn-prominent text-white'
                          : zoomBackdropStyle === 'lightSlides'
                          ? 'apple-glass-btn text-slate-900'
                          : 'apple-glass-btn-dark text-slate-100'
                      }`}
                    >
                      <div className="text-xs font-semibold truncate">
                        {participant.name}
                      </div>
                      <div className="text-[10px] opacity-75 truncate mt-0.5">
                        {participant.role}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 pt-2.5 border-t border-current/10 flex flex-wrap items-center justify-between gap-2 text-[11px] opacity-80">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>
                    <strong>Zoom Share Safety:</strong> Share individual Slide/App Window (never Entire Screen) &amp; check participant preview.
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    snapNearCamera();
                  }}
                  className={`${
                    zoomBackdropStyle === 'lightSlides'
                      ? 'apple-glass-btn text-slate-900'
                      : 'apple-glass-btn-dark text-slate-100'
                  } px-2.5 py-1 text-[11px] font-semibold cursor-pointer`}
                >
                  Snap Script Near Camera (⌃⌥H)
                </button>
              </div>
            </div>

            {/* Simulated Zoom Chat Box to test non-activating keyboard coexistence */}
            <div
              onClick={() => setActiveAppFocus('zoom')}
              className={`lg:col-span-4 rounded-2xl p-3.5 transition-colors ${
                zoomBackdropStyle === 'lightSlides'
                  ? 'apple-glass-card text-slate-900'
                  : 'apple-glass-card-dark text-slate-100'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span>Zoom Chat Coexistence Test</span>
                </span>
                <span className="text-[10px] font-mono-tabular opacity-70">
                  {activeAppFocus === 'zoom' ? 'Zoom Active' : 'Background'}
                </span>
              </div>

              <div className="space-y-1.5 mb-2 max-h-20 overflow-y-auto text-[11px]">
                {zoomChatMessages.map((msg, i) => (
                  <div key={i} className="opacity-85 leading-snug">
                    <strong>{msg.sender}:</strong> {msg.text}
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!zoomChatDraft.trim()) return;
                  setZoomChatMessages((prev) => [
                    ...prev.slice(-3),
                    { sender: 'Atheesha (Host)', text: zoomChatDraft.trim() },
                  ]);
                  setZoomChatDraft('');
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={zoomChatDraft}
                  onFocus={() => setActiveAppFocus('zoom')}
                  onChange={(e) => setZoomChatDraft(e.target.value)}
                  placeholder="Type in Zoom chat (won't advance script)…"
                  aria-label="Simulate typing in Zoom chat"
                  className={`flex-1 px-3 py-1.5 rounded-full text-xs focus:outline-none ${
                    zoomBackdropStyle === 'lightSlides'
                      ? 'apple-glass-card text-slate-900'
                      : 'apple-glass-card-dark text-white placeholder:text-slate-400'
                  }`}
                />
                <button
                  type="submit"
                  className="apple-glass-btn-prominent px-3 py-1.5 text-white text-xs font-semibold shrink-0 cursor-pointer"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* FLOATING LIQUID GLASS OVERLAY: EITHER COLLAPSED BUBBLE OR EXPANDED READING PANEL */}
        {isPanelVisible && isCollapsedToBubble && (
          <div
            style={{
              left: bubbleFrame.x,
              top: bubbleFrame.y - TOP_MENU_BAR_HEIGHT,
              width: COLLAPSED_BUBBLE_SIZE.width,
              height: COLLAPSED_BUBBLE_SIZE.height,
            }}
            onPointerDown={(e) => startPointerDrag(e, 'moveBubble')}
            onContextMenu={(e) => {
              e.preventDefault();
              setIsBubbleContextMenuOpen((v) => !v);
            }}
            className="absolute z-30 liquid-bubble-morph"
          >
            <button
              type="button"
              onClick={() => {
                if (!dragInfoRef.current?.hasMoved) {
                  toggleCollapseToBubble();
                }
              }}
              aria-label="Expand CueGlass Script Panel"
              title={`CueGlass Studio · ${activeSection?.numberBadge} ${activeSection?.shortTitle} — Click to Expand, Drag to Move`}
              className={`${
                isDarkTheme
                  ? 'liquid-glass-shell-dark apple-glass-btn-dark text-white'
                  : 'liquid-glass-shell apple-glass-btn text-[#11141C]'
              } liquid-corner-morph-btn w-full h-full rounded-full border flex items-center justify-center relative hover:scale-110 transition-transform cursor-grab active:cursor-grabbing`}
            >
              <svg
                className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                viewBox="0 0 46 46"
              >
                <circle
                  cx="23"
                  cy="23"
                  r="20"
                  fill="none"
                  stroke={
                    isDarkTheme
                      ? 'rgba(56, 189, 248, 0.22)'
                      : 'rgba(35, 99, 217, 0.16)'
                  }
                  strokeWidth="2.5"
                />
                <circle
                  cx="23"
                  cy="23"
                  r="20"
                  fill="none"
                  stroke={isDarkTheme ? '#38BDF8' : '#2363D9'}
                  strokeWidth="2.5"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={
                    2 * Math.PI * 20 * (1 - liveProgressFraction)
                  }
                  strokeLinecap="round"
                />
              </svg>
              <Maximize2 className="w-4 h-4 transition-transform duration-300" />
            </button>
          </div>
        )}

        {isPanelVisible && !isCollapsedToBubble && (
          <section
            aria-label="Floating Script Reading Panel"
            onClick={() => setActiveAppFocus('panel')}
            style={{
              left: expandedFrame.x,
              top: expandedFrame.y - TOP_MENU_BAR_HEIGHT,
              width: expandedFrame.width,
              height: expandedFrame.height,
              background: glassPhysics.panelBackground,
              backdropFilter: glassPhysics.backdropFilter,
              WebkitBackdropFilter: glassPhysics.webkitBackdropFilter,
              boxShadow: glassPhysics.boxShadow,
            }}
            className={`${
              isFullLiquidWindow
                ? isDarkTheme
                  ? 'border-0 text-slate-100'
                  : 'border-0 text-[#0B0E14]'
                : isDarkTheme
                ? 'border border-[#283246] text-slate-100'
                : 'border border-slate-200 text-[#0B0E14]'
            } liquid-window-morph absolute z-30 rounded-[24px] flex flex-col overflow-visible transition-colors duration-200`}
          >
            {/* 1. MICRO HEADER (40pt high, draggable handle — No divider outline in Liquid Glass mode) */}
            <div
              onPointerDown={(e) => startPointerDrag(e, 'movePanel')}
              style={{ background: glassPhysics.barBackground }}
              className={`h-11 px-3.5 flex items-center justify-between gap-2 rounded-t-[24px] cursor-move shrink-0 transition-colors ${
                isFullLiquidWindow
                  ? 'border-b-0'
                  : isDarkTheme
                  ? 'border-b border-[#242E42]'
                  : 'border-b border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                {activeSection && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setIsEventDetailsOpen((v) => !v)}
                    title="Click to toggle event metadata"
                    className={`text-xs font-semibold truncate text-left cursor-pointer ${
                      isDarkTheme ? 'text-white' : 'text-[#0B0E14]'
                    }`}
                  >
                    <span
                      className={`font-mono-tabular mr-1.5 font-bold ${
                        isDarkTheme ? 'text-sky-400' : 'text-[#2363D9]'
                      }`}
                    >
                      {activeSection.numberBadge}
                    </span>
                    {activeSection.shortTitle}
                  </button>
                )}
              </div>

              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 shrink-0"
              >
                {unconfirmedCriticalPlaceholders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreflightFocusToken(null);
                      setIsPreflightOpen(true);
                    }}
                    title="Unconfirmed speaker placeholders — click to open Preflight Check"
                    className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      isDarkTheme
                        ? 'apple-glass-btn-dark text-amber-300'
                        : 'apple-glass-btn text-amber-800'
                    }`}
                  >
                    <AlertTriangle
                      className={`w-3 h-3 ${
                        isDarkTheme ? 'text-amber-300' : 'text-amber-600'
                      }`}
                    />
                    <span className="font-mono-tabular">
                      {unconfirmedCriticalPlaceholders.length}
                    </span>
                  </button>
                )}

                {/* 1-Click Copy AI Prompt & Syntax Guide Icon in Floating Panel Header (Icon Only) */}
                <button
                  type="button"
                  onClick={() => setIsAIPromptOpen(true)}
                  aria-label="AI Prompt and Syntax Guide"
                  title="AI Script Generator Master Prompt & Syntax Guide (Copy for Gemini, Claude, or ChatGPT)"
                  className={`p-1.5 flex items-center justify-center transition-all cursor-pointer ${
                    isDarkTheme
                      ? 'apple-glass-btn-dark text-sky-200'
                      : 'apple-glass-btn text-[#1849A9]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsToolsOpen(false);
                    setIsThemePopoverOpen(false);
                    setIsSectionsOpen((v) => !v);
                  }}
                  aria-label="Sections"
                  title="Sections Palette & Find"
                  className={`p-1.5 transition-all cursor-pointer ${
                    isSectionsOpen
                      ? 'apple-glass-btn-prominent text-white'
                      : isDarkTheme
                      ? 'apple-glass-btn-dark text-slate-200'
                      : 'apple-glass-btn text-slate-700'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSectionsOpen(false);
                    setIsThemePopoverOpen(false);
                    setIsToolsOpen((v) => !v);
                  }}
                  aria-label="Tools"
                  title="Backup Lines (10), Moderator Questions (11) & Organizer Checklist (12)"
                  className={`p-1.5 transition-all cursor-pointer ${
                    isToolsOpen
                      ? 'apple-glass-btn-prominent text-white'
                      : isDarkTheme
                      ? 'apple-glass-btn-dark text-slate-200'
                      : 'apple-glass-btn text-slate-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditorOpen(true)}
                  aria-label="Edit"
                  title="Edit Script, Syntax Guide & Rolling Versions (⌘E)"
                  className={`p-1.5 transition-all cursor-pointer ${
                    isDarkTheme
                      ? 'apple-glass-btn-dark text-slate-200'
                      : 'apple-glass-btn text-slate-700'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                {/* Small Settings gear icon for Liquid Glass Cap Settings & Theme toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSectionsOpen(false);
                    setIsToolsOpen(false);
                    setIsThemePopoverOpen((v) => !v);
                  }}
                  aria-label="Theme & Quick Settings"
                  title="Liquid Glass Cap Settings, Layout Mode & Light/Dark Theme"
                  className={`p-1.5 flex items-center justify-center transition-all cursor-pointer ${
                    isThemePopoverOpen
                      ? 'apple-glass-btn-prominent text-white'
                      : isDarkTheme
                      ? 'apple-glass-btn-dark text-slate-200'
                      : 'apple-glass-btn text-slate-700'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={toggleCollapseToBubble}
                  aria-label="Collapse"
                  title="Collapse to Draggable Liquid Glass Dot (⌃⌥P)"
                  className={`liquid-corner-morph-btn group/collapse p-1.5 cursor-pointer ${
                    isDarkTheme
                      ? 'apple-glass-btn-dark text-slate-200'
                      : 'apple-glass-btn text-slate-700'
                  }`}
                >
                  <Minimize2 className="w-3.5 h-3.5 transition-transform duration-300 group-hover/collapse:scale-90 group-hover/collapse:-rotate-12 group-active/collapse:scale-75" />
                </button>
              </div>
            </div>

            {/* Secondary Event Metadata Popover */}
            {isEventDetailsOpen && (
              <div
                className={`${
                  isDarkTheme
                    ? 'liquid-glass-Popover-dark text-slate-200'
                    : 'liquid-glass-Popover text-slate-700'
                } absolute left-3 top-12 z-40 w-72 rounded-2xl p-3.5 text-xs space-y-1`}
              >
                <div
                  className={`font-bold ${
                    isDarkTheme ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {document.metadata.title} — {document.metadata.subtitle}
                </div>
                {Object.keys(document.metadata.fields).map((k) => (
                  <div key={k}>
                    <strong>{k}:</strong> {document.metadata.fields[k]}
                  </div>
                ))}
              </div>
            )}

            {/* Compact Liquid Glass Cap Settings & Theme Popover (opened via the small gear icon) */}
            {isThemePopoverOpen && (
              <div
                role="dialog"
                aria-label="Liquid Glass Theme and Quick Cap Settings"
                className={`${
                  isDarkTheme
                    ? 'liquid-glass-Popover-dark text-slate-100'
                    : 'liquid-glass-Popover text-slate-900'
                } absolute right-3 top-12 z-40 w-80 rounded-2xl p-4 space-y-3.5 shadow-2xl`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider uppercase opacity-75">
                    Appearance &amp; Surface Mode
                  </span>
                  <kbd className="text-[10px] font-mono-tabular opacity-65">
                    ⌘⇧T
                  </kbd>
                </div>

                {/* Clean Light / Dark Theme Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setThemeMode('light')}
                    className={`px-3 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                      !isDarkTheme
                        ? 'apple-glass-btn-prominent text-white'
                        : isDarkTheme
                        ? 'apple-glass-btn-dark text-slate-200'
                        : 'apple-glass-btn text-slate-800'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Light Theme</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setThemeMode('dark')}
                    className={`px-3 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                      isDarkTheme
                        ? 'apple-glass-btn-prominent text-white'
                        : 'apple-glass-btn text-slate-800'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                    <span>Dark Theme</span>
                  </button>
                </div>

                {/* 1-Click Tahoe Dark Glass & Tahoe Clear Light Quick Presets */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode('dark');
                      setWindowLayoutMode('fullLiquidGlass');
                      setGlassVariant('identity');
                      setGlassTintPreset('crystalNeutral');
                      setGlassInteractive(true);
                      setLiquidness(100);
                      setTransparency(10);
                      setGlassEffectLevel(15);
                      setActiveBeatGlow(21);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                      isDarkTheme &&
                      isFullLiquidWindow &&
                      glassVariant === 'identity' &&
                      liquidness === 100 &&
                      transparency === 10
                        ? 'apple-glass-btn-prominent text-white'
                        : isDarkTheme
                        ? 'apple-glass-btn-dark text-slate-200'
                        : 'apple-glass-btn text-slate-700'
                    }`}
                    title="Apply exact Tahoe Dark Glass preset (Glass.identity, Liquidness 100%, Transparency 10%, Glass Effect 15%, Active Glow 21%)"
                  >
                    Tahoe Dark Glass
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode('light');
                      setWindowLayoutMode('fullLiquidGlass');
                      setGlassVariant('clear');
                      setGlassTintPreset('crystalNeutral');
                      setGlassInteractive(true);
                      setLiquidness(86);
                      setTransparency(82);
                      setGlassEffectLevel(90);
                      setActiveBeatGlow(82);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                      !isDarkTheme &&
                      isFullLiquidWindow &&
                      glassVariant === 'clear'
                        ? 'apple-glass-btn-prominent text-white'
                        : isDarkTheme
                        ? 'apple-glass-btn-dark text-slate-200'
                        : 'apple-glass-btn text-slate-700'
                    }`}
                  >
                    Apple Clear Glass
                  </button>
                </div>

                {/* Window Surface Layout Mode Toggle */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    Window Surface Mode
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWindowLayoutMode('fullLiquidGlass')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isFullLiquidWindow
                          ? 'apple-glass-btn-prominent text-white'
                          : isDarkTheme
                          ? 'apple-glass-btn-dark text-slate-200'
                          : 'apple-glass-btn text-slate-700'
                      }`}
                    >
                      Liquid Glass
                    </button>
                    <button
                      type="button"
                      onClick={() => setWindowLayoutMode('classicCard')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        !isFullLiquidWindow
                          ? 'apple-glass-btn-prominent text-white'
                          : isDarkTheme
                          ? 'apple-glass-btn-dark text-slate-200'
                          : 'apple-glass-btn text-slate-700'
                      }`}
                    >
                      Classic Card UI
                    </button>
                  </div>
                </div>

                {/* Only show Apple Clear Liquid Glass Variant & Sliders when Liquid Glass Mode is ON */}
                {isFullLiquidWindow ? (
                  <>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                        Apple Liquid Glass Variant
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: 'clear', label: 'Clear' },
                            { id: 'regular', label: 'Regular' },
                            { id: 'identity', label: 'Identity' },
                          ] as { id: AppleGlassVariant; label: string }[]
                        ).map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setGlassVariant(v.id)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                              glassVariant === v.id
                                ? 'apple-glass-btn-prominent text-white'
                                : isDarkTheme
                                ? 'apple-glass-btn-dark text-slate-200'
                                : 'apple-glass-btn text-slate-700'
                            }`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      <div>
                        <div className="flex justify-between text-[11px] font-medium mb-1">
                          <span>Liquidness (Refraction)</span>
                          <span className="font-mono-tabular font-bold">
                            {liquidness}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={liquidness}
                          onChange={(e) => setLiquidness(Number(e.target.value))}
                          aria-label="Quick Liquidness"
                          className="apple-glass-slider"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-medium mb-1">
                          <span>Transparency</span>
                          <span className="font-mono-tabular font-bold">
                            {transparency}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={95}
                          value={transparency}
                          onChange={(e) =>
                            setTransparency(Number(e.target.value))
                          }
                          aria-label="Quick Transparency"
                          className="apple-glass-slider"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-medium mb-1">
                          <span>Glass Effect Level (Blur)</span>
                          <span className="font-mono-tabular font-bold">
                            {glassEffectLevel}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={15}
                          max={100}
                          value={glassEffectLevel}
                          onChange={(e) =>
                            setGlassEffectLevel(Number(e.target.value))
                          }
                          aria-label="Quick Glass Effect Level"
                          className="apple-glass-slider"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="apple-glass-card p-2.5 text-[11px] opacity-80">
                    Classic Card UI active — all Liquid Glass blur, lens refraction, and glass pill effects are turned off.
                  </div>
                )}

                {/* Font Size & Font Boldness */}
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-tabular font-medium">
                      Size: {fontSize}px · Weight: {fontWeight}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFontSize((f) => Math.max(18, f - 2))}
                        className={`px-2.5 py-0.5 text-xs font-semibold cursor-pointer ${
                          isDarkTheme
                            ? 'apple-glass-btn-dark text-slate-100'
                            : 'apple-glass-btn text-slate-800'
                        }`}
                      >
                        A-
                      </button>
                      <button
                        type="button"
                        onClick={() => setFontSize((f) => Math.min(48, f + 2))}
                        className={`px-2.5 py-0.5 text-xs font-semibold cursor-pointer ${
                          isDarkTheme
                            ? 'apple-glass-btn-dark text-slate-100'
                            : 'apple-glass-btn text-slate-800'
                        }`}
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {([400, 500, 600, 700] as FontWeightOption[]).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setFontWeight(w)}
                        className={`py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          fontWeight === w
                            ? 'apple-glass-btn-prominent text-white'
                            : isDarkTheme
                            ? 'apple-glass-btn-dark text-slate-300'
                            : 'apple-glass-btn text-slate-700'
                        }`}
                      >
                        {w === 400
                          ? 'Reg'
                          : w === 500
                          ? 'Med'
                          : w === 600
                          ? 'Semi'
                          : 'Bold'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Auto Voice Follow Word Darkening Toggle */}
                <div className="space-y-1.5 pt-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    Voice Follow · Spoken Word Darkening
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setVoiceDarkenWords(true)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                        voiceDarkenWords
                          ? 'apple-glass-btn-prominent text-white'
                          : isDarkTheme
                          ? 'apple-glass-btn-dark text-slate-200'
                          : 'apple-glass-btn text-slate-700'
                      }`}
                    >
                      Darken Words
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoiceDarkenWords(false)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                        !voiceDarkenWords
                          ? 'apple-glass-btn-prominent text-white'
                          : isDarkTheme
                          ? 'apple-glass-btn-dark text-slate-200'
                          : 'apple-glass-btn text-slate-700'
                      }`}
                    >
                      Clean (No Darken)
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsThemePopoverOpen(false);
                    setIsShortcutsOpen(true);
                  }}
                  className={`w-full px-3.5 py-2 flex items-center justify-between text-xs font-semibold cursor-pointer ${
                    isDarkTheme
                      ? 'apple-glass-btn-dark text-sky-300'
                      : 'apple-glass-btn text-[#1849A9]'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>All Cap Settings &amp; Shortcuts…</span>
                  </span>
                  <span>→</span>
                </button>
              </div>
            )}

            {/* Popover Anchors for Sections & Tools */}
            {isSectionsOpen && (
              <div className="absolute right-3 top-12 z-40">
                <SectionsPalette
                  document={document}
                  activeSectionID={activeSection?.id ?? ''}
                  activeBeatID={navState.activeBeatID}
                  onSelectSection={(secID) =>
                    setNavState((s) => jumpToSectionById(document, s, secID))
                  }
                  onSelectBeat={(beatID) =>
                    setNavState((s) => selectBeatById(document, s, beatID))
                  }
                  onOpenOnDemandTab={(tabIndex) => {
                    setToolsInitialTab(tabIndex);
                    setIsToolsOpen(true);
                  }}
                  onClose={() => setIsSectionsOpen(false)}
                />
              </div>
            )}

            {isToolsOpen && (
              <div className="absolute right-3 top-12 z-40">
                <QuickReferencePopover
                  document={document}
                  initialTab={toolsInitialTab}
                  activeOnDemandSnippet={navState.activeOnDemandSnippet}
                  checklistState={checklistState}
                  onInvokeSnippet={(snippet: EmergencySnippet) =>
                    setNavState((s) => invokeSnippet(document, s, snippet))
                  }
                  onReturnToLive={() =>
                    setNavState((s) => returnToLiveBeat(document, s))
                  }
                  onToggleChecklist={handleToggleChecklist}
                  onClose={() => setIsToolsOpen(false)}
                />
              </div>
            )}

            {/* Section 08 Live Q&A Quick-Pick Bar */}
            {!navState.activeOnDemandSnippet &&
              activeSection?.number === 8 &&
              activeSection.subsections.length > 0 && (
                <div
                  className={`px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto shrink-0 ${
                    isFullLiquidWindow
                      ? ''
                      : isDarkTheme
                      ? 'border-b border-[#242E42]'
                      : 'border-b border-slate-200'
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold tracking-wider uppercase mr-1 shrink-0 ${
                      isDarkTheme ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Q&amp;A Flow:
                  </span>
                  {activeSection.subsections.map((sub) => {
                    const isSubActive = sub.blocks.some(
                      (b) => b.id === navState.activeBeatID
                    );
                    const targetId =
                      sub.firstNavigableBlockID || sub.blocks[0]?.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          if (targetId) {
                            setNavState((s) =>
                              selectBeatById(document, s, targetId)
                            );
                          }
                        }}
                        className={`px-2.5 py-1 text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          isSubActive
                            ? 'apple-glass-btn-prominent text-white'
                            : isDarkTheme
                            ? 'apple-glass-btn-dark text-slate-200'
                            : 'apple-glass-btn text-slate-700'
                        }`}
                      >
                        {sub.shortQALabel ?? sub.title}
                      </button>
                    );
                  })}
                </div>
              )}

            {/* 2. READING VIEWPORT */}
            <div
              ref={readingViewportRef}
              style={{ background: glassPhysics.viewportBackground }}
              className="pg-scroll flex-1 overflow-y-auto px-4 pt-3 pb-28 space-y-2.5 transition-colors"
            >
              {navState.activeOnDemandSnippet ? (
                <div className="apple-glass-card p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-bold tracking-wider uppercase ${
                        isDarkTheme ? 'text-sky-400' : 'text-[#2363D9]'
                      }`}
                    >
                      ON-DEMAND · {navState.activeOnDemandSnippet.category}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setNavState((s) => returnToLiveBeat(document, s))
                      }
                      className="apple-glass-btn-prominent inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return to live position</span>
                    </button>
                  </div>

                  <div
                    className={`text-xs font-semibold ${
                      isDarkTheme ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {navState.activeOnDemandSnippet.title}
                  </div>

                  <div
                    style={{
                      fontSize: `${fontSize}px`,
                      lineHeight: lineHeight,
                    }}
                    className={`space-y-3 ${
                      isDarkTheme ? 'text-white' : 'text-[#0B0E14]'
                    }`}
                  >
                    {navState.activeOnDemandSnippet.spokenLines.map(
                      (line, idx) => (
                        <p key={idx}>
                          <RichTextRenderer
                            markdown={line}
                            isActive={true}
                            isDark={isDarkTheme}
                            fontWeight={fontWeight}
                            onPlaceholderClick={(token) => {
                              setPreflightFocusToken(token);
                              setIsPreflightOpen(true);
                            }}
                          />
                        </p>
                      )
                    )}
                  </div>

                  {navState.activeOnDemandSnippet.cues.map((note, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl text-xs font-medium flex items-start gap-2 ${
                        isDarkTheme
                          ? 'bg-amber-500/16 text-amber-200'
                          : 'bg-amber-500/14 text-amber-950'
                      }`}
                    >
                      <Info
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isDarkTheme ? 'text-amber-300' : 'text-amber-600'
                        }`}
                      />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={
                    narrowWidth
                      ? 'max-w-[44ch] mx-auto space-y-2.5'
                      : 'space-y-2.5'
                  }
                >
                  {activeSection?.blocks.map((block: ScriptBlock) => {
                    if (isCueBlock(block.kind) && !showOrganizerCues) {
                      return null;
                    }

                    if (block.kind === 'divider') {
                      return (
                        <hr
                          key={block.id}
                          className={`my-2 ${
                            isFullLiquidWindow
                              ? 'border-transparent'
                              : isDarkTheme
                              ? 'border-white/10'
                              : 'border-slate-200'
                          }`}
                        />
                      );
                    }

                    const isActive = block.id === navState.activeBeatID;
                    const isCue = isCueBlock(block.kind);

                    return (
                      <div
                        key={block.id}
                        ref={(el) => {
                          beatElementsRef.current[block.id] = el;
                        }}
                        onClick={() => {
                          setNavState((s) =>
                            selectBeatById(document, s, block.id)
                          );
                        }}
                        style={isActive ? glassPhysics.activeBeatStyle : undefined}
                        className={`group flex items-stretch gap-2.5 ${
                          isCue ? 'px-2.5 py-1' : 'px-3 py-2'
                        } rounded-2xl transition-all cursor-pointer ${
                          isFullLiquidWindow
                            ? isActive
                              ? 'border-0'
                              : isDarkTheme
                              ? 'border-0 hover:bg-white/[0.04]'
                              : 'border-0 hover:bg-white/30'
                            : isActive
                            ? 'border'
                            : isDarkTheme
                            ? 'border border-transparent hover:bg-white/[0.04]'
                            : 'border border-transparent hover:bg-slate-100/80'
                        }`}
                      >
                        {/* Slim Left-Edge Focus Marker */}
                        <div
                          aria-hidden="true"
                          className={`w-1 rounded-full shrink-0 transition-colors ${
                            isActive
                              ? isDarkTheme
                                ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                                : 'bg-[#2363D9] shadow-[0_0_8px_rgba(35,99,217,0.35)]'
                              : isDarkTheme
                              ? 'bg-transparent group-hover:bg-white/20'
                              : 'bg-transparent group-hover:bg-slate-400/50'
                          }`}
                        />

                        <div className="flex-1 min-w-0">
                          {block.kind === 'subsectionHeading' ? (
                            <div
                              className={`text-xs font-bold tracking-wider uppercase pt-0.5 ${
                                isActive
                                  ? isDarkTheme
                                    ? 'text-sky-400'
                                    : 'text-[#2363D9]'
                                  : isDarkTheme
                                  ? 'text-slate-400'
                                  : 'text-slate-600'
                              }`}
                            >
                              {block.displayText}
                            </div>
                          ) : isCue ? (
                            renderCueCard(block, isActive)
                          ) : (
                            <div
                              style={{
                                fontSize: `${fontSize}px`,
                                lineHeight: lineHeight,
                                fontWeight: fontWeight,
                              }}
                              className={
                                isActive
                                  ? isDarkTheme
                                    ? 'text-white'
                                    : 'text-[#07090E]'
                                  : isDarkTheme
                                  ? 'text-slate-200/90'
                                  : 'text-[#1E293B]'
                              }
                            >
                              <RichTextRenderer
                                markdown={block.rawMarkdown}
                                isActive={isActive}
                                isDark={isDarkTheme}
                                fontWeight={fontWeight}
                                spokenWordCount={isActive ? spokenWordCount : 0}
                                isVoiceListening={isActive && isVoiceListening}
                                darkenSpokenWords={voiceDarkenWords}
                                spokenWordOpacity={voiceDarkenOpacity}
                                showTargetUnderline={voiceShowTargetUnderline}
                                onPlaceholderClick={(token) => {
                                  setPreflightFocusToken(token);
                                  setIsPreflightOpen(true);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. BOTTOM CONTROLS (Responsive single-row layout, no divider line in Liquid Glass mode) */}
            <div
              style={{ background: glassPhysics.barBackground }}
              className={`h-11 px-3 flex items-center justify-between gap-1.5 rounded-b-[24px] shrink-0 relative overflow-hidden transition-colors ${
                isFullLiquidWindow
                  ? 'border-t-0'
                  : isDarkTheme
                  ? 'border-t border-[#242E42]'
                  : 'border-t border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setNavState((s) => stepPrevBeat(document, s))}
                  aria-label="Previous Beat"
                  title="Previous Beat (← or Shift+Space or ⌃⌥←)"
                  className={`w-7 h-7 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    isDarkTheme
                      ? 'apple-glass-btn-dark text-slate-100'
                      : 'apple-glass-btn text-slate-800'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setNavState((s) => stepNextBeat(document, s))}
                  aria-label="Next Beat"
                  title="Next Beat (→ or Space or ⌃⌥→)"
                  className={`w-7 h-7 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    isDarkTheme
                      ? 'apple-glass-btn-dark text-slate-100'
                      : 'apple-glass-btn text-slate-800'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* In-Place Play/Stop Toggle for Siri Dictation Voice Auto-Follow */}
                <button
                  type="button"
                  onClick={() => setIsVoiceListening((v) => !v)}
                  aria-label="Toggle Voice Auto-Follow"
                  aria-pressed={isVoiceListening}
                  title={
                    isVoiceListening
                      ? voiceMicStatus === 'permission-denied'
                        ? 'Microphone permission required — allow microphone access for live word-by-word voice tracking'
                        : 'Stop Siri Dictation Voice Auto-Follow (Strictly listens to spoken words in order with mispronunciation recovery)'
                      : 'Start Siri Dictation Voice Auto-Follow — listens to your exact words in order, tolerates mispronunciations, and auto-advances on line completion'
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isVoiceListening
                      ? 'apple-glass-btn-prominent text-white'
                      : isDarkTheme
                      ? 'apple-glass-btn-dark text-slate-200'
                      : 'apple-glass-btn text-slate-700'
                  }`}
                >
                  {isVoiceListening ? (
                    <>
                      <Square className="w-3 h-3 fill-current shrink-0" />
                      <span>Stop Voice</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                          voiceMicStatus === 'permission-denied'
                            ? 'bg-amber-300'
                            : 'bg-emerald-300'
                        }`}
                      />
                      {activeBlock && activeBlock.kind === 'spokenLine' && (
                        <span
                          data-testid="voice-word-progress"
                          className="ml-0.5 text-[10px] font-mono-tabular opacity-90"
                        >
                          {spokenWordCount}/
                          {extractSpeakableWords(activeBlock.rawMarkdown).length}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current shrink-0" />
                      <span>Voice Follow</span>
                    </>
                  )}
                </button>
                {isVoiceListening && lastMatchedVoiceWord && (
                  <span
                    data-testid="voice-last-matched-word"
                    className={`hidden md:inline-flex items-center gap-1 text-[10px] font-mono-tabular px-1.5 py-0.5 rounded shrink-0 ${
                      isDarkTheme ? 'text-emerald-300/90' : 'text-emerald-700'
                    }`}
                    title="Last recognized script word"
                  >
                    <Mic className="w-2.5 h-2.5 shrink-0" />
                    {lastMatchedVoiceWord}
                  </span>
                )}

                {activeSection && (
                  <span
                    className={`ml-1 text-xs font-medium font-mono-tabular truncate min-w-0 ${
                      isDarkTheme ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <span className="hidden sm:inline">
                      {activeSection.shortTitle} ·{' '}
                    </span>
                    Beat {beatPosition.index}/{beatPosition.total}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pr-2">
                {activeBlock?.id === activeSection?.thankSpeakerWaypointBlockID &&
                  activeSection &&
                  activeSection.number < 9 && (
                    <button
                      type="button"
                      onClick={() =>
                        setNavState((s) => stepNextSection(document, s))
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        isDarkTheme
                          ? 'apple-glass-btn-dark text-slate-100'
                          : 'apple-glass-btn text-slate-800'
                      }`}
                    >
                      <span>Next (↓)</span>
                    </button>
                  )}

                <button
                  type="button"
                  onClick={snapNearCamera}
                  aria-label="Position Near Camera"
                  title="Snap panel top-center below camera notch (⌃⌥H)"
                  className={`w-7 h-7 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    isDarkTheme
                      ? 'apple-glass-btn-dark text-slate-200'
                      : 'apple-glass-btn text-slate-700'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Resize Handle */}
              <div
                onPointerDown={(e) => startPointerDrag(e, 'resizePanel')}
                title="Drag to resize panel (360×180 to 850×650)"
                className="absolute right-1.5 bottom-1.5 w-3.5 h-3.5 cursor-nwse-resize opacity-35 hover:opacity-85 flex items-end justify-end p-0.5"
              >
                <svg width="8" height="8" viewBox="0 0 8 8">
                  <path
                    d="M7 1L1 7M7 4L4 7"
                    stroke={isDarkTheme ? '#E2E8F0' : '#11141C'}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Modals */}
      {isAIPromptOpen && (
        <AIPromptGuideModal
          onLoadScriptPreset={(markdown, label) => {
            handleSaveMarkdown(markdown, label);
          }}
          onClose={() => setIsAIPromptOpen(false)}
        />
      )}

      {isPreflightOpen && (
        <PreflightModal
          document={document}
          acknowledgedIDs={acknowledgedPlaceholders}
          checklistState={checklistState}
          initialFocusToken={preflightFocusToken}
          onToggleAcknowledge={handleToggleAcknowledgePlaceholder}
          onResolveTokenInScript={handleResolvePlaceholderInScript}
          onJumpToBeat={(beatID) =>
            setNavState((s) => selectBeatById(document, s, beatID))
          }
          onClose={() => setIsPreflightOpen(false)}
        />
      )}

      {isEditorOpen && (
        <ScriptEditorModal
          workingMarkdown={workingMarkdown}
          revisions={revisions}
          lastSaveError={lastSaveError}
          onSaveMarkdown={handleSaveMarkdown}
          onRestoreBundledOriginal={handleRestoreBundled}
          onSimulateCorruptionAndRecover={handleSimulateCorruptionRecovery}
          onClose={() => setIsEditorOpen(false)}
        />
      )}

      {isShortcutsOpen && (
        <ShortcutsSettingsModal
          themeMode={themeMode}
          windowLayoutMode={windowLayoutMode}
          glassVariant={glassVariant}
          glassTintPreset={glassTintPreset}
          glassInteractive={glassInteractive}
          liquidness={liquidness}
          transparency={transparency}
          glassEffectLevel={glassEffectLevel}
          fontWeight={fontWeight}
          fontSize={fontSize}
          lineHeight={lineHeight}
          activeBeatGlow={activeBeatGlow}
          narrowWidth={narrowWidth}
          showOrganizerCues={showOrganizerCues}
          reduceMotion={reduceMotion}
          bareArrowCaptureEnabled={bareArrowCaptureEnabled}
          bareArrowPermissionState={bareArrowPermissionState}
          isVoiceListening={isVoiceListening}
          voiceDarkenWords={voiceDarkenWords}
          voiceDarkenOpacity={voiceDarkenOpacity}
          voiceShowTargetUnderline={voiceShowTargetUnderline}
          audioInputDevices={audioInputDevices}
          selectedAudioDeviceId={selectedAudioDeviceId}
          voiceAudioLevel={voiceAudioLevel}
          onChangeThemeMode={setThemeMode}
          onChangeWindowLayoutMode={setWindowLayoutMode}
          onChangeGlassVariant={setGlassVariant}
          onChangeGlassTintPreset={setGlassTintPreset}
          onToggleGlassInteractive={() => setGlassInteractive((v) => !v)}
          onChangeLiquidness={setLiquidness}
          onChangeTransparency={setTransparency}
          onChangeGlassEffectLevel={setGlassEffectLevel}
          onChangeFontWeight={setFontWeight}
          onChangeFontSize={setFontSize}
          onChangeLineHeight={setLineHeight}
          onChangeActiveBeatGlow={setActiveBeatGlow}
          onToggleNarrowWidth={() => setNarrowWidth((v) => !v)}
          onToggleOrganizerCues={() => setShowOrganizerCues((v) => !v)}
          onToggleReduceMotion={() => setReduceMotion((v) => !v)}
          onSetBareArrowCapture={setBareArrowCaptureEnabled}
          onSetBareArrowPermissionState={setBareArrowPermissionState}
          onToggleVoiceListening={() => setIsVoiceListening((v) => !v)}
          onChangeVoiceDarkenWords={setVoiceDarkenWords}
          onChangeVoiceDarkenOpacity={setVoiceDarkenOpacity}
          onToggleVoiceShowTargetUnderline={() =>
            setVoiceShowTargetUnderline((v) => !v)
          }
          onChangeSelectedAudioDeviceId={setSelectedAudioDeviceId}
          onRefreshAudioDevices={refreshAudioDevices}
          onApplyPreset={(preset) => {
            setThemeMode(preset.themeMode);
            setWindowLayoutMode(preset.windowLayoutMode);
            if (preset.glassVariant !== undefined) {
              setGlassVariant(preset.glassVariant);
            }
            if (preset.glassTintPreset !== undefined) {
              setGlassTintPreset(preset.glassTintPreset);
            }
            if (preset.glassInteractive !== undefined) {
              setGlassInteractive(preset.glassInteractive);
            }
            setLiquidness(preset.liquidness);
            setTransparency(preset.transparency);
            setGlassEffectLevel(preset.glassEffectLevel);
            setFontWeight(preset.fontWeight);
            setFontSize(preset.fontSize);
            setLineHeight(preset.lineHeight);
            setActiveBeatGlow(preset.activeBeatGlow);
          }}
          onClose={() => setIsShortcutsOpen(false)}
        />
      )}

      {isNativeXcodeOpen && (
        <NativeXcodeModal onClose={() => setIsNativeXcodeOpen(false)} />
      )}
    </div>
  );
}
