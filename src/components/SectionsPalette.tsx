import React, { useState } from 'react';
import { Search, CornerDownRight, ArrowUpRight, X } from 'lucide-react';
import { ScriptDocument } from '../core/types';

interface SectionsPaletteProps {
  document: ScriptDocument;
  activeSectionID: string;
  activeBeatID: string;
  onSelectSection: (sectionID: string) => void;
  onSelectBeat: (beatID: string) => void;
  onOpenOnDemandTab: (tabIndex: number) => void;
  onClose: () => void;
}

export const SectionsPalette: React.FC<SectionsPaletteProps> = ({
  document,
  activeSectionID,
  activeBeatID,
  onSelectSection,
  onSelectBeat,
  onOpenOnDemandTab,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim().toLowerCase();

  const matchingBeats = trimmedQuery
    ? document.liveFlowBeats.filter(
        (b) =>
          b.displayText.toLowerCase().includes(trimmedQuery) ||
          (b.subsectionTitle && b.subsectionTitle.toLowerCase().includes(trimmedQuery))
      )
    : [];

  return (
    <div
      role="dialog"
      aria-label="Sections Palette"
      className="liquid-glass-Popover w-80 rounded-3xl border border-white/80 p-3 text-[#11141C] select-none"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full apple-glass-card mb-2.5">
        <Search className="w-3.5 h-3.5 text-slate-600 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find section, speaker, or phrase…"
          aria-label="Find section or phrase"
          className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="apple-glass-btn p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="pg-scroll max-h-80 overflow-y-auto pr-1 space-y-3">
        {!trimmedQuery ? (
          <>
            <div>
              <div className="flex items-center justify-between px-1.5 mb-1.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-600">
                  LIVE FLOW (00–09)
                </span>
                <span className="text-[10px] text-slate-500 font-mono-tabular">
                  ↑ / ↓ sections
                </span>
              </div>
              <div className="space-y-1">
                {document.liveFlowSections.map((sec) => {
                  const isCurrent = sec.id === activeSectionID;
                  const hasSpeakerWaypoints =
                    Boolean(sec.introduceWaypointBlockID) &&
                    Boolean(sec.thankSpeakerWaypointBlockID);

                  return (
                    <div key={sec.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSection(sec.id);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-left cursor-pointer ${
                          isCurrent
                            ? 'apple-glass-btn-prominent font-semibold'
                            : 'apple-glass-btn text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`text-[11px] font-mono-tabular font-bold ${
                              isCurrent ? 'text-white' : 'text-[#2363D9]'
                            }`}
                          >
                            {sec.numberBadge}
                          </span>
                          <span className="text-xs truncate">{sec.shortTitle}</span>
                        </div>
                        <span
                          className={`text-[11px] font-mono-tabular shrink-0 ml-2 ${
                            isCurrent ? 'text-blue-100' : 'text-slate-500'
                          }`}
                        >
                          {sec.navigableBeats.length}
                        </span>
                      </button>

                      {hasSpeakerWaypoints && (
                        <div className="flex items-center gap-1.5 pl-6 pr-2 pb-1">
                          <CornerDownRight className="w-3 h-3 text-slate-500 shrink-0" />
                          <button
                            type="button"
                            onClick={() => {
                              if (sec.introduceWaypointBlockID) {
                                onSelectBeat(sec.introduceWaypointBlockID);
                                onClose();
                              }
                            }}
                            className={`px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                              activeBeatID === sec.introduceWaypointBlockID
                                ? 'apple-glass-btn-prominent'
                                : 'apple-glass-btn text-slate-700'
                            }`}
                          >
                            Introduce
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (sec.thankSpeakerWaypointBlockID) {
                                onSelectBeat(sec.thankSpeakerWaypointBlockID);
                                onClose();
                              }
                            }}
                            className={`px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                              activeBeatID === sec.thankSpeakerWaypointBlockID
                                ? 'apple-glass-btn-prominent'
                                : 'apple-glass-btn text-slate-700'
                            }`}
                          >
                            Thank speaker
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/60 pt-2">
              <div className="px-1.5 mb-1.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-600">
                  ON-DEMAND REFERENCE (10–12)
                </span>
              </div>
              <div className="space-y-1">
                {document.onDemandSections.map((sec, idx) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenOnDemandTab(idx);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 apple-glass-btn text-left text-slate-800 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-mono-tabular font-bold text-[#2363D9]">
                        {sec.numberBadge}
                      </span>
                      <span className="text-xs truncate">{sec.shortTitle}</span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <div className="px-1 text-[10px] font-bold text-slate-600">
              {matchingBeats.length} MATCHING SCRIPT BEATS
            </div>
            {matchingBeats.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No spoken lines match “{query}”.
              </div>
            ) : (
              matchingBeats.map((beat) => {
                const sec = document.sections.find((s) => s.id === beat.sectionID);
                return (
                  <button
                    key={beat.id}
                    type="button"
                    onClick={() => {
                      onSelectBeat(beat.id);
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-2xl apple-glass-btn cursor-pointer"
                  >
                    <div className="text-[10px] font-bold text-[#2363D9] mb-0.5">
                      {sec?.numberBadge} — {sec?.shortTitle}
                      {beat.subsectionTitle ? ` · ${beat.subsectionTitle}` : ''}
                    </div>
                    <div className="text-xs text-slate-800 line-clamp-2">
                      {beat.displayText}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
