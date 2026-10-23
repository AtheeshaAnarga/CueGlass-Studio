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
    return {
      previousBeat: null,
      currentBeat: beats[0] ?? null,
      nextBeat: beats[1] ?? null,
      nextSpokenBeat:
        beats.slice(1).find((b: ScriptBlock) => b.kind === 'spokenLine') ??
        beats[1] ??
        null,
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

  return {
    previousBeat,
    currentBeat,
    nextBeat,
    nextSpokenBeat,
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
 * 4. **Multi-Word Stumble / Name Bridge (`cursor + 2` .. `cursor + 4`)**:
 *    - If the speaker stumbles over 2–3 words (such as a complex name) and continues speaking
 *      the sentence in order, a 2-word ordered anchor phrase or a distinctive word following an
 *      unmatched spoken token seamlessly bridges to the exact spoken position.
 * 5. **Strict Anti-Runaway Guard**:
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
          // Verify if the token right before also matches when available
          if (
            tPos === 0 ||
            sPos === 0 ||
            wordsRoughlyMatch(
              recentTokens[sPos - 1],
              targetWords[tPos - 1],
              'normal'
            )
          ) {
            // The token at `sPos` corresponds to already-spoken `targetWords[tPos]`.
            // Advance `startTokenIdx` to the tokens spoken AFTER `sPos`, and align `cursor` to `tPos + 1`
            // if `tPos + 1 >= cursor`.
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

  // Track how many consecutive spoken tokens failed to match at `cursor`
  // (a non-zero count means the user spoke a word that dictation garbled due to mispronunciation!)
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

    // 3. Two-word phonetic/slurred bridge at `cursor` + `cursor + 1`:
    // What if the user slurred `targetWords[cursor]` (weak phonetic match >= 0.52)
    // AND the very next spoken word `nextToken` matches `targetWords[cursor + 1]`?
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

    // 4. Single Mispronounced / Dropped Word Bridge (`cursor + 1`):
    // If `token` itself matches `targetWords[cursor + 1]`, bridge `targetWords[cursor]` when:
    // - We just heard an unmatched/garbled spoken token right before (`consecutiveUnmatchedSpoken >= 1`), OR
    // - `nextToken` also matches `targetWords[cursor + 2]` in order (2-word sequence confirmation), OR
    // - We are already mid-line (`cursor > 0`) and `targetWords[cursor + 1]` is a distinctive content word.
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

    // 5. Multi-Word Mispronunciation / Name Stumble Bridge (`cursor + 2` to `cursor + 3`):
    // Only triggers when the speaker actually uttered unmatched/garbled speech (`consecutiveUnmatchedSpoken >= 1`)
    // so saying words from the middle of a sentence without speaking the earlier words never jumps ahead.
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

    // Otherwise this spoken token did not match at `cursor` (e.g., a garbled mispronunciation or "um"/"uh").
    // Record that we heard an unmatched spoken word so the very next word can bridge `targetWords[cursor]`!
    consecutiveUnmatchedSpoken += 1;
    i += 1;
  }

  return {
    spokenWordCount: cursor,
    isLineComplete: cursor >= targetWords.length,
    lastMatchedWord,
  };
}

/**
 * Checks if the recent spoken tokens match the beginning of a candidate beat (`nextBeat` or `previousBeat`).
 * Requires at least 2 consecutive matched words (or 1 word if the entire beat is a 1-word line)
 * to prevent accidental false jumps on single filler words.
 */
function matchCandidateBeatStart(
  candidateWords: string[],
  spokenTokens: string[]
): { matchedCount: number; lastWord: string | null } {
  if (candidateWords.length === 0 || spokenTokens.length === 0) {
    return { matchedCount: 0, lastWord: null };
  }

  const tail = spokenTokens.slice(-10);

  // Try starting from any token in the recent tail to see if the user began speaking the candidate beat
  for (let startIdx = 0; startIdx < tail.length; startIdx++) {
    // Allow matching from word 0 of the candidate beat, OR word 1 if word 0 was mispronounced
    // and words 1 + 2 match in order
    for (const candidateStartOffset of [0, 1]) {
      if (candidateStartOffset >= candidateWords.length) continue;
      if (
        !wordsRoughlyMatch(
          tail[startIdx],
          candidateWords[candidateStartOffset],
          'normal'
        )
      ) {
        continue;
      }

      let matched = candidateStartOffset + 1;
      let lastWord = candidateWords[candidateStartOffset];
      let tIdx = startIdx + 1;

      while (tIdx < tail.length && matched < candidateWords.length) {
        if (wordsRoughlyMatch(tail[tIdx], candidateWords[matched], 'normal')) {
          lastWord = candidateWords[matched];
          matched += 1;
          tIdx += 1;
        } else if (
          matched + 1 < candidateWords.length &&
          wordsRoughlyMatch(tail[tIdx], candidateWords[matched + 1], 'strict') &&
          !SHORT_STOPWORDS.has(candidateWords[matched + 1])
        ) {
          lastWord = candidateWords[matched + 1];
          matched += 2;
          tIdx += 1;
        } else {
          tIdx += 1;
        }
      }

      const newlyMatchedWords = matched - candidateStartOffset;
      const minRequired =
        candidateWords.length === 1
          ? 1
          : candidateStartOffset === 0
          ? 2
          : Math.min(2, candidateWords.length - 1);

      if (newlyMatchedWords >= minRequired) {
        return { matchedCount: matched, lastWord };
      }
    }
  }

  return { matchedCount: 0, lastWord: null };
}

/**
 * Evaluates a live speech recognition transcript (and optional N-best alternative transcripts
 * from `SpeechRecognitionResult`) against the 3-beat sliding window (`previous`, `current`, `next`).
 *
 * Behavior:
 * 1. Updates word-by-word progress inside `currentBeat` (progressive darkening).
 *    If N-best alternatives are provided by Siri Dictation, picks the alternative that
 *    advances `currentBeat` best in sequential order.
 * 2. When `currentBeat` reaches the end of its speakable words (or within the last word of a long beat
 *    when the final word is trailed off), returns `action: 'advanceToNext'` so the app switches
 *    to `nextSpokenBeat` and resets old word memory.
 * 3. If the speaker skips ahead and starts reading `nextBeat` / `nextSpokenBeat`, returns
 *    `action: 'jumpToNextWithProgress'` with the initial matched word count in that next beat.
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
  // so if a mispronounced word appears accurately in alternative #2 or #3, we pick it up effortlessly!
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

  // 2. Check if the user has started speaking `nextBeat` or `nextSpokenBeat`
  // (Either when `currentBeat` didn't advance on this utterance, OR when `currentBeat` is >= 70% done
  // and the speaker trailed off the last word of `currentBeat` and began speaking `nextBeat`!)
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
      const nextMatch = matchCandidateBeatStart(
        candidateWords,
        primarySpokenTokens
      );
      if (nextMatch.matchedCount >= 2) {
        return {
          action: 'jumpToNextWithProgress',
          spokenWordCount: Math.min(
            candidateWords.length,
            nextMatch.matchedCount
          ),
          totalSpeakableWords: candidateWords.length,
          targetBeatID: candidate.id,
          lastMatchedWord: nextMatch.lastWord,
        };
      }
    }

    // 3. Check `previousBeat` only if we haven't spoken into `currentBeat` yet
    if (!didAdvanceCurrent && currentSpokenCount === 0 && window.previousBeat) {
      const prevWords = extractSpeakableWords(
        window.previousBeat.kind === 'spokenLine'
          ? window.previousBeat.rawMarkdown
          : window.previousBeat.displayText
      );
      const prevMatch = matchCandidateBeatStart(prevWords, primarySpokenTokens);
      if (prevMatch.matchedCount >= 2) {
        return {
          action: 'stepBackToPrev',
          spokenWordCount: Math.min(prevWords.length, prevMatch.matchedCount),
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
