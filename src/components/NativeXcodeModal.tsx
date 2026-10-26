import React, { useState } from 'react';
import { Download, Terminal, CheckCircle2, FileCode, X, Copy, Check, Play } from 'lucide-react';

interface NativeXcodeModalProps {
  onClose: () => void;
}

const NATIVE_FILES_MANIFEST = [
  {
    path: 'Build-Pathfinder-Glass-DMG.command',
    role: 'Self-contained 1-click macOS .command launcher — automatically extracts, builds Release .app, and exports the shareable DMG with Official Apple Tahoe Liquid Glass (NSGlassEffectView + GlassEffectContainer + .buttonStyle(.glass))',
  },
  {
    path: 'PathfinderGlass/Windows/PanelController.swift',
    role: 'Official AppKit NSGlassEffectView root window container (glassView.contentView = hostingView, glassView.cornerRadius = 22, glassView.tintColor = ...)',
  },
  {
    path: 'PathfinderGlass/Views/ReadingPanelView.swift',
    role: 'Official SwiftUI GlassEffectContainer(spacing:), .glassEffect(.regular.tint().interactive()), .glassEffectID, .buttonStyle(.glass), .buttonStyle(.glassProminent), and AppleLiquidGlassSlider',
  },
  {
    path: 'PathfinderGlass/Views/SettingsView.swift',
    role: 'Official Apple Tahoe Liquid Glass Cap Settings (Glass.regular / .clear / .identity, .tint(), .interactive(), Liquidness, Transparency, Blur, Font Boldness & Size)',
  },
  {
    path: 'PathfinderGlass/Views/CollapsedBubbleView.swift',
    role: '46 pt draggable Apple Liquid Glass capsule dot with .glassEffect(.regular.interactive(), in: .capsule)',
  },
  {
    path: 'PathfinderGlass/Persistence/ScriptStore.swift',
    role: 'Universal Master Script & AI Blueprint seed, 1-click AI Prompt copy text, and atomic Application Support persistence with 5 rolling revisions',
  },
  {
    path: 'PathfinderGlass/Parsing/MarkdownScriptParser.swift',
    role: 'Deterministic parser for 6 cue categories (Organizer, Branch, Timing, Slide/AV, Tone, Action), Spoken beats, and Placeholders',
  },
  {
    path: 'AppIcon.icns (1024×1024 Apple Tahoe Liquid Glass Squircle)',
    role: 'Custom high-DPI macOS 26 Tahoe Liquid Glass Squircle icon (Sapphire-Cyan refractive lens + frosted teleprompter card + crystal droplet emblem) compiled automatically via iconutil into Pathfinder Glass.app',
  },
  {
    path: 'PathfinderGlassTests/ (5 XCTest Suites)',
    role: 'MarkdownScriptParserTests, NavigationTests, ScriptStoreTests, PlaceholderTests, WindowGeometryTests',
  },
];

export const NativeXcodeModal: React.FC<NativeXcodeModalProps> = ({ onClose }) => {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedSelfContained, setCopiedSelfContained] = useState(false);

  const macBuildCommands = `cd ~/Downloads
if [ -f "Build-Pathfinder-Glass-DMG.command" ]; then
  chmod +x Build-Pathfinder-Glass-DMG.command
  xattr -d com.apple.quarantine Build-Pathfinder-Glass-DMG.command 2>/dev/null || true
  ./Build-Pathfinder-Glass-DMG.command
elif [ -f "Build-CueGlass-Studio-DMG.command" ]; then
  chmod +x Build-CueGlass-Studio-DMG.command
  xattr -d com.apple.quarantine Build-CueGlass-Studio-DMG.command 2>/dev/null || true
  ./Build-CueGlass-Studio-DMG.command
elif [ -f "PathfinderGlass-macOS-Xcode-Source.tar.gz" ]; then
  rm -rf pathfinder-glass && mkdir -p pathfinder-glass
  tar -xzf PathfinderGlass-macOS-Xcode-Source.tar.gz -C pathfinder-glass
  cd pathfinder-glass
  chmod +x build-release.sh package-dmg.sh Build-and-Export-DMG.command
  ./package-dmg.sh
  open "dist/Pathfinder Glass.app"
elif [ -f "PathfinderGlass-macOS-Xcode-Source.tar" ]; then
  rm -rf pathfinder-glass && mkdir -p pathfinder-glass
  tar -xf PathfinderGlass-macOS-Xcode-Source.tar -C pathfinder-glass
  cd pathfinder-glass
  chmod +x build-release.sh package-dmg.sh Build-and-Export-DMG.command
  ./package-dmg.sh
  open "dist/Pathfinder Glass.app"
else
  echo "⚠️ Click 'Copy Terminal Builder' or 'Download .command' in the top bar of AI Studio first!"
fi`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(macBuildCommands);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleCopySelfContainedScript = async () => {
    try {
      const res = await fetch('/Build-Pathfinder-Glass-DMG.command');
      const scriptText = await res.text();
      await navigator.clipboard.writeText(scriptText);
      setCopiedSelfContained(true);
      setTimeout(() => setCopiedSelfContained(false), 3000);
    } catch {
      handleCopy();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Native macOS Xcode Project and Build Package"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4"
    >
      <div className="liquid-glass-shell w-full max-w-3xl rounded-3xl border border-white/80 text-[#11141C] overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/60 bg-white/45 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <img
              src="/cueglass-icon.svg"
              alt="CueGlass Studio macOS Tahoe Liquid Glass App Icon"
              className="w-11 h-11 rounded-xl shadow-md shrink-0"
            />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                CueGlass Studio — Official macOS 26 Tahoe Liquid Glass `.command` DMG Exporter
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Includes Custom `AppIcon.icns`, `NSGlassEffectView`, `GlassEffectContainer`, `.glassEffect(.regular.interactive())`, and `.buttonStyle(.glass)`
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Native Build Modal"
            className="apple-glass-btn p-2 text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="pg-scroll overflow-y-auto p-5 space-y-5 bg-white/25">
          {/* Option 1: Zero-Download Clipboard Paste Builder */}
          <div className="p-4 rounded-2xl apple-glass-card border-2 border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-950">
                <Terminal className="w-4 h-4 text-emerald-600" />
                <span>Option A — Copy Full Self-Contained Build Script (No File Download Needed)</span>
              </div>
              <p className="text-xs text-slate-700">
                Copies the entire self-contained installer + Swift source archive directly to your clipboard. Just click this button, switch to macOS Terminal, press <code className="font-mono-tabular font-semibold">⌘V</code> and hit <code className="font-mono-tabular font-semibold">Return</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySelfContainedScript}
              className="apple-glass-btn-prominent inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedSelfContained ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied! Paste (⌘V) in Terminal</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Full Build Script</span>
                </>
              )}
            </button>
          </div>

          {/* Option 2: Direct Self-Contained .command File */}
          <div className="p-4 rounded-2xl apple-glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <Play className="w-4 h-4 text-[#2363D9] fill-[#2363D9]" />
                <span>Option B — Download `.command` Auto-Builder &amp; DMG Exporter</span>
              </div>
              <p className="text-xs text-slate-700">
                Downloads <code className="font-mono-tabular font-semibold">Build-Pathfinder-Glass-DMG.command</code> to <code className="font-mono-tabular">~/Downloads</code>. Unpacks the Swift source, compiles <code className="font-mono-tabular">Pathfinder Glass.app</code>, and builds <code className="font-mono-tabular">Pathfinder-Glass-macOS.dmg</code>.
              </p>
            </div>
            <a
              href="/Build-Pathfinder-Glass-DMG.command"
              download="Build-Pathfinder-Glass-DMG.command"
              className="apple-glass-btn inline-flex items-center gap-2 px-4 py-2.5 text-slate-900 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 text-[#2363D9]" />
              <span>Download .command Builder</span>
            </a>
          </div>

          {/* Option 3: Full tar.gz archive */}
          <div className="p-4 rounded-2xl apple-glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-[#11141C]">
                Option C — Download Complete Native Xcode &amp; SwiftPM Archive (.tar.gz)
              </div>
              <p className="text-xs text-slate-600">
                Contains <code className="font-mono-tabular">Build-and-Export-DMG.command</code>,{' '}
                <code className="font-mono-tabular">package-dmg.sh</code>,{' '}
                <code className="font-mono-tabular">Package.swift</code>, and all Swift source &amp; XCTest files.
              </p>
            </div>
            <a
              href="/PathfinderGlass-macOS-Xcode-Source.tar.gz"
              download="PathfinderGlass-macOS-Xcode-Source.tar.gz"
              className="apple-glass-btn inline-flex items-center gap-2 px-4 py-2.5 text-slate-900 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 text-[#2363D9]" />
              <span>Download Xcode Source (.tar.gz)</span>
            </a>
          </div>

          {/* 1-Step Terminal / Double-Click Instructions */}
          <div className="p-4 rounded-2xl bg-slate-900/95 text-slate-100 space-y-2 border border-white/40">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                If using Option B or C (Downloaded to ~/Downloads), run this in Terminal:
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="apple-glass-btn-dark inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-slate-200 cursor-pointer"
              >
                {copiedCmd ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Commands</span>
                  </>
                )}
              </button>
            </div>
            <pre className="font-mono-tabular text-xs text-emerald-200 overflow-x-auto leading-relaxed">
              {macBuildCommands}
            </pre>
          </div>

          {/* Delivered Architecture & File Manifest */}
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-600 mb-2">
              VERIFIED REPOSITORY DELIVERABLES ({NATIVE_FILES_MANIFEST.length} MODULES)
            </div>
            <div className="space-y-1.5">
              {NATIVE_FILES_MANIFEST.map((item) => (
                <div
                  key={item.path}
                  className="px-3.5 py-2.5 rounded-2xl apple-glass-card flex items-start gap-2.5"
                >
                  <FileCode className="w-4 h-4 text-[#2363D9] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-mono-tabular font-semibold text-slate-900">
                      {item.path}
                    </div>
                    <div className="text-[11px] text-slate-600">{item.role}</div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-auto mt-0.5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
