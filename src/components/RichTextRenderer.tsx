import React from 'react';
import { FontWeightOption } from '../core/types';
import { normalizeSpokenWord } from '../core/voiceTracker';

interface RichTextRendererProps {
  markdown: string;
  isActive: boolean;
  isDark?: boolean;
  fontWeight?: FontWeightOption;
  /**
   * Number of speakable words already spoken in the currently selected beat.
   * Only applied when `isActive === true`.
   */
  spokenWordCount?: number;
  /**
   * Whether live Siri Dictation / Voice Auto-Follow is currently listening.
   */
  isVoiceListening?: boolean;
  /**
   * Whether spoken words should visually darken as they are spoken.
   * When false, words stay clean at full brightness while voice tracking still auto-advances lines.
   */
  darkenSpokenWords?: boolean;
  /**
   * Opacity percentage (15–75) for spoken words when `darkenSpokenWords` is enabled.
   */
  spokenWordOpacity?: number;
  /**
   * Whether to underline the current target word while listening.
   */
  showTargetUnderline?: boolean;
  onPlaceholderClick?: (token: string, label: string) => void;
}

const BREATH_MARKERS = new Set(['[PAUSE]', '[BEAT]', '[BREATHE]']);

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  markdown,
  isActive,
  isDark = false,
  fontWeight = 500,
  spokenWordCount = 0,
  isVoiceListening = false,
  darkenSpokenWords = true,
  spokenWordOpacity = 32,
  showTargetUnderline = true,
  onPlaceholderClick,
}) => {
  // Tokenize by ==highlight==, **[Placeholder]**, [Placeholder/Breath], **bold**, and *italic*
  const tokenRegex =
    /(==[^=]+==|\*\*\[[^\[\]]+\]\*\*|\[[^\[\]]+\]|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = markdown.split(tokenRegex);

  const placeholderClass = isDark
    ? 'inline-flex items-baseline mx-0.5 px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-200 font-semibold cursor-pointer'
    : 'inline-flex items-baseline mx-0.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-[#78350F] font-semibold cursor-pointer';

  const highlightClass = isDark
    ? isActive
      ? 'inline px-2 py-0.5 mx-0.5 rounded-lg bg-sky-400/25 text-sky-100 font-semibold'
      : 'inline px-1.5 py-0.5 mx-0.5 rounded-md bg-sky-400/15 text-sky-200/90'
    : isActive
    ? 'inline px-2 py-0.5 mx-0.5 rounded-lg bg-sky-500/18 text-[#0C3B87] font-semibold'
    : 'inline px-1.5 py-0.5 mx-0.5 rounded-md bg-sky-500/12 text-[#1E40AF]';

  const breathClass = isDark
    ? 'inline-flex items-center gap-0.5 mx-1 px-2 py-0.5 rounded-full text-[0.62em] font-mono-tabular uppercase tracking-wider bg-emerald-400/18 text-emerald-300 align-middle select-none'
    : 'inline-flex items-center gap-0.5 mx-1 px-2 py-0.5 rounded-full text-[0.62em] font-mono-tabular uppercase tracking-wider bg-emerald-500/16 text-emerald-900 align-middle select-none';

  const boldWeight = Math.min(800, fontWeight + 200);

  // Track running speakable word index ONLY when this beat is the active beat
  // and either words have been spoken or voice listening is active.
  const enableWordTracking =
    isActive && (spokenWordCount > 0 || isVoiceListening);
  let wordCounter = 0;

  /**
   * Renders a text segment as individual word spans when active-beat voice tracking
   * is enabled so spoken words progressively darken (when `darkenSpokenWords` is true)
   * or remain clean while still tracking progress.
   */
  const renderTrackableText = (text: string, keyPrefix: string) => {
    if (!enableWordTracking) {
      return text;
    }

    const segments = text.split(/(\s+)/);
    return segments.map((seg, sIdx) => {
      if (!seg || /^\s+$/.test(seg)) {
        return <React.Fragment key={`${keyPrefix}-ws-${sIdx}`}>{seg}</React.Fragment>;
      }

      const norm = normalizeSpokenWord(seg);
      if (!norm) {
        return <React.Fragment key={`${keyPrefix}-p-${sIdx}`}>{seg}</React.Fragment>;
      }

      const thisWordIdx = wordCounter++;
      const isSpoken = thisWordIdx < spokenWordCount;
      const isCurrentTarget =
        isVoiceListening && thisWordIdx === spokenWordCount;

      const shouldDarken = isSpoken && darkenSpokenWords;
      const shouldUnderline =
        !isSpoken && isCurrentTarget && darkenSpokenWords && showTargetUnderline;

      return (
        <span
          key={`${keyPrefix}-w-${thisWordIdx}`}
          data-word-index={thisWordIdx}
          data-word-spoken={isSpoken ? 'true' : 'false'}
          data-word-darkened={shouldDarken ? 'true' : 'false'}
          style={
            shouldDarken
              ? { opacity: Math.max(0.15, Math.min(0.85, spokenWordOpacity / 100)) }
              : undefined
          }
          className={`transition-all duration-200 ${
            shouldDarken
              ? isDark
                ? 'text-slate-400'
                : 'text-slate-500'
              : shouldUnderline
              ? isDark
                ? 'underline decoration-sky-400/75 decoration-2 underline-offset-4'
                : 'underline decoration-[#2363D9]/70 decoration-2 underline-offset-4'
              : ''
          }`}
        >
          {seg}
        </span>
      );
    });
  };

  return (
    <span style={{ fontWeight }}>
      {parts.map((part, idx) => {
        if (!part) return null;

        // Luminous Highlight ==...==
        if (part.startsWith('==') && part.endsWith('==') && part.length > 4) {
          const inner = part.slice(2, -2);
          return (
            <span key={idx} className={highlightClass}>
              {renderTrackableText(inner, `hl-${idx}`)}
            </span>
          );
        }

        // Bold placeholder like **[Confirmed Speaker's Full Name]**
        if (part.startsWith('**[') && part.endsWith(']**')) {
          const innerToken = part.slice(2, -2);
          if (BREATH_MARKERS.has(innerToken.toUpperCase())) {
            const label = innerToken.slice(1, -1).toUpperCase();
            return (
              <span
                key={idx}
                className={breathClass}
                title="Cadence & Breath Pause"
              >
                <span>⏸</span>
                <span>{label}</span>
              </span>
            );
          }
          const label = innerToken.slice(1, -1);
          return (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlaceholderClick?.(innerToken, label);
              }}
              title="Unresolved placeholder — click to fill or inspect in Preflight"
              className={placeholderClass}
            >
              [{renderTrackableText(label, `bph-${idx}`)}]
            </button>
          );
        }

        // Standard placeholder or breath marker like [PAUSE] or [Confirmed Speaker's Name]
        if (part.startsWith('[') && part.endsWith(']')) {
          if (BREATH_MARKERS.has(part.toUpperCase())) {
            const label = part.slice(1, -1).toUpperCase();
            return (
              <span
                key={idx}
                className={breathClass}
                title="Cadence & Breath Pause"
              >
                <span>⏸</span>
                <span>{label}</span>
              </span>
            );
          }
          const label = part.slice(1, -1);
          return (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlaceholderClick?.(part, label);
              }}
              title="Unresolved placeholder — click to fill or inspect in Preflight"
              className={placeholderClass}
            >
              [{renderTrackableText(label, `ph-${idx}`)}]
            </button>
          );
        }

        // Bold text **...**
        if (part.startsWith('**') && part.endsWith('**')) {
          const inner = part.slice(2, -2);
          return (
            <strong
              key={idx}
              style={{ fontWeight: boldWeight }}
              className={
                isDark
                  ? isActive
                    ? 'text-white'
                    : 'text-slate-200'
                  : isActive
                  ? 'text-[#07090E]'
                  : 'text-[#2B313D]'
              }
            >
              {renderTrackableText(inner, `b-${idx}`)}
            </strong>
          );
        }

        // Italic text *...*
        if (part.startsWith('*') && part.endsWith('*')) {
          const inner = part.slice(1, -1);
          return (
            <em key={idx} className="italic">
              {renderTrackableText(inner, `em-${idx}`)}
            </em>
          );
        }

        return (
          <React.Fragment key={idx}>
            {renderTrackableText(part, `txt-${idx}`)}
          </React.Fragment>
        );
      })}
    </span>
  );
};
