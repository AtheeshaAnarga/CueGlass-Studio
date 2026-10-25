import React, { useState } from 'react';
import {
  Droplets,
  Eye,
  Keyboard,
  Layers,
  Mic,
  Moon,
  ShieldAlert,
  Sliders,
  Sparkles,
  Sun,
  Type,
  X,
} from 'lucide-react';
import {
  AppleGlassTintPreset,
  AppleGlassVariant,
  FontWeightOption,
  WindowLayoutMode,
} from '../core/types';

interface ShortcutsSettingsModalProps {
  themeMode: 'light' | 'dark';
  windowLayoutMode: WindowLayoutMode;
  glassVariant: AppleGlassVariant;
  glassTintPreset: AppleGlassTintPreset;
  glassInteractive: boolean;
  liquidness: number;
  transparency: number;
  glassEffectLevel: number;
  fontWeight: FontWeightOption;
  fontSize: number;
  lineHeight: number;
  activeBeatGlow: number;
  narrowWidth: boolean;
  showOrganizerCues: boolean;
  reduceMotion: boolean;
  bareArrowCaptureEnabled: boolean;
  bareArrowPermissionState: 'granted' | 'prompt' | 'denied';
  isVoiceListening: boolean;
  voiceDarkenWords: boolean;
  voiceDarkenOpacity: number;
  voiceShowTargetUnderline: boolean;
  audioInputDevices: Array<{ deviceId: string; label: string }>;
  selectedAudioDeviceId: string;
  voiceAudioLevel: number;
  onChangeThemeMode: (mode: 'light' | 'dark') => void;
  onChangeWindowLayoutMode: (mode: WindowLayoutMode) => void;
  onChangeGlassVariant: (variant: AppleGlassVariant) => void;
  onChangeGlassTintPreset: (tint: AppleGlassTintPreset) => void;
  onToggleGlassInteractive: () => void;
  onChangeLiquidness: (val: number) => void;
  onChangeTransparency: (val: number) => void;
  onChangeGlassEffectLevel: (val: number) => void;
  onChangeFontWeight: (weight: FontWeightOption) => void;
  onChangeFontSize: (size: number) => void;
  onChangeLineHeight: (lh: number) => void;
  onChangeActiveBeatGlow: (glow: number) => void;
  onToggleNarrowWidth: () => void;
  onToggleOrganizerCues: () => void;
  onToggleReduceMotion: () => void;
  onSetBareArrowCapture: (enabled: boolean) => void;
  onSetBareArrowPermissionState: (state: 'granted' | 'prompt' | 'denied') => void;
  onToggleVoiceListening: () => void;
  onChangeVoiceDarkenWords: (darken: boolean) => void;
  onChangeVoiceDarkenOpacity: (opacity: number) => void;
  onToggleVoiceShowTargetUnderline: () => void;
  onChangeSelectedAudioDeviceId: (deviceId: string) => void;
  onRefreshAudioDevices: () => void;
  onApplyPreset: (preset: {
    themeMode: 'light' | 'dark';
    windowLayoutMode: WindowLayoutMode;
    glassVariant?: AppleGlassVariant;
    glassTintPreset?: AppleGlassTintPreset;
    glassInteractive?: boolean;
    liquidness: number;
    transparency: number;
    glassEffectLevel: number;
    fontWeight: FontWeightOption;
    fontSize: number;
    lineHeight: number;
    activeBeatGlow: number;
  }) => void;
  onClose: () => void;
}

const FONT_WEIGHT_OPTIONS: Array<{ value: FontWeightOption; label: string }> = [
  { value: 400, label: 'Regular (400)' },
  { value: 500, label: 'Medium (500)' },
  { value: 600, label: 'Semibold (600)' },
  { value: 700, label: 'Bold (700)' },
];

const GLASS_VARIANTS: Array<{
  value: AppleGlassVariant;
  title: string;
  subtitle: string;
}> = [
  {
    value: 'regular',
    title: 'Glass.regular',
    subtitle: 'Adaptive refraction & luminance',
  },
  {
    value: 'clear',
    title: 'Glass.clear',
    subtitle: 'High-translucency crystal lens',
  },
  {
    value: 'identity',
    title: 'Glass.identity',
    subtitle: 'Zero-distortion pass-through',
  },
];

const TINT_PRESETS: Array<{
  value: AppleGlassTintPreset;
  label: string;
  swatch: string;
}> = [
  { value: 'crystalNeutral', label: 'Crystal Neutral', swatch: 'bg-white border-slate-300' },
  { value: 'tahoeBlue', label: 'Tahoe Sky', swatch: 'bg-sky-500 border-sky-300' },
  { value: 'ultraviolet', label: 'Ultraviolet', swatch: 'bg-violet-500 border-violet-300' },
  { value: 'emeraldMist', label: 'Emerald Mist', swatch: 'bg-emerald-500 border-emerald-300' },
  { value: 'amberGold', label: 'Warm Gold', swatch: 'bg-amber-500 border-amber-300' },
];

export const ShortcutsSettingsModal: React.FC<ShortcutsSettingsModalProps> = ({
  themeMode,
  windowLayoutMode,
  glassVariant,
  glassTintPreset,
  glassInteractive,
  liquidness,
  transparency,
  glassEffectLevel,
  fontWeight,
  fontSize,
  lineHeight,
  activeBeatGlow,
  narrowWidth,
  showOrganizerCues,
  reduceMotion,
  bareArrowCaptureEnabled,
  bareArrowPermissionState,
  isVoiceListening,
  voiceDarkenWords,
  voiceDarkenOpacity,
  voiceShowTargetUnderline,
  audioInputDevices,
  selectedAudioDeviceId,
  voiceAudioLevel,
  onChangeThemeMode,
  onChangeWindowLayoutMode,
  onChangeGlassVariant,
  onChangeGlassTintPreset,
  onToggleGlassInteractive,
  onChangeLiquidness,
  onChangeTransparency,
  onChangeGlassEffectLevel,
  onChangeFontWeight,
  onChangeFontSize,
  onChangeLineHeight,
  onChangeActiveBeatGlow,
  onToggleNarrowWidth,
  onToggleOrganizerCues,
  onToggleReduceMotion,
  onSetBareArrowCapture,
  onSetBareArrowPermissionState,
  onToggleVoiceListening,
  onChangeVoiceDarkenWords,
  onChangeVoiceDarkenOpacity,
  onToggleVoiceShowTargetUnderline,
  onChangeSelectedAudioDeviceId,
  onRefreshAudioDevices,
  onApplyPreset,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'glass' | 'typography' | 'shortcuts'>('glass');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Liquid Glass Cap Settings and Keyboard Studio"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4"
    >
      <div className="liquid-glass-shell w-full max-w-2xl rounded-3xl text-[#11141C] overflow-hidden flex flex-col max-h-[88vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl apple-glass-btn-prominent flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Official Apple Tahoe Liquid Glass Cap Settings
              </h2>
              <p className="text-xs text-slate-600">
                NSGlassEffectView · GlassEffectContainer · .glassEffect(.clear.tint().interactive())
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings"
            className="apple-glass-btn p-2 text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
          <div className="flex items-center gap-1.5 apple-glass-segmented">
            <button
              type="button"
              onClick={() => setActiveTab('glass')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                activeTab === 'glass'
                  ? 'apple-glass-btn-prominent'
                  : 'apple-glass-btn text-slate-700'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              <span>Tahoe Liquid Glass</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('typography')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                activeTab === 'typography'
                  ? 'apple-glass-btn-prominent'
                  : 'apple-glass-btn text-slate-700'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Font Boldness &amp; Sizes</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('shortcuts')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                activeTab === 'shortcuts'
                  ? 'apple-glass-btn-prominent'
                  : 'apple-glass-btn text-slate-700'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Keyboard &amp; Hotkeys</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              onApplyPreset({
                themeMode: 'light',
                windowLayoutMode: 'fullLiquidGlass',
                glassVariant: 'clear',
                glassTintPreset: 'crystalNeutral',
                glassInteractive: true,
                liquidness: 88,
                transparency: 82,
                glassEffectLevel: 92,
                fontWeight: 500,
                fontSize: 26,
                lineHeight: 1.44,
                activeBeatGlow: 85,
              })
            }
            className="apple-glass-btn px-3 py-1.5 text-[11px] font-semibold text-slate-800 cursor-pointer"
          >
            Reset to Tahoe Clear Defaults
          </button>
        </div>

        <div className="pg-scroll overflow-y-auto p-5 space-y-5 flex-1">
          {activeTab === 'glass' && (
            <div className="space-y-5">
              {/* Official Apple `Glass` Variant & `.tint()` Selector */}
              <div className="p-4 rounded-2xl apple-glass-card space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2363D9]" />
                    <span>Official Apple Developer `Glass` Variant &amp; `.tint()` Volume</span>
                  </div>
                  <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded-full bg-white/70 border border-white text-slate-700">
                    macOS 26 Tahoe SDK
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {GLASS_VARIANTS.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => onChangeGlassVariant(v.value)}
                      className={`p-2.5 rounded-2xl text-left cursor-pointer ${
                        glassVariant === v.value
                          ? 'apple-glass-btn-prominent'
                          : 'apple-glass-btn text-slate-800'
                      }`}
                    >
                      <div className="text-xs font-mono-tabular font-bold">{v.title}</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          glassVariant === v.value ? 'text-blue-100' : 'text-slate-600'
                        }`}
                      >
                        {v.subtitle}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Volume Tint Selector */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-slate-700">
                    Refractive Volume Tint (`.glassEffect(.regular.tint(...))` / `NSGlassEffectView.tintColor`):
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {TINT_PRESETS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => onChangeGlassTintPreset(t.value)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                          glassTintPreset === t.value
                            ? 'apple-glass-btn-prominent'
                            : 'apple-glass-btn text-slate-800'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border ${t.swatch}`} />
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 1-Click Optical Glass Presets */}
              <div>
                <div className="text-[11px] font-bold tracking-wider uppercase text-slate-600 mb-2">
                  1-Click Optical Glass Presets
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onApplyPreset({
                        themeMode: 'light',
                        windowLayoutMode: 'fullLiquidGlass',
                        glassVariant: 'regular',
                        glassTintPreset: 'crystalNeutral',
                        glassInteractive: true,
                        liquidness: 88,
                        transparency: 78,
                        glassEffectLevel: 92,
                        fontWeight: 500,
                        fontSize: 26,
                        lineHeight: 1.44,
                        activeBeatGlow: 85,
                      })
                    }
                    className="p-2.5 rounded-2xl apple-glass-btn text-left cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#2363D9]" />
                      <span>Tahoe Regular</span>
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5">
                      Official macOS 26 Light
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onApplyPreset({
                        themeMode: 'light',
                        windowLayoutMode: 'fullLiquidGlass',
                        glassVariant: 'clear',
                        glassTintPreset: 'tahoeBlue',
                        glassInteractive: true,
                        liquidness: 98,
                        transparency: 88,
                        glassEffectLevel: 76,
                        fontWeight: 600,
                        fontSize: 27,
                        lineHeight: 1.44,
                        activeBeatGlow: 92,
                      })
                    }
                    className="p-2.5 rounded-2xl apple-glass-btn text-left cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900">Tahoe Clear Lens</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">
                      Glass.clear + Sky tint
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onApplyPreset({
                        themeMode: 'light',
                        windowLayoutMode: 'classicCard',
                        glassVariant: 'regular',
                        glassTintPreset: 'crystalNeutral',
                        glassInteractive: true,
                        liquidness: 75,
                        transparency: 42,
                        glassEffectLevel: 95,
                        fontWeight: 500,
                        fontSize: 26,
                        lineHeight: 1.44,
                        activeBeatGlow: 75,
                      })
                    }
                    className="p-2.5 rounded-2xl apple-glass-btn text-left cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900">Classic Card UI</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">
                      Structured reading well
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onApplyPreset({
                        themeMode: 'dark',
                        windowLayoutMode: 'fullLiquidGlass',
                        glassVariant: 'identity',
                        glassTintPreset: 'crystalNeutral',
                        glassInteractive: true,
                        liquidness: 100,
                        transparency: 10,
                        glassEffectLevel: 15,
                        fontWeight: 500,
                        fontSize: 26,
                        lineHeight: 1.44,
                        activeBeatGlow: 21,
                      })
                    }
                    className="p-2.5 rounded-2xl apple-glass-btn-dark text-left cursor-pointer"
                  >
                    <div className="text-xs font-bold text-white">Tahoe Dark Glass</div>
                    <div className="text-[10px] text-slate-300 mt-0.5">
                      Obsidian night lens
                    </div>
                  </button>
                </div>
              </div>

              {/* Window Surface Layout Mode & Light/Dark Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl apple-glass-card space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Layers className="w-3.5 h-3.5 text-[#2363D9]" />
                    <span>Window Surface Layout Mode</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Switch between Official Tahoe Full-Window Liquid Glass and Classic Card UI.
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onChangeWindowLayoutMode('fullLiquidGlass')}
                      className={`px-2.5 py-2 text-xs font-semibold cursor-pointer ${
                        windowLayoutMode === 'fullLiquidGlass'
                          ? 'apple-glass-btn-prominent'
                          : 'apple-glass-btn text-slate-800'
                      }`}
                    >
                      Full-Window Liquid
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeWindowLayoutMode('classicCard')}
                      className={`px-2.5 py-2 text-xs font-semibold cursor-pointer ${
                        windowLayoutMode === 'classicCard'
                          ? 'apple-glass-btn-prominent'
                          : 'apple-glass-btn text-slate-800'
                      }`}
                    >
                      Classic Card UI
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl apple-glass-card space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Native Glass Material Theme</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Apple Liquid Glass Light is recommended for crisp daylight &amp; camera readability.
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onChangeThemeMode('light')}
                      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold cursor-pointer ${
                        themeMode === 'light'
                          ? 'apple-glass-btn-prominent'
                          : 'apple-glass-btn text-slate-800'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Liquid Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeThemeMode('dark')}
                      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold cursor-pointer ${
                        themeMode === 'dark'
                          ? 'apple-glass-btn-prominent'
                          : 'apple-glass-btn text-slate-800'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Dark Glass</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Liquid Glass Cap Sliders with 3D Droplet Pill Thumbs */}
              <div className="p-4 rounded-2xl apple-glass-card space-y-4">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>Liquid Glass Cap Sliders (3D Droplet Thumb &amp; Refractive Track)</span>
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#2363D9] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={glassInteractive}
                      onChange={onToggleGlassInteractive}
                      className="rounded border-slate-300 text-[#2363D9]"
                    />
                    <span>.interactive(true)</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Liquidness Slider */}
                  <div className="p-3 rounded-2xl apple-glass-card space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-sky-500" />
                        <span>Liquidness (Refraction &amp; Lens)</span>
                      </span>
                      <span className="font-mono-tabular font-bold text-[#2363D9] apple-glass-btn px-2 py-0.5 text-[11px]">
                        {liquidness}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={1}
                      value={liquidness}
                      onChange={(e) => onChangeLiquidness(Number(e.target.value))}
                      aria-label="Liquidness Level"
                      className="apple-glass-slider"
                    />
                    <p className="text-[10px] text-slate-600">
                      Controls SVG optical lens displacement, Fresnel rim brilliance, and curvature.
                    </p>
                  </div>

                  {/* Transparency Slider */}
                  <div className="p-3 rounded-2xl apple-glass-card space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Transparency (See-Through)</span>
                      </span>
                      <span className="font-mono-tabular font-bold text-[#2363D9] apple-glass-btn px-2 py-0.5 text-[11px]">
                        {transparency}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={95}
                      step={1}
                      value={transparency}
                      onChange={(e) => onChangeTransparency(Number(e.target.value))}
                      aria-label="Glass Transparency"
                      className="apple-glass-slider"
                    />
                    <p className="text-[10px] text-slate-600">
                      Higher transparency lets more of your Zoom or slide backdrop refract through.
                    </p>
                  </div>

                  {/* Glass Effect Level Slider */}
                  <div className="p-3 rounded-2xl apple-glass-card space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Glass Effect Level (Blur &amp; Frost)</span>
                      </span>
                      <span className="font-mono-tabular font-bold text-[#2363D9] apple-glass-btn px-2 py-0.5 text-[11px]">
                        {glassEffectLevel}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={100}
                      step={1}
                      value={glassEffectLevel}
                      onChange={(e) => onChangeGlassEffectLevel(Number(e.target.value))}
                      aria-label="Glass Effect Level"
                      className="apple-glass-slider"
                    />
                    <p className="text-[10px] text-slate-600">
                      Adjusts optical Gaussian frost blur radius and backdrop color saturation.
                    </p>
                  </div>

                  {/* Active Beat Focus Glow Slider */}
                  <div className="p-3 rounded-2xl apple-glass-card space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        Active Beat Focus Lens Glow
                      </span>
                      <span className="font-mono-tabular font-bold text-[#2363D9] apple-glass-btn px-2 py-0.5 text-[11px]">
                        {activeBeatGlow}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={1}
                      value={activeBeatGlow}
                      onChange={(e) => onChangeActiveBeatGlow(Number(e.target.value))}
                      aria-label="Active Beat Focus Glow"
                      className="apple-glass-slider"
                    />
                    <p className="text-[10px] text-slate-600">
                      Controls the brightness and halo of the active `.glassEffectID` beat lens.
                    </p>
                  </div>

                  {/* Auto Voice Follow, System Audio Input & Spoken Word Darkening Settings */}
                  <div className="p-3.5 rounded-2xl apple-glass-card space-y-3 sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <Mic className="w-3.5 h-3.5 text-[#2363D9]" />
                        <span>Auto Voice Follow · System Audio Input &amp; Word Darkening</span>
                      </div>
                      <button
                        type="button"
                        onClick={onToggleVoiceListening}
                        className={`px-3 py-1 text-[11px] font-semibold cursor-pointer ${
                          isVoiceListening
                            ? 'apple-glass-btn-prominent text-white'
                            : 'apple-glass-btn text-slate-800'
                        }`}
                      >
                        {isVoiceListening ? 'Voice Follow: Active' : 'Start Voice Follow'}
                      </button>
                    </div>

                    {/* System Audio Input Device Selector & Live Input Meter */}
                    <div className="p-2.5 rounded-xl bg-white/40 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label
                          htmlFor="system-audio-input-select"
                          className="text-[11px] font-semibold text-slate-800"
                        >
                          System Audio Input Source (Mic / Loopback):
                        </label>
                        <button
                          type="button"
                          onClick={onRefreshAudioDevices}
                          className="apple-glass-btn px-2 py-0.5 text-[10px] font-semibold text-slate-700 cursor-pointer"
                        >
                          Refresh Devices
                        </button>
                      </div>

                      <select
                        id="system-audio-input-select"
                        aria-label="System Audio Input Source"
                        value={selectedAudioDeviceId}
                        onChange={(e) => onChangeSelectedAudioDeviceId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl text-xs font-medium bg-white/80 text-slate-900 focus:outline-none cursor-pointer"
                      >
                        <option value="default">
                          System Default Audio Input (macOS Sound Input)
                        </option>
                        {audioInputDevices
                          .filter((d) => d.deviceId !== 'default')
                          .map((device, idx) => (
                            <option key={device.deviceId || idx} value={device.deviceId}>
                              {device.label || `Audio Input Device ${idx + 1}`}
                            </option>
                          ))}
                      </select>

                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] font-semibold text-slate-600 shrink-0">
                          Input Level:
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-slate-200/80 overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, Math.max(isVoiceListening ? 4 : 0, voiceAudioLevel))}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-75"
                          />
                        </div>
                        <span className="text-[10px] font-mono-tabular font-semibold text-slate-700 w-8 text-right">
                          {isVoiceListening ? `${Math.round(voiceAudioLevel)}%` : 'Idle'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600">
                      Control whether already-spoken words darken in the active beat as you speak, or stay at full clean brightness while still automatically scrolling to the next line.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onChangeVoiceDarkenWords(true)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold text-left cursor-pointer ${
                          voiceDarkenWords
                            ? 'apple-glass-btn-prominent text-white'
                            : 'apple-glass-btn text-slate-800'
                        }`}
                      >
                        <div>Darken Spoken Words</div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            voiceDarkenWords ? 'text-blue-100' : 'text-slate-500'
                          }`}
                        >
                          Dims spoken words as you read in order
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onChangeVoiceDarkenWords(false)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold text-left cursor-pointer ${
                          !voiceDarkenWords
                            ? 'apple-glass-btn-prominent text-white'
                            : 'apple-glass-btn text-slate-800'
                        }`}
                      >
                        <div>Stop Word Darkening (Clean View)</div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            !voiceDarkenWords ? 'text-blue-100' : 'text-slate-500'
                          }`}
                        >
                          Keeps words clean &amp; auto-switches lines
                        </div>
                      </button>
                    </div>

                    {voiceDarkenWords && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-800">
                              Spoken Word Dimmed Opacity
                            </span>
                            <span className="font-mono-tabular font-bold text-[#2363D9] apple-glass-btn px-2 py-0.5 text-[10px]">
                              {voiceDarkenOpacity}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={15}
                            max={75}
                            step={1}
                            value={voiceDarkenOpacity}
                            onChange={(e) =>
                              onChangeVoiceDarkenOpacity(Number(e.target.value))
                            }
                            aria-label="Spoken Word Dimmed Opacity"
                            className="apple-glass-slider"
                          />
                        </div>

                        <div className="flex items-center">
                          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={voiceShowTargetUnderline}
                              onChange={onToggleVoiceShowTargetUnderline}
                              className="rounded border-slate-300 text-[#2363D9]"
                            />
                            <span>Underline next target word while speaking</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'typography' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl apple-glass-card space-y-4">
                <div className="text-xs font-bold text-slate-900">
                  Typography, Font Boldness &amp; Reading Cadence
                </div>

                {/* Font Boldness Selector */}
                <div className="p-3.5 rounded-2xl apple-glass-card space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      Font Boldness (Spoken Beat Weight)
                    </span>
                    <span className="font-mono-tabular font-bold text-[#2363D9] apple-glass-btn px-2 py-0.5 text-[11px]">
                      Weight {fontWeight}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {FONT_WEIGHT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChangeFontWeight(opt.value)}
                        style={{ fontWeight: opt.value }}
                        className={`px-3 py-2 text-xs cursor-pointer ${
                          fontWeight === opt.value
                            ? 'apple-glass-btn-prominent'
                            : 'apple-glass-btn text-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size & Line Spacing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl apple-glass-card space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        Reading Font Size (⌘+ / ⌘-)
                      </span>
                      <span className="font-mono-tabular font-bold text-[#2363D9] apple-glass-btn px-2 py-0.5 text-[11px]">
                        {fontSize}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={18}
                      max={48}
                      step={1}
                      value={fontSize}
                      onChange={(e) => onChangeFontSize(Number(e.target.value))}
                      aria-label="Reading Font Size"
                      className="apple-glass-slider"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Compact (18px)</span>
                      <span>Default (26px)</span>
                      <span>Stage Large (48px)</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl apple-glass-card space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">Line Spacing Multiplier</span>
                      <span className="font-mono-tabular font-bold text-[#2363D9] apple-glass-btn px-2 py-0.5 text-[11px]">
                        {lineHeight.toFixed(2)}×
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1.25}
                      max={1.8}
                      step={0.02}
                      value={lineHeight}
                      onChange={(e) => onChangeLineHeight(Number(e.target.value))}
                      aria-label="Line Spacing"
                      className="apple-glass-slider"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Tight (1.25×)</span>
                      <span>Balanced (1.44×)</span>
                      <span>Relaxed (1.80×)</span>
                    </div>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap items-center gap-5 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={narrowWidth}
                      onChange={onToggleNarrowWidth}
                      className="rounded border-slate-300 text-[#2363D9]"
                    />
                    <span>Narrow Near-Camera Eye-Line Measure (54ch)</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOrganizerCues}
                      onChange={onToggleOrganizerCues}
                      className="rounded border-slate-300 text-[#2363D9]"
                    />
                    <span>Show Categorized Stage &amp; Production Cue Cards (*[...]* )</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reduceMotion}
                      onChange={onToggleReduceMotion}
                      className="rounded border-slate-300 text-[#2363D9]"
                    />
                    <span>Reduce Motion (Instant Beat Snap)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              {/* Opt-in Bare Arrow Capture Mode */}
              <div className="p-4 rounded-2xl apple-glass-card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-[#B86B0A] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-[#572F02]">
                        Opt-In Global Bare Arrow Capture Mode (Default: OFF)
                      </div>
                      <p className="text-[11px] text-[#6B3B04] mt-0.5">
                        When enabled, bare <kbd className="kbd-pill">←</kbd>{' '}
                        <kbd className="kbd-pill">→</kbd> <kbd className="kbd-pill">↑</kbd>{' '}
                        <kbd className="kbd-pill">↓</kbd> navigate the script even while Zoom is focused. Automatically suspends when typing in text inputs.
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#572F02] shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bareArrowCaptureEnabled}
                      onChange={(e) => onSetBareArrowCapture(e.target.checked)}
                      className="rounded border-amber-500 text-[#2363D9]"
                    />
                    <span>{bareArrowCaptureEnabled ? 'Enabled' : 'Off'}</span>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-500/20 text-[11px] text-[#6B3B04]">
                  <span>macOS Accessibility Event Tap Permission State:</span>
                  <div className="flex items-center gap-1.5">
                    {(['granted', 'prompt', 'denied'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onSetBareArrowPermissionState(st)}
                        className={`px-2.5 py-1 capitalize font-medium cursor-pointer ${
                          bareArrowPermissionState === st
                            ? 'apple-glass-btn-prominent'
                            : 'apple-glass-btn text-[#6B3B04]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shortcut Table */}
              <div>
                <div className="text-xs font-bold text-slate-900 mb-2">
                  Focused Window &amp; Global Hotkey Bindings
                </div>
                <div className="rounded-2xl apple-glass-card overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white/40 border-b border-white/60 text-[11px] font-semibold text-slate-600">
                        <th className="py-2 px-3">Action</th>
                        <th className="py-2 px-3">When Panel Focused</th>
                        <th className="py-2 px-3">Global (While in Zoom)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/50">
                      <tr>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          Next / Previous Spoken Beat
                        </td>
                        <td className="py-2 px-3 font-mono-tabular">
                          <kbd className="kbd-pill">→</kbd> / <kbd className="kbd-pill">←</kbd> or{' '}
                          <kbd className="kbd-pill">Space</kbd>
                        </td>
                        <td className="py-2 px-3 font-mono-tabular">
                          <kbd className="kbd-pill">⌃⌥→</kbd> / <kbd className="kbd-pill">⌃⌥←</kbd>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          Next / Previous Main Section (00–09)
                        </td>
                        <td className="py-2 px-3 font-mono-tabular">
                          <kbd className="kbd-pill">↓</kbd> / <kbd className="kbd-pill">↑</kbd>
                        </td>
                        <td className="py-2 px-3 font-mono-tabular">
                          <kbd className="kbd-pill">⌃⌥↓</kbd> / <kbd className="kbd-pill">⌃⌥↑</kbd>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          Jump to “THANKING THE SPEAKER”
                        </td>
                        <td className="py-2 px-3 font-mono-tabular">
                          <kbd className="kbd-pill">T</kbd>
                        </td>
                        <td className="py-2 px-3 font-mono-tabular">
                          Header “Thank Speaker” pill
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          Collapse / Expand Near-Camera Bubble
                        </td>
                        <td className="py-2 px-3 font-mono-tabular">
                          <kbd className="kbd-pill">⌘M</kbd>
                        </td>
                        <td className="py-2 px-3 font-mono-tabular">
                          <kbd className="kbd-pill">⌃⌥M</kbd>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          Snap Centered Below MacBook Notch
                        </td>
                        <td className="py-2 px-3 font-mono-tabular">
                          <kbd className="kbd-pill">⌘0</kbd>
                        </td>
                        <td className="py-2 px-3 font-mono-tabular">
                          <kbd className="kbd-pill">⌃⌥0</kbd>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/60 bg-white/45 backdrop-blur-xl flex items-center justify-between">
          <span className="text-xs text-slate-600">
            Official Apple Tahoe Liquid Glass parameters auto-save immediately
          </span>
          <button
            type="button"
            onClick={onClose}
            className="apple-glass-btn-prominent px-5 py-1.5 text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
