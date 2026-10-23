import React, { useState, useRef } from 'react';
import {
  Save,
  RotateCcw,
  Upload,
  Download,
  History,
  Undo2,
  Redo2,
  X,
  AlertCircle,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { parseMarkdownScript } from '../core/parser';
import { ScriptRevision } from '../core/types';
import {
  CANONICAL_PATHFINDER_26_MD,
  UNIVERSAL_AI_MASTER_PROMPT,
  UNIVERSAL_GUIDELINE_SCRIPT_MD,
} from '../core/canonicalScript';

interface ScriptEditorModalProps {
  workingMarkdown: string;
  revisions: ScriptRevision[];
  lastSaveError: string | null;
  onSaveMarkdown: (markdown: string, label: string) => void;
  onRestoreBundledOriginal: () => void;
  onSimulateCorruptionAndRecover: () => void;
  onClose: () => void;
}

export const ScriptEditorModal: React.FC<ScriptEditorModalProps> = ({
  workingMarkdown,
  revisions,
  lastSaveError,
  onSaveMarkdown,
  onRestoreBundledOriginal,
  onSimulateCorruptionAndRecover,
  onClose,
}) => {
  const [draft, setDraft] = useState(workingMarkdown);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [confirmRestoreBundled, setConfirmRestoreBundled] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const livePreviewDoc = parseMarkdownScript(draft);

  const copyToClipboard = async (text: string, key: string, bannerMsg?: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedKey(key);
    if (bannerMsg) setStatusBanner(bannerMsg);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2400);
  };

  const updateDraftWithHistory = (nextText: string, saveLabel?: string) => {
    setUndoStack((prev) => [...prev.slice(-19), draft]);
    setRedoStack([]);
    setDraft(nextText);
    if (saveLabel) {
      onSaveMarkdown(nextText, saveLabel);
      setStatusBanner(`Saved snapshot: ${saveLabel}`);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [draft, ...r]);
    setDraft(prev);
    onSaveMarkdown(prev, 'Undo');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack((r) => r.slice(1));
    setUndoStack((s) => [...s, draft]);
    setDraft(next);
    onSaveMarkdown(next, 'Redo');
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    const next = draft.split(findText).join(replaceText);
    updateDraftWithHistory(next, `Replaced "${findText}"`);
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([draft], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CueGlass-Master-Script.md';
    a.click();
    URL.revokeObjectURL(url);
    setStatusBanner('Exported CueGlass-Master-Script.md');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      if (content.trim()) {
        updateDraftWithHistory(content, `Imported ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit Script Window"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4"
    >
      <div className="liquid-glass-shell w-full max-w-5xl h-[86vh] rounded-3xl border border-white/80 text-[#11141C] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/60 bg-white/45 backdrop-blur-xl">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Edit Script — Source, AI Prompt Blueprint &amp; Synchronized Outline
            </h2>
            <p className="text-xs text-slate-600 font-mono-tabular">
              ~/Library/Application Support/CueGlassStudio/WorkingScript.md (Bundled original never mutated)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  UNIVERSAL_AI_MASTER_PROMPT,
                  'editor-ai-prompt',
                  'Copied Complete AI Master Prompt & Examples! Paste into Gemini, Claude, or ChatGPT.'
                )
              }
              className="apple-glass-btn-prominent inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
              title="Copy complete AI formatting instructions and examples for Gemini, Claude, or ChatGPT"
            >
              {copiedKey === 'editor-ai-prompt' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied AI Prompt!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy AI Prompt &amp; Examples</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              aria-label="Undo edit"
              className="apple-glass-btn p-1.5 text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              aria-label="Redo edit"
              className="apple-glass-btn p-1.5 text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="apple-glass-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-800 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import .md</span>
            </button>

            <button
              type="button"
              onClick={handleExportMarkdown}
              className="apple-glass-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-800 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .md</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSaveMarkdown(draft, 'Manual Save');
                setStatusBanner('Saved to WorkingScript.md & LastKnownGood.md');
              }}
              className="apple-glass-btn-prominent inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Snapshot</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSaveMarkdown(draft, 'Editor Close Save');
                onClose();
              }}
              aria-label="Close Script Editor"
              className="apple-glass-btn p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Find & Replace + Template Presets Bar */}
        <div className="px-5 py-2.5 bg-white/35 border-b border-white/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Find text…"
              aria-label="Find text in script"
              className="px-3 py-1 text-xs rounded-full apple-glass-card w-40 focus:outline-none"
            />
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace with…"
              aria-label="Replace with text"
              className="px-3 py-1 text-xs rounded-full apple-glass-card w-40 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleReplaceAll}
              className="apple-glass-btn px-3 py-1 text-slate-900 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              Replace All
            </button>
          </div>

          <div className="flex items-center gap-2">
            {lastSaveError && (
              <span className="inline-flex items-center gap-1 text-xs text-red-700 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                {lastSaveError}
              </span>
            )}
            {statusBanner && !lastSaveError && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                {statusBanner}
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                updateDraftWithHistory(
                  UNIVERSAL_GUIDELINE_SCRIPT_MD,
                  'Loaded Universal Master Guideline Script'
                );
              }}
              className="apple-glass-btn inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#1849A9] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Universal Master Script</span>
            </button>

            <button
              type="button"
              onClick={() => {
                updateDraftWithHistory(
                  CANONICAL_PATHFINDER_26_MD,
                  'Loaded Pathfinder ’26 Event Script'
                );
              }}
              className="apple-glass-btn inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Pathfinder ’26 Script</span>
            </button>

            {!confirmRestoreBundled ? (
              <button
                type="button"
                onClick={() => setConfirmRestoreBundled(true)}
                className="apple-glass-btn inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#8F4F05] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default…</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 apple-glass-card px-2.5 py-1 rounded-full">
                <span className="text-xs font-semibold text-[#6B3B04]">
                  Reset to default?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onRestoreBundledOriginal();
                    setConfirmRestoreBundled(false);
                    onClose();
                  }}
                  className="apple-glass-btn-prominent px-2.5 py-0.5 text-xs font-semibold cursor-pointer"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRestoreBundled(false)}
                  className="apple-glass-btn px-2.5 py-0.5 text-slate-700 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Split View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left: Raw Markdown Source Editor */}
          <div className="lg:col-span-7 flex flex-col border-r border-white/60 min-h-0">
            <textarea
              aria-label="Markdown Script Source Editor"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                onSaveMarkdown(e.target.value, 'Autosave');
              }}
              className="pg-scroll flex-1 w-full p-4 font-mono-tabular text-xs leading-relaxed text-slate-900 bg-white/75 focus:outline-none resize-none"
              spellCheck={false}
            />
          </div>

          {/* Right: Structured Script Syntax Guide (with 1-click Copy Icon), Live Outline & Rolling Versions */}
          <div className="lg:col-span-5 pg-scroll overflow-y-auto p-4 space-y-4 bg-white/30">
            <div className="p-3.5 rounded-2xl apple-glass-card space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-bold tracking-wider text-slate-700">
                  STRUCTURED SCRIPT SYNTAX GUIDE &amp; AI PROMPT
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      UNIVERSAL_AI_MASTER_PROMPT,
                      'syntax-card-copy',
                      'Copied all AI formatting instructions & examples to clipboard!'
                    )
                  }
                  aria-label="Copy all instructions and examples for AI"
                  title="Copy all formatting instructions and examples to paste into Gemini, Claude, or ChatGPT"
                  className="apple-glass-btn-prominent inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                >
                  {copiedKey === 'syntax-card-copy' ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied All Instructions!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy AI Instructions</span>
                    </>
                  )}
                </button>
              </div>

              <ul className="text-xs text-slate-700 space-y-1.5 font-mono-tabular">
                <li>
                  <strong className="text-slate-900">## 00 — Title</strong> : Live section (00–09) or On-Demand (10–12)
                </li>
                <li>
                  <strong className="text-slate-900">### THANKING ...</strong> : Registers single-key <kbd className="kbd-pill">T</kbd> speaker waypoint
                </li>
                <li>
                  <strong className="text-amber-700">*[Organizer Cue: ...]*</strong> : Amber producer logistics card
                </li>
                <li>
                  <strong className="text-orange-700">*[If ... / Optional: ...]*</strong> : Conditional branch card
                </li>
                <li>
                  <strong className="text-emerald-700">*[Timing: 02:00 ...]*</strong> : Emerald pacing &amp; time-check card
                </li>
                <li>
                  <strong className="text-sky-700">*[Slide: ... / Visual: ...]*</strong> : Sky-cyan slide &amp; visual cue card
                </li>
                <li>
                  <strong className="text-purple-700">*[Tone: ... / Delivery: ...]*</strong> : Violet vocal energy &amp; posture card
                </li>
                <li>
                  <strong className="text-teal-700">*[Action: ... / Stage: ...]*</strong> : Teal stage handoff &amp; action card
                </li>
                <li>
                  <strong className="text-[#1849A9]">==Key Phrase==</strong> : Luminous spoken phrase highlight pill
                </li>
                <li>
                  <strong className="text-emerald-800">[PAUSE] / [BEAT]</strong> : Inline breath &amp; cadence badge
                </li>
                <li>
                  <strong className="text-[#8F4F05]">[Placeholder]</strong> : Tracked pre-flight speaker/time token
                </li>
              </ul>
            </div>

            {/* Synchronized Parsed Outline */}
            <div className="p-3.5 rounded-2xl apple-glass-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-600">
                  SYNCHRONIZED OUTLINE ({livePreviewDoc.sections.length} SECTIONS)
                </span>
                <span className="text-[11px] font-mono-tabular text-slate-600">
                  {livePreviewDoc.liveFlowBeats.length} live beats
                </span>
              </div>
              <div className="max-h-48 pg-scroll overflow-y-auto space-y-1 pr-1">
                {livePreviewDoc.sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl apple-glass-card"
                  >
                    <span className="truncate font-medium text-slate-800">
                      <span className="font-mono-tabular text-[#2363D9] font-semibold mr-1.5">
                        {sec.numberBadge}
                      </span>
                      {sec.title}
                    </span>
                    <span className="text-[11px] font-mono-tabular text-slate-500 shrink-0 ml-2">
                      {sec.navigableBeats.length} beats
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rolling 5 Local Versions */}
            <div className="p-3.5 rounded-2xl apple-glass-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-slate-600">
                  <History className="w-3.5 h-3.5" />
                  ROLLING LOCAL VERSIONS ({revisions.length}/5 MAX)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onSimulateCorruptionAndRecover();
                    setStatusBanner(
                      'Simulated interrupted write -> Verified automatic recovery from LastKnownGood.md!'
                    );
                  }}
                  className="apple-glass-btn px-2 py-0.5 text-[11px] font-semibold text-[#2363D9] cursor-pointer"
                >
                  Test LastKnownGood Recovery
                </button>
              </div>
              <div className="space-y-1.5">
                {revisions.map((rev, idx) => (
                  <div
                    key={rev.id}
                    className="flex items-center justify-between px-3 py-1.5 rounded-xl apple-glass-card text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 truncate">
                        #{revisions.length - idx} · {rev.label}
                      </div>
                      <div className="text-[10px] font-mono-tabular text-slate-500">
                        {new Date(rev.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(rev.markdown);
                        onSaveMarkdown(rev.markdown, `Restored ${rev.label}`);
                        setStatusBanner(`Restored version: ${rev.label}`);
                      }}
                      className="apple-glass-btn px-2.5 py-1 text-[11px] font-semibold text-slate-800 shrink-0 cursor-pointer"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
