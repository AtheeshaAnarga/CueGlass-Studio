import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  X,
  Edit3,
} from 'lucide-react';
import { ScriptDocument, ScriptPlaceholder } from '../core/types';

interface PreflightModalProps {
  document: ScriptDocument;
  acknowledgedIDs: string[];
  checklistState: Record<string, boolean>;
  initialFocusToken?: string | null;
  onToggleAcknowledge: (placeholderID: string) => void;
  onResolveTokenInScript: (rawToken: string, replacementValue: string) => void;
  onJumpToBeat: (beatID: string) => void;
  onClose: () => void;
}

export const PreflightModal: React.FC<PreflightModalProps> = ({
  document,
  acknowledgedIDs,
  checklistState,
  initialFocusToken,
  onToggleAcknowledge,
  onResolveTokenInScript,
  onJumpToBeat,
  onClose,
}) => {
  const [editingPlaceholder, setEditingPlaceholder] =
    useState<ScriptPlaceholder | null>(
      () =>
        document.allPlaceholders.find((p) => p.rawToken === initialFocusToken) ??
        null
    );
  const [replacementDraft, setReplacementDraft] = useState('');

  const needsConfirmation = document.allPlaceholders.filter(
    (p) => !p.isConditional
  );
  const optionalConditionals = document.allPlaceholders.filter(
    (p) => p.isConditional
  );

  const unconfirmedCriticalDS = document.allPlaceholders.filter(
    (p) => p.isDataScienceCritical && !acknowledgedIDs.includes(p.id)
  );

  const completedChecklistCount = document.checklistBlocks.filter(
    (b) => checklistState[b.id] ?? b.isCheckedByDefault
  ).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Preflight Readiness and Zoom Safety Check"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4"
    >
      <div className="liquid-glass-shell w-full max-w-2xl rounded-3xl border border-white/80 text-[#11141C] overflow-hidden flex flex-col max-h-[86vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/60 bg-white/45 backdrop-blur-xl">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Preflight Readiness &amp; Zoom Safety Check
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              CueGlass Studio · Verify speaker placeholders &amp; screen-sharing settings before going live
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Preflight"
            className="apple-glass-btn p-2 text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="pg-scroll overflow-y-auto p-5 space-y-5 bg-white/25">
          {/* Status Summary Banner */}
          {unconfirmedCriticalDS.length > 0 ? (
            <div className="p-3.5 rounded-2xl apple-glass-card flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#B86B0A] shrink-0 mt-0.5" />
              <div className="text-xs text-[#6B3B04] space-y-1">
                <div className="font-bold text-sm text-[#572F02]">
                  Hold Before Going Live: {unconfirmedCriticalDS.length} Speaker Placeholders Unconfirmed
                </div>
                <p>
                  Fill confirmed speaker details below or acknowledge for rehearsal before starting your broadcast.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl apple-glass-card flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900">
                <div className="font-bold text-sm">
                  Named Speaker Placeholders Addressed or Acknowledged for Rehearsal
                </div>
                <p className="mt-0.5">
                  Dynamic live-session placeholders (such as participant names during Q&amp;A) remain ready for on-the-fly reading.
                </p>
              </div>
            </div>
          )}

          {/* Mandatory Zoom Screen Sharing Safety Guidance */}
          <div className="p-3.5 rounded-2xl apple-glass-card flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#2363D9] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 space-y-1">
              <div className="font-semibold text-slate-900">
                Zoom Screen Sharing Safety Rule (No False Invisibility Claims)
              </div>
              <p>
                When sharing slides or browser windows in Zoom,{' '}
                <strong>
                  always select the specific Slide / Application Window rather than &ldquo;Entire Screen&rdquo;
                </strong>
                , and verify Zoom&apos;s participant-facing preview before speaking.
              </p>
            </div>
          </div>

          {/* Inline Placeholder Editor if selected */}
          {editingPlaceholder && (
            <div className="p-3.5 rounded-2xl apple-glass-card space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1849A9]">
                  Fill Confirmed Value for {editingPlaceholder.rawToken}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingPlaceholder(null)}
                  className="apple-glass-btn px-2.5 py-1 text-xs text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replacementDraft}
                  onChange={(e) => setReplacementDraft(e.target.value)}
                  placeholder={`Enter confirmed text to replace ${editingPlaceholder.rawToken}…`}
                  aria-label="Confirmed replacement text"
                  className="flex-1 px-3 py-1.5 text-xs bg-white/80 rounded-full border border-white focus:outline-none focus:border-[#2363D9]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (replacementDraft.trim()) {
                      onResolveTokenInScript(
                        editingPlaceholder.rawToken,
                        replacementDraft.trim()
                      );
                      setEditingPlaceholder(null);
                      setReplacementDraft('');
                    }
                  }}
                  className="apple-glass-btn-prominent px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Apply to Working Script
                </button>
              </div>
            </div>
          )}

          {/* Needs Confirmation List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold tracking-wider text-[#8F4F05]">
                NEEDS CONFIRMATION OR LIVE INPUT ({needsConfirmation.length})
              </span>
              <span className="text-[11px] text-slate-600 font-mono-tabular">
                Checklist: {completedChecklistCount}/{document.checklistBlocks.length} completed
              </span>
            </div>

            <div className="space-y-2">
              {needsConfirmation.map((ph) => {
                const isAck = acknowledgedIDs.includes(ph.id);
                return (
                  <div
                    key={ph.id}
                    className="p-3 rounded-2xl apple-glass-card flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono-tabular font-semibold text-slate-900 truncate">
                          [{ph.label}]
                        </span>
                        <span className="text-[11px] text-slate-400">·</span>
                        <span className="text-xs text-slate-600 whitespace-nowrap">
                          {ph.sectionNumber !== null
                            ? `${ph.sectionNumber.toString().padStart(2, '0')} ${ph.sectionTitle}`
                            : ph.sectionTitle}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        {ph.isDataScienceCritical
                          ? 'Required before live broadcast — speaker identity/bio unconfirmed in source'
                          : 'Spoken placeholder — fill ahead of time or speak live during session'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlaceholder(ph);
                          setReplacementDraft('');
                        }}
                        className="apple-glass-btn inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Fill</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleAcknowledge(ph.id)}
                        className={`px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                          isAck
                            ? 'apple-glass-btn-prominent'
                            : 'apple-glass-btn text-[#8F4F05]'
                        }`}
                      >
                        {isAck ? 'Rehearsal OK' : 'Acknowledge'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onJumpToBeat(ph.blockID);
                          onClose();
                        }}
                        aria-label={`Jump to ${ph.label}`}
                        className="apple-glass-btn p-1.5 text-slate-700 hover:text-[#2363D9] cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Intentionally Optional / Conditional Cues */}
          <div>
            <div className="mb-2">
              <span className="text-[11px] font-bold tracking-wider text-slate-600">
                INTENTIONALLY OPTIONAL / CONDITIONAL CUES ({optionalConditionals.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {optionalConditionals.map((ph) => (
                <div
                  key={ph.id}
                  className="px-3 py-2 rounded-2xl apple-glass-card flex items-center justify-between gap-2"
                >
                  <div className="text-xs text-slate-700">
                    <span className="font-mono-tabular font-medium text-slate-900">
                      [{ph.label}]
                    </span>{' '}
                    <span className="text-slate-400">·</span>{' '}
                    <span>
                      Section {ph.sectionNumber?.toString().padStart(2, '0')} ({ph.sectionTitle}) — Conditional note
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onJumpToBeat(ph.blockID);
                      onClose();
                    }}
                    className="apple-glass-btn px-2.5 py-1 text-[11px] font-semibold text-[#2363D9] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Inspect Beat
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-white/60 bg-white/45 backdrop-blur-xl flex items-center justify-between">
          <span className="text-xs text-slate-600">
            Interactive placeholders update your live working script immediately
          </span>
          <button
            type="button"
            onClick={onClose}
            className="apple-glass-btn-prominent px-4 py-1.5 text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
