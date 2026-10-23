import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  X,
  FileText,
  Layers,
  Wand2,
  BookOpen,
} from 'lucide-react';
import {
  CANONICAL_PATHFINDER_26_MD,
  INLINE_SYNTAX_TOKENS,
  SCRIPT_SYNTAX_CATEGORIES,
  UNIVERSAL_AI_MASTER_PROMPT,
  UNIVERSAL_GUIDELINE_SCRIPT_MD,
} from '../core/canonicalScript';

interface AIPromptGuideModalProps {
  onLoadScriptPreset: (markdown: string, label: string) => void;
  onClose: () => void;
}

export const AIPromptGuideModal: React.FC<AIPromptGuideModalProps> = ({
  onLoadScriptPreset,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'syntax' | 'customizer'>('prompt');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [presetLoadedBanner, setPresetLoadedBanner] = useState<string | null>(null);

  // Optional Custom Event Brief fields so the user can pre-fill their prompt before copying
  const [eventName, setEventName] = useState('');
  const [hostName, setHostName] = useState('Atheesha Anarga');
  const [eventDate, setEventDate] = useState('');
  const [eventPlatform, setEventPlatform] = useState('Zoom / Live Stage');
  const [organizerName, setOrganizerName] = useState('');
  const [speakersList, setSpeakersList] = useState('');

  const buildPromptToCopy = (): string => {
    if (!eventName.trim() && !speakersList.trim() && !organizerName.trim()) {
      return UNIVERSAL_AI_MASTER_PROMPT;
    }
    return `${UNIVERSAL_AI_MASTER_PROMPT}

====================================================================
MY SPECIFIC EVENT BRIEF (USE THESE EXACT DETAILS):
====================================================================
- **Event Name:** ${eventName.trim() || '[Insert Event Name]'}
- **Host / Moderator Name:** ${hostName.trim() || 'Atheesha Anarga'}
- **Date & Time:** ${eventDate.trim() || '[Insert Date & Time]'}
- **Platform / Venue:** ${eventPlatform.trim() || 'Zoom / Live Stage'}
- **Organizer:** ${organizerName.trim() || '[Insert Organizer Name]'}
- **Speakers & Topics:**
${speakersList.trim() || '1. [Speaker 1 Name & Topic]\n2. [Speaker 2 Name & Topic]'}`;
  };

  const handleCopy = async (text: string, id: string) => {
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
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2600);
  };

  const badgeColorMap: Record<string, string> = {
    organizerCue: 'bg-amber-500/15 text-amber-900 border-amber-500/35',
    conditionalCue: 'bg-orange-500/15 text-orange-900 border-orange-500/35',
    timingCue: 'bg-emerald-500/15 text-emerald-900 border-emerald-500/35',
    visualCue: 'bg-sky-500/15 text-sky-900 border-sky-500/35',
    deliveryCue: 'bg-purple-500/15 text-purple-900 border-purple-500/35',
    actionCue: 'bg-teal-500/15 text-teal-900 border-teal-500/35',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Universal AI Script Generator Prompt and Syntax Guide"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4"
    >
      <div className="liquid-glass-shell w-full max-w-3xl rounded-3xl border border-white/80 text-[#11141C] overflow-hidden flex flex-col max-h-[88vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/60 bg-white/45 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl apple-glass-btn-prominent flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Universal AI Script Generator Prompt &amp; Syntax Blueprint
              </h2>
              <p className="text-xs text-slate-600">
                1-Click Copyable Master Prompt with formatting rules &amp; examples for Google Gemini, Claude, or ChatGPT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(buildPromptToCopy(), 'header-master-copy')}
              className="apple-glass-btn-prominent inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold cursor-pointer"
            >
              {copiedId === 'header-master-copy' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied Complete AI Prompt!</span>
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
              onClick={onClose}
              aria-label="Close AI Prompt Guide"
              className="apple-glass-btn p-2 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-navigation & Preset Loader Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-white/35 border-b border-white/50">
          <div className="flex items-center gap-1.5 apple-glass-segmented">
            <button
              type="button"
              onClick={() => setActiveTab('prompt')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                activeTab === 'prompt'
                  ? 'apple-glass-btn-prominent'
                  : 'apple-glass-btn text-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Master AI Prompt (Copy &amp; Paste)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('syntax')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                activeTab === 'syntax'
                  ? 'apple-glass-btn-prominent'
                  : 'apple-glass-btn text-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>6 Cue Categories &amp; Inline Effects</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('customizer')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                activeTab === 'customizer'
                  ? 'apple-glass-btn-prominent'
                  : 'apple-glass-btn text-slate-700'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Pre-Fill Event Details</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-600">Load Script:</span>
            <button
              type="button"
              onClick={() => {
                onLoadScriptPreset(
                  UNIVERSAL_GUIDELINE_SCRIPT_MD,
                  'Loaded Universal Master Guideline Script'
                );
                setPresetLoadedBanner('Loaded Universal Master Guideline Script into Teleprompter!');
              }}
              className="apple-glass-btn inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-800 cursor-pointer"
            >
              <BookOpen className="w-3 h-3 text-[#2363D9]" />
              <span>Universal Guideline Script</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onLoadScriptPreset(
                  CANONICAL_PATHFINDER_26_MD,
                  'Loaded Pathfinder ’26 Script'
                );
                setPresetLoadedBanner('Loaded Pathfinder ’26 Script into Teleprompter!');
              }}
              className="apple-glass-btn inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-800 cursor-pointer"
            >
              <span>Pathfinder ’26 Template</span>
            </button>
          </div>
        </div>

        {presetLoadedBanner && (
          <div className="px-5 py-2 bg-emerald-500/15 border-b border-emerald-400/40 text-xs font-medium text-emerald-900 flex items-center justify-between">
            <span>{presetLoadedBanner}</span>
            <button
              type="button"
              onClick={() => setPresetLoadedBanner(null)}
              className="apple-glass-btn px-2 py-0.5 text-emerald-800 text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Body */}
        <div className="pg-scroll overflow-y-auto p-5 space-y-4 flex-1 bg-white/25">
          {activeTab === 'prompt' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl apple-glass-card flex items-center justify-between gap-3">
                <div className="text-xs text-slate-700 space-y-0.5">
                  <div className="font-bold text-slate-900">
                    How to Generate Any Future Script in 10 Seconds
                  </div>
                  <p>
                    1. Click <strong>Copy Master AI Prompt</strong> &rarr; 2. Paste into{' '}
                    <strong>Google Gemini, Claude, or ChatGPT</strong> with your event details &rarr; 3. Paste the generated Markdown into <strong>Script Editor (⌘E)</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(buildPromptToCopy(), 'banner-copy')}
                    className="apple-glass-btn-prominent inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {copiedId === 'banner-copy' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Master AI Prompt</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(UNIVERSAL_GUIDELINE_SCRIPT_MD, 'copy-full-example-script')
                    }
                    className="apple-glass-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    {copiedId === 'copy-full-example-script' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied Example Script!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>Copy Full Guideline Script</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="relative rounded-2xl border border-white/60 bg-slate-950/90 text-slate-100 overflow-hidden shadow-lg">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900/95 border-b border-slate-800 text-[11px] font-mono-tabular text-slate-400">
                  <span>UNIVERSAL_AI_MASTER_PROMPT.md (Ready for Gemini / Claude / ChatGPT)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(buildPromptToCopy(), 'codeblock-copy')}
                    className="apple-glass-btn-dark inline-flex items-center gap-1 px-2.5 py-0.5 text-slate-100 cursor-pointer"
                  >
                    {copiedId === 'codeblock-copy' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono-tabular leading-relaxed overflow-x-auto max-h-[44vh] whitespace-pre-wrap text-slate-200">
                  {buildPromptToCopy()}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'syntax' && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    6 Categorized Stage &amp; Production Cue Card Syntaxes (Never Read Aloud)
                  </h3>
                  <span className="text-[11px] text-slate-600">
                    Click any syntax chip to copy
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {SCRIPT_SYNTAX_CATEGORIES.map((cat) => (
                    <div
                      key={cat.kind}
                      className="p-3 rounded-2xl apple-glass-card flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${
                            badgeColorMap[cat.kind] ?? 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {cat.badgeLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(cat.syntaxExample, `cue-${cat.kind}`)}
                          className="apple-glass-btn inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 cursor-pointer"
                        >
                          {copiedId === `cue-${cat.kind}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <code className="text-[11px] font-mono-tabular bg-white/75 px-2.5 py-1.5 rounded-xl border border-white text-slate-900 break-all">
                        {cat.syntaxExample}
                      </code>
                      <p className="text-[11px] text-slate-600">{cat.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  5 Inline Spoken Delivery &amp; Cadence Tokens
                </h3>
                <div className="space-y-2">
                  {INLINE_SYNTAX_TOKENS.map((tok) => (
                    <div
                      key={tok.name}
                      className="p-3 rounded-2xl apple-glass-card flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{tok.name}</span>
                          <code className="text-[11px] font-mono-tabular px-2.5 py-0.5 rounded-full bg-white/80 text-[#1849A9] border border-white">
                            {tok.syntax}
                          </code>
                        </div>
                        <p className="text-[11px] text-slate-600">{tok.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(tok.syntax, `tok-${tok.name}`)}
                        className="apple-glass-btn inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-slate-800 shrink-0 cursor-pointer"
                      >
                        {copiedId === `tok-${tok.name}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customizer' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl apple-glass-card text-xs text-slate-800">
                <div className="font-bold text-slate-900">Optional Event Brief Pre-Filler</div>
                <p className="mt-0.5 text-slate-600">
                  Fill in your upcoming program details below and click{' '}
                  <strong>Copy Customized AI Prompt</strong> — it appends your exact event brief to the Master Formatting Prompt so Gemini, Claude, or ChatGPT writes your complete script in one shot.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Event / Program Name
                  </label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g., Global AI Summit 2027"
                    className="w-full px-3 py-1.5 rounded-full apple-glass-card text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Host / Moderator Name
                  </label>
                  <input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="e.g., Atheesha Anarga"
                    className="w-full px-3 py-1.5 rounded-full apple-glass-card text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Date &amp; Starting Time
                  </label>
                  <input
                    type="text"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    placeholder="e.g., Friday, 14 November · 6:30 PM"
                    className="w-full px-3 py-1.5 rounded-full apple-glass-card text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Organizer / Organization
                  </label>
                  <input
                    type="text"
                    value={organizerName}
                    onChange={(e) => setOrganizerName(e.target.value)}
                    placeholder="e.g., IEEE Computer Society"
                    className="w-full px-3 py-1.5 rounded-full apple-glass-card text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Speakers, Bios &amp; Session Topics (One per line)
                </label>
                <textarea
                  rows={4}
                  value={speakersList}
                  onChange={(e) => setSpeakersList(e.target.value)}
                  placeholder={`1. Dr. Maya Lin — Chief AI Scientist — Autonomous Agents in Production\n2. Kasun Perera — Principal Security Architect — Zero-Trust Cloud Defense`}
                  className="w-full px-3 py-2 rounded-2xl apple-glass-card text-xs font-mono-tabular focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(buildPromptToCopy(), 'custom-copy')}
                  className="apple-glass-btn-prominent inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  {copiedId === 'custom-copy' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied Customized Prompt to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Customized AI Prompt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/60 bg-white/45 backdrop-blur-xl flex items-center justify-between">
          <span className="text-xs text-slate-600">
            Compatible with Google Gemini 2.5 Pro, Claude Sonnet/Opus, and ChatGPT
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
