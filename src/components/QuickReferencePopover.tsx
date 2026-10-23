import React, { useState } from 'react';
import { Search, RotateCcw, CheckSquare, Square, X } from 'lucide-react';
import { EmergencySnippet, ScriptDocument } from '../core/types';

interface QuickReferencePopoverProps {
  document: ScriptDocument;
  initialTab?: number;
  activeOnDemandSnippet: EmergencySnippet | null;
  checklistState: Record<string, boolean>;
  onInvokeSnippet: (snippet: EmergencySnippet) => void;
  onReturnToLive: () => void;
  onToggleChecklist: (blockID: string) => void;
  onClose: () => void;
}

export const QuickReferencePopover: React.FC<QuickReferencePopoverProps> = ({
  document,
  initialTab = 0,
  activeOnDemandSnippet,
  checklistState,
  onInvokeSnippet,
  onReturnToLive,
  onToggleChecklist,
  onClose,
}) => {
  const [selectedTab, setSelectedTab] = useState<number>(initialTab);
  const [filterText, setFilterText] = useState('');
  const query = filterText.trim().toLowerCase();

  const filteredBackups = document.backupLines.filter(
    (item) =>
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.spokenLines.join(' ').toLowerCase().includes(query)
  );

  const filteredQuestions = document.moderatorQuestions.filter(
    (item) =>
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.spokenLines.join(' ').toLowerCase().includes(query)
  );

  const checklistSection = document.sections.find(
    (s) => s.role === 'organizerChecklist'
  );

  const completedChecklistCount = document.checklistBlocks.filter(
    (b) => checklistState[b.id] ?? b.isCheckedByDefault
  ).length;

  return (
    <div
      role="dialog"
      aria-label="On-Demand Moderator Tools"
      className="liquid-glass-Popover w-96 rounded-3xl border border-white/80 p-3.5 text-[#11141C] select-none"
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1 apple-glass-segmented flex-1">
          <button
            type="button"
            onClick={() => setSelectedTab(0)}
            className={`flex-1 py-1 px-2 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              selectedTab === 0
                ? 'apple-glass-btn-prominent'
                : 'apple-glass-btn text-slate-700'
            }`}
          >
            10 Backup Lines
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab(1)}
            className={`flex-1 py-1 px-2 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              selectedTab === 1
                ? 'apple-glass-btn-prominent'
                : 'apple-glass-btn text-slate-700'
            }`}
          >
            11 Questions
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab(2)}
            className={`flex-1 py-1 px-2 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              selectedTab === 2
                ? 'apple-glass-btn-prominent'
                : 'apple-glass-btn text-slate-700'
            }`}
          >
            12 Checklist ({completedChecklistCount}/{document.checklistBlocks.length})
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tools popover"
          className="apple-glass-btn p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {selectedTab !== 2 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full apple-glass-card mb-2.5">
          <Search className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={
              selectedTab === 0
                ? 'Filter emergency backup lines…'
                : 'Filter moderator questions by speaker/topic…'
            }
            aria-label="Filter reference lines"
            className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      )}

      <div className="pg-scroll max-h-80 overflow-y-auto pr-1 space-y-2">
        {selectedTab === 0 &&
          filteredBackups.map((snippet) => {
            const isSelected = activeOnDemandSnippet?.id === snippet.id;
            return (
              <button
                key={snippet.id}
                type="button"
                onClick={() => {
                  onInvokeSnippet(snippet);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-2xl cursor-pointer ${
                  isSelected
                    ? 'apple-glass-btn-prominent'
                    : 'apple-glass-btn text-slate-800'
                }`}
              >
                <div
                  className={`text-xs font-bold mb-1 ${
                    isSelected ? 'text-white' : 'text-[#1849A9]'
                  }`}
                >
                  {snippet.title}
                </div>
                {snippet.spokenLines.map((line, i) => (
                  <div
                    key={i}
                    className={`text-xs leading-snug ${
                      isSelected ? 'text-blue-50' : 'text-slate-800'
                    }`}
                  >
                    {line}
                  </div>
                ))}
                {snippet.cues.map((note, i) => (
                  <div
                    key={i}
                    className="mt-1 text-[11px] text-[#8F4F05] bg-[#FEF6E6]/90 px-2 py-0.5 rounded-full border border-amber-300/60"
                  >
                    Cue: {note}
                  </div>
                ))}
              </button>
            );
          })}

        {selectedTab === 1 &&
          filteredQuestions.map((snippet) => {
            const isSelected = activeOnDemandSnippet?.id === snippet.id;
            return (
              <button
                key={snippet.id}
                type="button"
                onClick={() => {
                  onInvokeSnippet(snippet);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-2xl cursor-pointer ${
                  isSelected
                    ? 'apple-glass-btn-prominent'
                    : 'apple-glass-btn text-slate-900'
                }`}
              >
                <div
                  className={`text-[11px] font-bold mb-1 ${
                    isSelected ? 'text-blue-100' : 'text-[#2363D9]'
                  }`}
                >
                  {snippet.title}
                </div>
                {snippet.spokenLines.map((line, i) => (
                  <div
                    key={i}
                    className={`text-xs font-medium leading-snug ${
                      isSelected ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {line}
                  </div>
                ))}
              </button>
            );
          })}

        {selectedTab === 2 && checklistSection && (
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-600 italic px-1 mb-1">
              Private organizer checklist — never shown in spoken stage flow.
            </div>
            {checklistSection.blocks.map((block) => {
              if (block.kind === 'subsectionHeading') {
                return (
                  <div
                    key={block.id}
                    className="pt-2 pb-0.5 px-1 text-[11px] font-bold tracking-wide text-slate-700"
                  >
                    {block.displayText}
                  </div>
                );
              }
              if (block.kind === 'checklistTask') {
                const checked =
                  checklistState[block.id] ?? block.isCheckedByDefault;
                const isDSItem = /data science/i.test(block.displayText);
                return (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => onToggleChecklist(block.id)}
                    className="w-full flex items-start gap-2.5 px-3 py-2 rounded-2xl apple-glass-btn text-left cursor-pointer"
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-[#2363D9] shrink-0 mt-0.5" />
                    ) : (
                      <Square
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isDSItem ? 'text-[#B86B0A]' : 'text-slate-500'
                        }`}
                      />
                    )}
                    <span
                      className={`text-xs leading-snug ${
                        checked
                          ? 'line-through text-slate-400'
                          : isDSItem
                          ? 'text-[#7A4304] font-medium'
                          : 'text-slate-800'
                      }`}
                    >
                      {block.displayText}
                    </span>
                  </button>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>

      {activeOnDemandSnippet && (
        <div className="mt-3 pt-2.5 border-t border-white/60">
          <button
            type="button"
            onClick={() => {
              onReturnToLive();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 apple-glass-btn-prominent text-xs font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return to Live Position</span>
          </button>
        </div>
      )}
    </div>
  );
};
