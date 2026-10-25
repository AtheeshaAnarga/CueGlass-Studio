import { ScriptBlock, ScriptDocument } from './types';

/**
 * Ephemeral 3-beat sliding window for lightweight Siri Dictation / Web Speech API tracking.
 *
 * Per design specification:
 * - Tracks ONLY up to 3 lines at any moment: `previous`, `current`, and `next`.
 * - Stores ZERO persistent word-position memory for old lines once the active beat changes.
 * - Progressively darkens spoken words inside `currentBeat` ONLY as the speaker actually speaks them in order.
 * - Never advances on a timer without speech.
 * - Uses multi-layer pronunciation tolerance (Phonetic skeleton, Damerau-Levenshtein,
 *   compound split/merge, N-best alternatives, and elastic lookahead bridge) so if a word
 *   is mispronounced or garbled by dictation, it seamlessly picks up the word or the
 *   immediately following word(s) in order.
 */
export interface ThreeBeatVoiceWindow {
  previousBeat: ScriptBlock | null;
  currentBeat: ScriptBlock | null;
  nextBeat: ScriptBlock | null;
  /** Next spoken dialogue beat (skips non-spoken stage cues if a cue sits between current and next spoken line) */
  nextSpokenBeat: ScriptBlock | null;
  /** All navigable spoken beats in the currently selected section, used to guard against false jumps across similar-looking paragraphs in the same section */
  sectionSpokenBeats?: ScriptBlock[];
}

export type VoiceTransitionAction =
  | 'stay'
  | 'advanceToNext'
  | 'jumpToNextWithProgress'
  | 'stepBackToPrev';

export interface VoiceTrackingDecision {
  action: VoiceTransitionAction;
  /** Number of speakable words darkened in the target/active beat */
  spokenWordCount: number;
  /** Total speakable words in the target/active beat */
  totalSpeakableWords: number;
  /** Target beat ID when advancing or stepping back; null if staying on currentBeat */
  targetBeatID: string | null;
  /** Diagnostic last matched word for subtle UI feedback */
  lastMatchedWord: string | null;
}

const NON_SPEAKABLE_BADGES = new Set([
  'pause',
  'beat',
  'slow',
  'fast',
  'smile',
  'breathe',
  'emphasis',
  'ask',
  'wait',
]);

/** Common short function words that should not trigger an unconfirmed multi-word skip on their own */
const SHORT_STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'to',
  'in',
  'on',
  'at',
  'of',
  'for',
  'and',
  'or',
  'but',
  'is',
  'it',
  'as',
  'be',
  'by',
  'we',
  'so',
  'if',
  'up',
  'no',
  'my',
  'me',
  'us',
]);

/** Common spoken number & contraction equivalents so dictation ("26" vs "twenty six", "we'll" vs "we will") aligns cleanly */
const EQUIVALENT_WORD_MAP: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  '10': 'ten',
  '26': 'twentysix',
  ok: 'okay',
  cos: 'because',
  cuz: 'because',
  gonna: 'going',
  wanna: 'want',
  kinda: 'kind',
  thru: 'through',
  nite: 'night',
};

const CONTRACTION_EXPANSIONS: Record<string, string[]> = {
  well: ['we', 'will'],
  were: ['we', 'are'],
  weve: ['we', 'have'],
  wed: ['we', 'would'],
  ill: ['i', 'will'],
  im: ['i', 'am'],
  ive: ['i', 'have'],
  id: ['i', 'would'],
  youre: ['you', 'are'],
  youll: ['you', 'will'],
  youve: ['you', 'have'],
  theyre: ['they', 'are'],
  theyll: ['they', 'will'],
  theyve: ['they', 'have'],
  its: ['it', 'is'],
  thats: ['that', 'is'],
  theres: ['there', 'is'],
  heres: ['here', 'is'],
  whats: ['what', 'is'],
  whos: ['who', 'is'],
  lets: ['let', 'us'],
  dont: ['do', 'not'],
  doesnt: ['does', 'not'],
  didnt: ['did', 'not'],
  cant: ['can', 'not'],
  cannot: ['can', 'not'],
  wont: ['will', 'not'],
  isnt: ['is', 'not'],
  arent: ['are', 'not'],
  wasnt: ['was', 'not'],
  werent: ['were', 'not'],
};

/**
 * Normalizes a single word token into lowercase alphanumeric characters for speech comparison.
 */
export function normalizeSpeechWord(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]/g, '');
  return EQUIVALENT_WORD_MAP[cleaned] ?? cleaned;
}

export const normalizeSpokenWord = normalizeSpeechWord;

/**
 * Computes a pronunciation-resilient phonetic code (inspired by Double Metaphone + vowel-initial preservation).
 * Maps words that sound similar despite bad pronunciation, accent variation, or Siri Dictation
 * spelling differences (e.g. "Atisha" vs "Atheesha", "welkum" vs "welcome", "siber" vs "cyber",
 * "teknikal" vs "technical") to the same or nearly identical phonetic skeleton.
 */
export function toPhoneticCode(rawWord: string): string {
  const w = normalizeSpeechWord(rawWord);
  if (!w) return '';
  if (w.length <= 2) return w;

  let s = w
    // Normalize common multi-character English phonetic patterns
    .replace(/ough/g, 'o')
    .replace(/augh/g, 'af')
    .replace(/tion|sion|cian/g, 'xn')
    .replace(/ture/g, 'xr')
    .replace(/ph/g, 'f')
    .replace(/gh/g, 'g')
    .replace(/^kn|^gn|^pn/g, 'n')
    .replace(/^wr/g, 'r')
    .replace(/^wh/g, 'w')
    .replace(/^x/g, 's')
    .replace(/ck|q/g, 'k')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/ch|sh|sch/g, 'x')
    .replace(/th/g, '0')
    .replace(/dg(?=[eiy])/g, 'j')
    .replace(/g(?=[eiy])/g, 'j')
    .replace(/z/g, 's')
    .replace(/v/g, 'f')
    .replace(/dt|dd/g, 't')
    .replace(/bp/g, 'p')
    .replace(/y/g, 'i');

  // Collapse consecutive identical characters ("ee" -> "e", "ll" -> "l", "ss" -> "s")
  s = s.replace(/(.)\1+/g, '$1');

  // Keep the leading character (whether vowel or consonant) and strip interior unstressed vowels
  const head = s[0];
  const tail = s
    .slice(1)
    .replace(/[aeiou]/g, '')
    .replace(/(.)\1+/g, '$1');

  return (head + tail).slice(0, 8);
}

/**
 * Extracts the ordered list of speakable words from a beat's raw Markdown or display text.
 * Strips inline cue badges (`[PAUSE]`, `[SMILE]`), Markdown formatting (`**`, `*`),
 * and leading stage cue labels so the word indices match `RichTextRenderer` 1-to-1.
 */
export function extractSpeakableWords(markdownOrText: string): string[] {
  if (!markdownOrText) return [];

  // Replace inline cue badges like [PAUSE], [BEAT] with space
  const withoutBadges = markdownOrText.replace(/\[([^\]]+)\]/g, (full, inner) => {
    const key = inner.trim().toLowerCase();
    if (NON_SPEAKABLE_BADGES.has(key)) {
      return ' ';
    }
    // Keep placeholder words (like [Confirmed Speaker's Name]) speakable
    return inner;
  });

  // Strip Markdown bold/italic/underline markers and punctuation-only tokens
  const rawTokens = withoutBadges
    .replace(/[*_~`#>]/g, ' ')
    .split(/\s+/)
    .map((t) => normalizeSpeechWord(t))
    .filter((t) => t.length > 0);

  return rawTokens;
}

/**
 * Builds the 3-beat sliding window (`previous`, `current`, `next`) around `activeBeatID`.
 */
export function getThreeBeatWindow(
  doc: ScriptDocument,
  activeBeatID: string
): ThreeBeatVoiceWindow {
  const beats: ScriptBlock[] = doc.allNavigableBeats;
  const idx = beats.findIndex((b: ScriptBlock) => b.id === activeBeatID);
  if (idx === -1) {
    const firstBeat = beats[0] ?? null;
    const sectionSpokenBeats = firstBeat
      ? beats.filter(
          (b: ScriptBlock) =>
            b.sectionID === firstBeat.sectionID && b.kind === 'spokenLine'
        )
      : [];
    return {
      previousBeat: null,
      currentBeat: firstBeat,
      nextBeat: beats[1] ?? null,
      nextSpokenBeat:
        beats.slice(1).find((b: ScriptBlock) => b.kind === 'spokenLine') ??
        beats[1] ??
        null,
      sectionSpokenBeats,
    };
  }

  const previousBeat = idx > 0 ? beats[idx - 1] : null;
  const currentBeat = beats[idx];
  const nextBeat = idx + 1 < beats.length ? beats[idx + 1] : null;

  let nextSpokenBeat: ScriptBlock | null = nextBeat;
  for (let i = idx + 1; i < Math.min(beats.length, idx + 4); i++) {
    if (beats[i].kind === 'spokenLine') {
      nextSpokenBeat = beats[i];
      break;
    }
  }

  const sectionSpokenBeats = beats.filter(
    (b: ScriptBlock) =>
      b.sectionID === currentBeat.sectionID && b.kind === 'spokenLine'
  );

  return {
    previousBeat,
    currentBeat,
    nextBeat,
    nextSpokenBeat,
    sectionSpokenBeats,
  };
}

/**
 * True Damerau-Levenshtein edit distance (supports adjacent transpositions as 1 edit)
 * for fast fuzzy matching of mispronounced words.
 */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const alen = a.length;
  const blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  if (Math.abs(alen - blen) > 4) return Math.abs(alen - blen);

  const dp: number[][] = Array.from({ length: alen + 1 }, () =>
    new Array<number>(blen + 1).fill(0)
  );
  for (let i = 0; i <= alen; i++) dp[i][0] = i;
  for (let j = 0; j <= blen; j++) dp[0][j] = j;

  for (let i = 1; i <= alen; i++) {
    for (let j = 1; j <= blen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
      }
    }
  }
  return dp[alen][blen];
}

/**
 * Computes a continuous similarity score `[0.0, 1.0]` between a spoken word and a script target word.
 * Combines:
 * 1. Exact normalized match (`1.0`)
 * 2. Live interim prefix / morphological stem match (`0.88`)
 * 3. Phonetic skeleton match (`toPhoneticCode`) for mispronunciations & accents (`0.82 - 0.92`)
 * 4. Damerau-Levenshtein character similarity (`0.72 - 0.90`)
 */
export function wordSimilarityScore(spoken: string, target: string): number {
  const s = normalizeSpeechWord(spoken);
  const t = normalizeSpeechWord(target);
  if (!s || !t) return 0;
  if (s === t) return 1.0;

  // Short words (1-2 chars): require exact match or common vowel-equivalence ("a"/"uh", "to"/"too"/"two")
  if (t.length <= 2 || s.length <= 2) {
    if (
      (t === 'a' && (s === 'uh' || s === 'ah')) ||
      (t === 'to' && (s === 'too' || s === 'two')) ||
      (t === 'in' && s === 'an') ||
      (t === 'on' && s === 'an')
    ) {
      return 0.85;
    }
    return 0;
  }

  // Prefix / stem match for live interim speech (e.g. "welc" -> "welcome", "sess" -> "session")
  if (s.length >= 3 && t.length >= 4 && (t.startsWith(s) || s.startsWith(t))) {
    const ratio = Math.min(s.length, t.length) / Math.max(s.length, t.length);
    if (ratio >= 0.55) {
      return 0.88;
    }
  }

  // Shared 4-letter root (e.g. "introducing" vs "introduce", " welcoming" vs "welcome")
  if (s.length >= 4 && t.length >= 4 && s.slice(0, 4) === t.slice(0, 4)) {
    return 0.84;
  }

  // Phonetic skeleton comparison (handles mispronunciations like "welkum" -> "welcome", "atisha" -> "atheesha")
  const pSpoken = toPhoneticCode(s);
  const pTarget = toPhoneticCode(t);
  if (pSpoken.length >= 2 && pTarget.length >= 2) {
    if (pSpoken === pTarget) {
      return 0.91;
    }
    const pDist = editDistance(pSpoken, pTarget);
    const maxPLen = Math.max(pSpoken.length, pTarget.length);
    if (maxPLen >= 3 && pDist === 1) {
      return 0.81;
    }
    if (maxPLen >= 5 && pDist <= 2 && pSpoken[0] === pTarget[0]) {
      return 0.75;
    }
  }

  // Character Damerau-Levenshtein similarity
  const maxLen = Math.max(s.length, t.length);
  const dist = editDistance(s, t);
  const charScore = 1 - dist / maxLen;

  // Boost score if first letter matches (speakers rarely mispronounce the initial phoneme)
  const sameInitialBonus = s[0] === t[0] ? 0.06 : 0;
  return Math.min(0.95, Math.max(0, charScore + sameInitialBonus));
}

/**
 * Returns true if a spoken word token matches a script word token with pronunciation tolerance.
 * @param strictness 'normal' (0.72 threshold for current cursor word) or 'strict' (0.80 for lookahead skips)
 */
export function wordsRoughlyMatch(
  spoken: string,
  target: string,
  strictness: 'normal' | 'strict' = 'normal'
): boolean {
  const threshold = strictness === 'strict' ? 0.8 : 0.72;
  return wordSimilarityScore(spoken, target) >= threshold;
}

function isSubstantiveContentWord(word: string): boolean {
  return word.length >= 3 && !SHORT_STOPWORDS.has(word);
}

function isDistinctiveWord(word: string): boolean {
  return word.length >= 5 && !SHORT_STOPWORDS.has(word);
}

/**
 * Checks whether a single spoken word matches two adjacent script words merged together,
 * OR whether two adjacent spoken words match a single compound script word
 * (e.g. "cyber security" <-> "cybersecurity", "path finder" <-> "Pathfinder", "we'll" <-> "we will").
 */
function checkCompoundOrContractionMatch(
  spokenTokens: string[],
  sIdx: number,
  targetWords: string[],
  tIdx: number
): { spokenConsumed: number; targetConsumed: number } | null {
  const sWord = spokenTokens[sIdx];
  const tWord = targetWords[tIdx];
  if (!sWord || !tWord) return null;

  // Never treat as a compound split/merge if the current spoken word already matches the current target word 1-to-1
  if (wordsRoughlyMatch(sWord, tWord, 'normal')) {
    return null;
  }

  // 1. Two spoken words merged into 1 script word (e.g., spoken "cyber" + "security" -> target "cybersecurity")
  if (sIdx + 1 < spokenTokens.length) {
    const mergedSpoken = spokenTokens[sIdx] + spokenTokens[sIdx + 1];
    if (
      Math.abs(mergedSpoken.length - tWord.length) <= 2 &&
      editDistance(mergedSpoken, tWord) <= 2
    ) {
      return { spokenConsumed: 2, targetConsumed: 1 };
    }
    // Or spoken expansion ("we" + "will") matching target contraction ("well" from "we'll")
    const exp = CONTRACTION_EXPANSIONS[tWord];
    if (
      exp &&
      exp[0] === spokenTokens[sIdx] &&
      exp[1] === spokenTokens[sIdx + 1]
    ) {
      return { spokenConsumed: 2, targetConsumed: 1 };
    }
  }

  // 2. One spoken word matching 2 script words (e.g., spoken "we'll" -> target "we" + "will", or "goodevening" -> "good" + "evening")
  if (tIdx + 1 < targetWords.length) {
    const mergedTarget = targetWords[tIdx] + targetWords[tIdx + 1];
    if (
      Math.abs(sWord.length - mergedTarget.length) <= 2 &&
      editDistance(sWord, mergedTarget) <= 2
    ) {
      return { spokenConsumed: 1, targetConsumed: 2 };
    }
    const exp = CONTRACTION_EXPANSIONS[sWord];
    if (
      exp &&
      exp[0] === targetWords[tIdx] &&
      exp[1] === targetWords[tIdx + 1]
    ) {
      return { spokenConsumed: 1, targetConsumed: 2 };
    }
  }

  return null;
}

/**
 * Aligns a stream of newly spoken words (plus optional N-best recognition alternatives)
 * against a beat's speakable words, starting from `currentSpokenCount`.
 *
 * Key Pronunciation & Error-Handling Capabilities:
 * 1. Direct sequential matching at `cursor` (`targetWords[cursor]`) using phonetic + fuzzy similarity.
 * 2. Compound / contraction split & merge (`"cyber security"` <-> `"cybersecurity"`).
 * 3. **Single Mispronounced Word Bridge (`cursor + 1`)**:
 *    - If the speaker mispronounces `targetWords[cursor]` (so dictation outputs a garbled word)
 *      and then speaks `targetWords[cursor + 1]`, or directly speaks `targetWords[cursor + 1]`,
 *      the aligner bridges over `targetWords[cursor]` and advances to `cursor + 2`.
 * 4. **Multi-Word Stumble / Name Bridge (`cursor + 2` .. `cursor + 3`)**:
 *    - If the speaker stumbles over 2–3 words (such as a complex name) and continues speaking
 *      the sentence in order, a 2-word ordered anchor phrase or a distinctive word following an
 *      unmatched spoken token seamlessly bridges to the exact spoken position.
 * 5. **Mid-Paragraph Phrase Pickup (`cursor + 2` .. `targetWords.length - 3`)**:
 *    - If the speaker intentionally starts reading the current paragraph from the middle (speaking
 *      at least 3 consecutive words in order with >= 2 content words), picks up directly at that phrase.
 * 6. **Strict Anti-Runaway Guard**:
 *    - Never jumps ahead on isolated short stopwords (`"the"`, `"to"`, `"and"`, `"in"`) unless
 *      confirmed by an adjacent word in order.
 */
export function computeBeatWordProgress(
  targetWords: string[],
  spokenTokens: string[],
  currentSpokenCount: number
): {
  spokenWordCount: number;
  isLineComplete: boolean;
  lastMatchedWord: string | null;
} {
  if (targetWords.length === 0 || spokenTokens.length === 0) {
    return {
      spokenWordCount: currentSpokenCount,
      isLineComplete:
        targetWords.length > 0 && currentSpokenCount >= targetWords.length,
      lastMatchedWord: null,
    };
  }

  let cursor = Math.max(0, Math.min(targetWords.length, currentSpokenCount));
  let lastMatchedWord: string | null = null;

  // Use the last 18 spoken tokens from the utterance stream
  const recentTokens = spokenTokens.slice(-18);

  // Anchor resync: if recentTokens starts a few words before `cursor` (e.g. Web Speech API
  // sent an updated cumulative interim transcript for the current clause), find where the
  // transcript aligns behind `cursor` so we don't re-consume old tokens as future lookaheads.
  let startTokenIdx = 0;
  if (cursor > 0 && recentTokens.length >= 2) {
    const searchBackStart = Math.max(0, cursor - 6);
    for (let tPos = cursor - 1; tPos >= searchBackStart; tPos--) {
      for (let sPos = recentTokens.length - 1; sPos >= 0; sPos--) {
        if (wordsRoughlyMatch(recentTokens[sPos], targetWords[tPos], 'strict')) {
          if (
            tPos === 0 ||
            sPos === 0 ||
            wordsRoughlyMatch(
              recentTokens[sPos - 1],
              targetWords[tPos - 1],
              'normal'
            )
          ) {
            const impliedCursor = tPos + 1;
            if (impliedCursor >= cursor - 1) {
              startTokenIdx = sPos + 1;
              cursor = Math.max(cursor, impliedCursor);
              break;
            }
          }
        }
      }
      if (startTokenIdx > 0) break;
    }
  }

  let consecutiveUnmatchedSpoken = 0;

  let i = startTokenIdx;
  while (i < recentTokens.length && cursor < targetWords.length) {
    const token = recentTokens[i];
    const nextToken = i + 1 < recentTokens.length ? recentTokens[i + 1] : null;

    // 1. Check Compound / Contraction match right at `cursor`
    const compoundAtCursor = checkCompoundOrContractionMatch(
      recentTokens,
      i,
      targetWords,
      cursor
    );
    if (compoundAtCursor) {
      cursor += compoundAtCursor.targetConsumed;
      lastMatchedWord = targetWords[Math.min(targetWords.length - 1, cursor - 1)];
      consecutiveUnmatchedSpoken = 0;
      i += compoundAtCursor.spokenConsumed;
      continue;
    }

    // 2. Direct match at the immediate expected word `targetWords[cursor]`
    if (wordsRoughlyMatch(token, targetWords[cursor], 'normal')) {
      lastMatchedWord = targetWords[cursor];
      cursor += 1;
      consecutiveUnmatchedSpoken = 0;
      i += 1;
      continue;
    }

    // 3. Two-word phonetic/slurred bridge at `cursor` + `cursor + 1`
    if (
      nextToken &&
      cursor + 1 < targetWords.length &&
      wordSimilarityScore(token, targetWords[cursor]) >= 0.5 &&
      wordsRoughlyMatch(nextToken, targetWords[cursor + 1], 'normal')
    ) {
      lastMatchedWord = targetWords[cursor + 1];
      cursor += 2;
      consecutiveUnmatchedSpoken = 0;
      i += 2;
      continue;
    }

    // 4. Single Mispronounced / Dropped Word Bridge (`cursor + 1`)
    if (cursor + 1 < targetWords.length) {
      const targetNext1 = targetWords[cursor + 1];
      const isTwoWordSequenceAtNext1 =
        nextToken !== null &&
        cursor + 2 < targetWords.length &&
        wordsRoughlyMatch(token, targetNext1, 'normal') &&
        wordsRoughlyMatch(nextToken, targetWords[cursor + 2], 'normal');

      const isConfirmedSingleSkip =
        wordsRoughlyMatch(token, targetNext1, 'strict') &&
        (consecutiveUnmatchedSpoken >= 1 ||
          (cursor > 0 &&
            !SHORT_STOPWORDS.has(targetNext1) &&
            targetNext1.length >= 4));

      if (isTwoWordSequenceAtNext1) {
        lastMatchedWord = targetWords[cursor + 2];
        cursor += 3;
        consecutiveUnmatchedSpoken = 0;
        i += 2;
        continue;
      }

      if (isConfirmedSingleSkip) {
        lastMatchedWord = targetNext1;
        cursor += 2;
        consecutiveUnmatchedSpoken = 0;
        i += 1;
        continue;
      }
    }

    // 5. Multi-Word Mispronunciation / Name Stumble Bridge (`cursor + 2` to `cursor + 3`)
    let bridgedMultiWord = false;
    if (consecutiveUnmatchedSpoken >= 1) {
      const maxLookahead = Math.min(3, targetWords.length - cursor - 1);
      for (let offset = 2; offset <= maxLookahead; offset++) {
        const candidateWord = targetWords[cursor + offset];
        const twoWordOrderedConfirm =
          nextToken !== null &&
          cursor + offset + 1 < targetWords.length &&
          wordsRoughlyMatch(token, candidateWord, 'normal') &&
          wordsRoughlyMatch(
            nextToken,
            targetWords[cursor + offset + 1],
            'normal'
          );

        const garbledThenDistinctiveConfirm =
          consecutiveUnmatchedSpoken >= offset &&
          !SHORT_STOPWORDS.has(candidateWord) &&
          candidateWord.length >= 4 &&
          wordsRoughlyMatch(token, candidateWord, 'strict');

        if (twoWordOrderedConfirm) {
          lastMatchedWord = targetWords[cursor + offset + 1];
          cursor += offset + 2;
          consecutiveUnmatchedSpoken = 0;
          i += 2;
          bridgedMultiWord = true;
          break;
        }

        if (garbledThenDistinctiveConfirm) {
          lastMatchedWord = candidateWord;
          cursor += offset + 1;
          consecutiveUnmatchedSpoken = 0;
          i += 1;
          bridgedMultiWord = true;
          break;
        }
      }
    }

    if (bridgedMultiWord) {
      continue;
    }

    // 6. Intentional Mid-Paragraph Phrase Pickup inside `targetWords` (`offset >= 2`):
    // If the speaker skipped earlier words in this beat and spoke >= 3 consecutive words in order
    // (with at least 2 substantive content words), align `cursor` to the end of that spoken phrase.
    if (i + 2 < recentTokens.length && cursor + 4 <= targetWords.length) {
      const tok0 = recentTokens[i];
      const tok1 = recentTokens[i + 1];
      const tok2 = recentTokens[i + 2];
      let matchedMidBeat = false;
      for (
        let tStart = cursor + 2;
        tStart <= targetWords.length - 3;
        tStart++
      ) {
        if (
          wordsRoughlyMatch(tok0, targetWords[tStart], 'strict') &&
          wordsRoughlyMatch(tok1, targetWords[tStart + 1], 'normal') &&
          wordsRoughlyMatch(tok2, targetWords[tStart + 2], 'strict')
        ) {
          const phraseSlice = [
            targetWords[tStart],
            targetWords[tStart + 1],
            targetWords[tStart + 2],
          ];
          const contentCount = phraseSlice.filter(isSubstantiveContentWord).length;
          if (contentCount >= 2) {
            cursor = tStart + 3;
            lastMatchedWord = targetWords[tStart + 2];
            consecutiveUnmatchedSpoken = 0;
            i += 3;
            matchedMidBeat = true;
            break;
          }
        }
      }
      if (matchedMidBeat) {
        continue;
      }
    }

    consecutiveUnmatchedSpoken += 1;
    i += 1;
  }

  return {
    spokenWordCount: cursor,
    isLineComplete: cursor >= targetWords.length,
    lastMatchedWord,
  };
}

interface CandidateBeatMatch {
  /** Number of speakable words from index 0 up to the end of the matched phrase in candidateWords */
  matchedCount: number;
  /** Number of words actually spoken and matched in the phrase (matchedCount - startOffset) */
  newlyMatchedWords: number;
  /** Index in candidateWords where the speaker started reading (0 = beginning, >= 2 = mid-paragraph) */
  startOffset: number;
  /** Number of substantive non-stopword content words in the matched phrase */
  contentWordCount: number;
  /** Number of long distinctive words (>= 5 chars, non-stopword) in the matched phrase */
  distinctiveWordCount: number;
  /** The matched slice of candidateWords */
  matchedPhrase: string[];
  /** Last matched word for diagnostic UI */
  lastWord: string | null;
}

/**
 * Checks if a beat's speakable words contain a contiguous match for `phraseWords`.
 * Used to verify whether a spoken phrase also exists in `currentBeat` or another beat in the active section.
 */
function doesBeatContainContiguousPhrase(
  beatWords: string[],
  phraseWords: string[]
): boolean {
  if (phraseWords.length === 0 || beatWords.length < phraseWords.length) {
    return false;
  }
  const pLen = phraseWords.length;
  for (let start = 0; start <= beatWords.length - pLen; start++) {
    let allMatch = true;
    for (let k = 0; k < pLen; k++) {
      if (!wordsRoughlyMatch(phraseWords[k], beatWords[start + k], 'normal')) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) return true;
  }
  return false;
}

/**
 * Computes the longest contiguous sequence of `spokenTokens` that matches anywhere inside `beatWords`.
 */
function maxContiguousSpokenMatchInBeat(
  beatWords: string[],
  spokenTokens: string[],
  fromIndex: number = 0
): number {
  if (beatWords.length === 0 || spokenTokens.length === 0) return 0;
  const tail = spokenTokens.slice(-12);
  let bestLen = 0;

  for (let bStart = Math.max(0, fromIndex); bStart < beatWords.length; bStart++) {
    for (let sStart = 0; sStart < tail.length; sStart++) {
      let len = 0;
      while (
        bStart + len < beatWords.length &&
        sStart + len < tail.length &&
        wordsRoughlyMatch(tail[sStart + len], beatWords[bStart + len], 'normal')
      ) {
        len += 1;
      }
      if (len > bestLen) {
        bestLen = len;
      }
    }
  }
  return bestLen;
}

/**
 * Measures whether two paragraphs look structurally/lexically similar (e.g. parallel speaker intros or thank-you lines
 * in the same section) by computing the overlap ratio of their substantive content words.
 */
function areParagraphsSimilarLooking(
  wordsA: string[],
  wordsB: string[]
): boolean {
  const contentA = new Set(wordsA.filter(isSubstantiveContentWord));
  const contentB = new Set(wordsB.filter(isSubstantiveContentWord));
  if (contentA.size === 0 || contentB.size === 0) return false;

  let shared = 0;
  for (const w of contentA) {
    if (contentB.has(w)) {
      shared += 1;
    } else {
      for (const wb of contentB) {
        if (wordsRoughlyMatch(w, wb, 'strict')) {
          shared += 1;
          break;
        }
      }
    }
  }

  const minSize = Math.min(contentA.size, contentB.size);
  return minSize >= 3 && shared / minSize >= 0.45;
}

/**
 * Matches recent spoken tokens against a candidate beat (`nextBeat`, `nextSpokenBeat`, or `previousBeat`),
 * supporting BOTH:
 * 1. **Start-of-paragraph reading (`startOffset === 0` or `1`)**, AND
 * 2. **Direct mid-paragraph reading (`startOffset >= 2`)** when the speaker skips the beginning of the
 *    next paragraph (even without speaking the current paragraph first!).
 *
 * Enforces strict content-word density and contiguity rules for mid-paragraph jumps (`allowMidParagraph === true`).
 */
function matchCandidateBeatPhrase(
  candidateWords: string[],
  spokenTokens: string[],
  allowMidParagraph: boolean = true
): CandidateBeatMatch {
  const emptyResult: CandidateBeatMatch = {
    matchedCount: 0,
    newlyMatchedWords: 0,
    startOffset: 0,
    contentWordCount: 0,
    distinctiveWordCount: 0,
    matchedPhrase: [],
    lastWord: null,
  };

  if (candidateWords.length === 0 || spokenTokens.length === 0) {
    return emptyResult;
  }

  const tail = spokenTokens.slice(-14);
  const maxStartOffset = allowMidParagraph
    ? candidateWords.length - 1
    : Math.min(1, candidateWords.length - 1);

  let bestMatch: CandidateBeatMatch = emptyResult;
  let bestScore = -1;

  for (let startIdx = 0; startIdx < tail.length; startIdx++) {
    for (
      let candidateStartOffset = 0;
      candidateStartOffset <= maxStartOffset;
      candidateStartOffset++
    ) {
      const isMidParagraph = candidateStartOffset >= 2;
      const initialStrictness = isMidParagraph ? 'strict' : 'normal';

      if (
        !wordsRoughlyMatch(
          tail[startIdx],
          candidateWords[candidateStartOffset],
          initialStrictness
        )
      ) {
        continue;
      }

      let cIdx = candidateStartOffset + 1;
      let tIdx = startIdx + 1;
      let lastWord = candidateWords[candidateStartOffset];
      let internalSkips = 0;

      while (tIdx < tail.length && cIdx < candidateWords.length) {
        if (wordsRoughlyMatch(tail[tIdx], candidateWords[cIdx], 'normal')) {
          lastWord = candidateWords[cIdx];
          cIdx += 1;
          tIdx += 1;
        } else if (
          // Allow at most 1 single-word mispronunciation skip if confirmed by the following word in order
          internalSkips === 0 &&
          cIdx + 1 < candidateWords.length &&
          wordsRoughlyMatch(tail[tIdx], candidateWords[cIdx + 1], 'strict') &&
          isSubstantiveContentWord(candidateWords[cIdx + 1]) &&
          (tIdx + 1 >= tail.length ||
            cIdx + 2 >= candidateWords.length ||
            wordsRoughlyMatch(
              tail[tIdx + 1],
              candidateWords[cIdx + 2],
              'normal'
            ))
        ) {
          lastWord = candidateWords[cIdx + 1];
          cIdx += 2;
          tIdx += 1;
          internalSkips += 1;
        } else {
          // For mid-paragraph matching, stop extending on the first non-matching spoken token
          // so only genuinely contiguous spoken phrases are measured.
          if (isMidParagraph) {
            break;
          }
          tIdx += 1;
        }
      }

      const newlyMatchedWords = cIdx - candidateStartOffset - internalSkips;
      const matchedPhrase = candidateWords.slice(candidateStartOffset, cIdx);
      const contentWordCount = matchedPhrase.filter(isSubstantiveContentWord).length;
      const distinctiveWordCount = matchedPhrase.filter(isDistinctiveWord).length;

      let passesThreshold = false;
      if (!isMidParagraph) {
        // Start of paragraph (offset 0 or 1):
        const minRequired =
          candidateWords.length === 1
            ? 1
            : candidateStartOffset === 0
            ? 2
            : Math.min(2, candidateWords.length - 1);
        passesThreshold =
          newlyMatchedWords >= minRequired &&
          (contentWordCount >= 1 || newlyMatchedWords >= 3);
      } else {
        // Mid-paragraph (offset >= 2):
        // Require either:
        // (a) >= 3 consecutive/ordered words with >= 2 substantive content words, OR
        // (b) >= 3 consecutive words with >= 1 distinctive word (>= 5 chars) and 0 internal skips, OR
        // (c) >= 2 consecutive content words (0 skips) where at least 1 is a distinctive word (>= 5 chars)
        const hasThreeWordAnchor =
          newlyMatchedWords >= 3 &&
          (contentWordCount >= 2 ||
            (distinctiveWordCount >= 1 && internalSkips === 0));
        const hasTwoDistinctiveAnchor =
          newlyMatchedWords >= 2 &&
          internalSkips === 0 &&
          contentWordCount >= 2 &&
          distinctiveWordCount >= 1;

        passesThreshold = hasThreeWordAnchor || hasTwoDistinctiveAnchor;
      }

      if (passesThreshold) {
        // Prefer longer contiguous matches, higher content word count, and earlier start offset on ties
        const score =
          newlyMatchedWords * 100 +
          contentWordCount * 25 +
          distinctiveWordCount * 15 -
          (isMidParagraph ? 10 : 0) -
          candidateStartOffset * 0.5;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            matchedCount: cIdx,
            newlyMatchedWords,
            startOffset: candidateStartOffset,
            contentWordCount,
            distinctiveWordCount,
            matchedPhrase,
            lastWord,
          };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Verifies that a candidate match in `nextBeat` is NOT a false positive caused by:
 * 1. The exact same (or equally strong) phrase appearing in `currentBeat` (`currentWords`).
 * 2. `currentBeat` and `nextBeat` being "same-looking paragraphs" where the user only spoke a shared template phrase.
 * 3. Another paragraph in the selected section (`sectionSpokenBeats`) sharing the exact same mid-paragraph phrase.
 */
function isNextBeatMatchUnambiguous(
  match: CandidateBeatMatch,
  candidateBeatID: string,
  candidateWords: string[],
  currentWords: string[],
  currentSpokenCount: number,
  spokenTokens: string[],
  window: ThreeBeatVoiceWindow
): boolean {
  if (match.newlyMatchedWords <= 0 || match.matchedPhrase.length === 0) {
    return false;
  }

  // 1. Check how strongly the spoken tokens match inside `currentBeat` (especially from `currentSpokenCount` onward)
  const currentForwardContiguous = maxContiguousSpokenMatchInBeat(
    currentWords,
    spokenTokens,
    currentSpokenCount
  );
  const currentAnywhereContiguous = maxContiguousSpokenMatchInBeat(
    currentWords,
    spokenTokens,
    0
  );

  // If the spoken phrase matches inside the remaining part of `currentBeat` just as well as (or within 1 word of) `nextBeat`,
  // stay on `currentBeat`! Never jump away when the user is speaking words that exist in `currentBeat`.
  if (
    currentForwardContiguous >= match.newlyMatchedWords ||
    (currentForwardContiguous >= 2 &&
      currentForwardContiguous >= match.newlyMatchedWords - 1)
  ) {
    return false;
  }

  // If the exact matched phrase from `nextBeat` appears contiguously anywhere in `currentBeat`,
  // and `currentBeat` is not yet near its end, do not jump on a shared phrase!
  const isNearEndOfCurrent =
    currentWords.length > 0 &&
    currentSpokenCount >= Math.max(1, currentWords.length - 2);

  if (
    !isNearEndOfCurrent &&
    (doesBeatContainContiguousPhrase(currentWords, match.matchedPhrase) ||
      currentAnywhereContiguous >= match.newlyMatchedWords)
  ) {
    return false;
  }

  // 2. If `previousBeat` also contains this exact mid-paragraph phrase and we haven't started `currentBeat`, guard against echo
  if (match.startOffset >= 2 && window.previousBeat) {
    const prevWords = extractSpeakableWords(
      window.previousBeat.kind === 'spokenLine'
        ? window.previousBeat.rawMarkdown
        : window.previousBeat.displayText
    );
    if (
      doesBeatContainContiguousPhrase(prevWords, match.matchedPhrase) &&
      match.newlyMatchedWords < 4
    ) {
      return false;
    }
  }

  // 3. Same-Looking Paragraph Guard across the currently selected section:
  // Check if `currentBeat` and `candidateWords` are similar-looking paragraphs, OR if another beat
  // in `window.sectionSpokenBeats` contains the exact same phrase.
  const currentContentSet = new Set(
    currentWords.filter(isSubstantiveContentWord)
  );
  const hasUniqueWordVersusCurrent = match.matchedPhrase.some(
    (w) =>
      isSubstantiveContentWord(w) &&
      !currentContentSet.has(w) &&
      !Array.from(currentContentSet).some((cw) =>
        wordsRoughlyMatch(w, cw, 'strict')
      )
  );

  // For any mid-paragraph jump (or when `currentBeat` and `nextBeat` look similar),
  // the spoken phrase MUST contain at least 1 substantive content word that does NOT appear in `currentBeat`!
  const similarToCurrent = areParagraphsSimilarLooking(
    currentWords,
    candidateWords
  );
  if ((match.startOffset >= 2 || similarToCurrent) && !hasUniqueWordVersusCurrent) {
    return false;
  }

  // If `currentBeat` and `nextBeat` are similar-looking paragraphs and we are not near the end of `currentBeat`,
  // require at least 3 matched words (or 2 distinctive unique words) so shared opening/middle boilerplate never jumps early.
  if (
    similarToCurrent &&
    !isNearEndOfCurrent &&
    match.newlyMatchedWords < 3 &&
    match.distinctiveWordCount < 2
  ) {
    return false;
  }

  // Check other paragraphs in the selected section (`sectionSpokenBeats`) for duplicate phrases
  if (window.sectionSpokenBeats && window.sectionSpokenBeats.length > 1) {
    const duplicateInOtherSectionBeat = window.sectionSpokenBeats.some(
      (otherBeat) => {
        if (
          otherBeat.id === candidateBeatID ||
          otherBeat.id === window.currentBeat?.id
        ) {
          return false;
        }
        const otherWords = extractSpeakableWords(otherBeat.rawMarkdown);
        return doesBeatContainContiguousPhrase(otherWords, match.matchedPhrase);
      }
    );

    // If another paragraph in the selected section has this exact same phrase,
    // don't jump on a short 2–3 word template phrase—require at least 4 matched words!
    if (duplicateInOtherSectionBeat && match.newlyMatchedWords < 4) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluates a live speech recognition transcript (and optional N-best alternative transcripts
 * from `SpeechRecognitionResult`) against the 3-beat sliding window (`previous`, `current`, `next`).
 *
 * Behavior:
 * 1. Updates word-by-word progress inside `currentBeat` (progressive darkening).
 *    If N-best alternatives are provided by Siri Dictation, picks the alternative that
 *    advances `currentBeat` best in sequential order.
 * 2. When `currentBeat` reaches the end of its speakable words, returns `action: 'advanceToNext'`
 *    so the app switches to `nextSpokenBeat` and resets old word memory.
 * 3. If the speaker skips ahead and starts reading `nextBeat` / `nextSpokenBeat` — EITHER from the
 *    beginning OR directly from the middle of the next paragraph (even without speaking `currentBeat` first) —
 *    verifies that the phrase is unambiguous against `currentBeat` and similar-looking paragraphs in the
 *    selected section, and returns `action: 'jumpToNextWithProgress'` with the matched word offset.
 * 4. If the speaker repeats `previousBeat` (when `currentSpokenCount === 0`), returns `action: 'stepBackToPrev'`.
 */
export function evaluateThreeBeatWindow(
  window: ThreeBeatVoiceWindow,
  transcript: string,
  currentSpokenCount: number,
  alternativeTranscripts: string[] = []
): VoiceTrackingDecision {
  const currentBeat = window.currentBeat;
  if (!currentBeat) {
    return {
      action: 'stay',
      spokenWordCount: 0,
      totalSpeakableWords: 0,
      targetBeatID: null,
      lastMatchedWord: null,
    };
  }

  const allTranscriptCandidates = [
    transcript,
    ...alternativeTranscripts.filter((alt) => alt && alt !== transcript),
  ];

  const primarySpokenTokens = extractSpeakableWords(transcript);
  const currentWords = extractSpeakableWords(
    currentBeat.kind === 'spokenLine'
      ? currentBeat.rawMarkdown
      : currentBeat.displayText
  );

  if (primarySpokenTokens.length === 0) {
    return {
      action: 'stay',
      spokenWordCount: currentSpokenCount,
      totalSpeakableWords: currentWords.length,
      targetBeatID: null,
      lastMatchedWord: null,
    };
  }

  // 1. Evaluate `currentBeat` across the primary transcript and any N-best recognition alternatives
  let bestCurrentProgress = computeBeatWordProgress(
    currentWords,
    primarySpokenTokens,
    currentSpokenCount
  );

  for (let a = 1; a < allTranscriptCandidates.length; a++) {
    const altTokens = extractSpeakableWords(allTranscriptCandidates[a]);
    if (altTokens.length === 0) continue;
    const altProgress = computeBeatWordProgress(
      currentWords,
      altTokens,
      currentSpokenCount
    );
    if (altProgress.spokenWordCount > bestCurrentProgress.spokenWordCount) {
      bestCurrentProgress = altProgress;
    }
  }

  const isCurrentBeatCompleted =
    currentWords.length > 0 &&
    bestCurrentProgress.spokenWordCount >= currentWords.length;

  if (isCurrentBeatCompleted) {
    const targetNext = window.nextSpokenBeat ?? window.nextBeat;
    if (targetNext) {
      const nextWords = extractSpeakableWords(
        targetNext.kind === 'spokenLine'
          ? targetNext.rawMarkdown
          : targetNext.displayText
      );
      return {
        action: 'advanceToNext',
        spokenWordCount: 0,
        totalSpeakableWords: nextWords.length,
        targetBeatID: targetNext.id,
        lastMatchedWord: bestCurrentProgress.lastMatchedWord,
      };
    }
  }

  // 2. Check if the user has started speaking `nextBeat` or `nextSpokenBeat` (from the start OR from the middle!)
  const didAdvanceCurrent =
    bestCurrentProgress.spokenWordCount > currentSpokenCount;
  const isNearEndOfCurrent =
    currentWords.length > 0 &&
    bestCurrentProgress.spokenWordCount >= Math.max(1, currentWords.length - 2);

  if (!didAdvanceCurrent || isNearEndOfCurrent) {
    const candidates = [window.nextBeat, window.nextSpokenBeat].filter(
      (b, idx, arr): b is ScriptBlock =>
        Boolean(b) && arr.findIndex((x) => x?.id === b?.id) === idx
    );

    for (const candidate of candidates) {
      const candidateWords = extractSpeakableWords(
        candidate.kind === 'spokenLine'
          ? candidate.rawMarkdown
          : candidate.displayText
      );

      for (const candidateTranscript of allTranscriptCandidates) {
        const candidateSpokenTokens = extractSpeakableWords(candidateTranscript);
        if (candidateSpokenTokens.length === 0) continue;

        const nextMatch = matchCandidateBeatPhrase(
          candidateWords,
          candidateSpokenTokens,
          true
        );

        if (
          nextMatch.newlyMatchedWords >= 2 &&
          isNextBeatMatchUnambiguous(
            nextMatch,
            candidate.id,
            candidateWords,
            currentWords,
            currentSpokenCount,
            candidateSpokenTokens,
            window
          )
        ) {
          // Cap spokenWordCount to `candidateWords.length - 1` when jumping into a multi-word beat
          // so jumping into the middle/end of `nextBeat` lands cleanly on `nextBeat` rather than double-skipping past it.
          const targetSpokenWordCount =
            candidateWords.length > 1
              ? Math.min(candidateWords.length - 1, nextMatch.matchedCount)
              : nextMatch.matchedCount;

          return {
            action: 'jumpToNextWithProgress',
            spokenWordCount: targetSpokenWordCount,
            totalSpeakableWords: candidateWords.length,
            targetBeatID: candidate.id,
            lastMatchedWord: nextMatch.lastWord,
          };
        }
      }
    }

    // 3. Check `previousBeat` only if we haven't spoken into `currentBeat` yet
    if (!didAdvanceCurrent && currentSpokenCount === 0 && window.previousBeat) {
      const prevWords = extractSpeakableWords(
        window.previousBeat.kind === 'spokenLine'
          ? window.previousBeat.rawMarkdown
          : window.previousBeat.displayText
      );
      const prevMatch = matchCandidateBeatPhrase(
        prevWords,
        primarySpokenTokens,
        false
      );
      if (
        prevMatch.newlyMatchedWords >= 2 &&
        !doesBeatContainContiguousPhrase(currentWords, prevMatch.matchedPhrase)
      ) {
        return {
          action: 'stepBackToPrev',
          spokenWordCount: Math.min(
            Math.max(1, prevWords.length - 1),
            prevMatch.matchedCount
          ),
          totalSpeakableWords: prevWords.length,
          targetBeatID: window.previousBeat.id,
          lastMatchedWord: prevMatch.lastWord,
        };
      }
    }
  }

  return {
    action: 'stay',
    spokenWordCount: bestCurrentProgress.spokenWordCount,
    totalSpeakableWords: currentWords.length,
    targetBeatID: null,
    lastMatchedWord: bestCurrentProgress.lastMatchedWord,
  };
}
