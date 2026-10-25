import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_PATHFINDER_26_MD,
  UNIVERSAL_AI_MASTER_PROMPT,
  UNIVERSAL_GUIDELINE_SCRIPT_MD,
} from './canonicalScript';
import { classifyCueKind, parseMarkdownScript } from './parser';
import {
  createInitialNavState,
  getActiveBlock,
  getActiveSection,
  getPendingThankSpeakerWaypoint,
  invokeSnippet,
  jumpToSectionById,
  jumpToThanksWaypoint,
  remapNavStateAfterEdit,
  returnToLiveBeat,
  stepNextBeat,
  stepNextSection,
  stepPrevBeat,
  stepPrevSection,
} from './navigation';
import { InMemoryOrLocalScriptStore } from './store';
import {
  clampWindowFrame,
  computeNearCameraBubbleFrame,
  computeNearCameraFrame,
} from './geometry';
import {
  computeBeatWordProgress,
  evaluateThreeBeatWindow,
  extractSpeakableWords,
  getThreeBeatWindow,
} from './voiceTracker';
import { selectBeatById } from './navigation';
import {
  CANONICAL_PATHFINDER_26_MD as _unused,
} from './canonicalScript';

test('MarkdownScriptParserTests: parses Universal Guideline Script with all 6 cue categories, inline breath markers, and AI Prompt Blueprint', () => {
  const doc = parseMarkdownScript(UNIVERSAL_GUIDELINE_SCRIPT_MD);

  assert.equal(doc.metadata.title, 'CUEGLASS STUDIO — MASTER SCRIPT & AI BLUEPRINT');
  assert.equal(doc.sections.length, 13);
  assert.equal(doc.liveFlowSections.length, 10);
  assert.equal(doc.onDemandSections.length, 3);

  // Verify specialized cue categories exist in the parsed Universal Guideline Script
  const allKinds = new Set(doc.allNavigableBeats.map((b) => b.kind));
  assert.ok(allKinds.has('timingCue'), 'Expected timingCue blocks');
  assert.ok(allKinds.has('visualCue'), 'Expected visualCue blocks');
  assert.ok(allKinds.has('deliveryCue'), 'Expected deliveryCue blocks');
  assert.ok(allKinds.has('actionCue'), 'Expected actionCue blocks');
  assert.ok(allKinds.has('organizerCue'), 'Expected organizerCue blocks');
  assert.ok(allKinds.has('conditionalCue'), 'Expected conditionalCue blocks');

  // Ensure [PAUSE] and [BEAT] are NOT treated as unresolved placeholders
  const pausePlaceholders = doc.allPlaceholders.filter(
    (p) => p.rawToken === '[PAUSE]' || p.rawToken === '[BEAT]'
  );
  assert.equal(pausePlaceholders.length, 0);

  // Verify Universal AI Master Prompt contains formatting instructions and examples
  assert.ok(UNIVERSAL_AI_MASTER_PROMPT.includes('CueGlass Studio'));
  assert.ok(UNIVERSAL_AI_MASTER_PROMPT.includes('*[Timing:'));
  assert.ok(UNIVERSAL_AI_MASTER_PROMPT.includes('### THANKING THE FIRST SPEAKER'));
});

test('CueClassifierTests: accurately classifies all 6 stage and production cue types', () => {
  assert.equal(classifyCueKind('Timing: 2 minutes target'), 'timingCue');
  assert.equal(classifyCueKind('Slide: Advance to Agenda Deck'), 'visualCue');
  assert.equal(classifyCueKind('Tone: Warm and authoritative'), 'deliveryCue');
  assert.equal(classifyCueKind('Action: Pause 2 seconds for applause'), 'actionCue');
  assert.equal(classifyCueKind('If recording is active, announce this'), 'conditionalCue');
  assert.equal(classifyCueKind('Organizer Cue: Check chat window'), 'organizerCue');
});

test('MarkdownScriptParserTests: parses canonical Pathfinder 26 sections 00–12, speaker names, THANKING waypoints, and Q&A shortcuts without dropping prose', () => {
  const doc = parseMarkdownScript(CANONICAL_PATHFINDER_26_MD);

  assert.equal(doc.metadata.title, 'PATHFINDER ’26');
  assert.equal(doc.metadata.fields['Host'], 'Atheesha Anarga');
  assert.equal(doc.metadata.fields['Date'], 'Saturday, 24 October 2026');
  assert.equal(doc.metadata.fields['Starting Time'], '7:00 PM');

  // Verify 13 sections: 00–09 live flow + 10–12 on-demand
  assert.equal(doc.sections.length, 13);
  assert.equal(doc.liveFlowSections.length, 10);
  assert.equal(doc.onDemandSections.length, 3);

  for (let i = 0; i <= 12; i++) {
    assert.equal(doc.sections[i].number, i);
  }

  // Verify all four speaker sessions have THANKING waypoints
  const sec04 = doc.sections[4];
  assert.equal(sec04.speakerName, 'Asindu De Silva');
  assert.ok(sec04.thankSpeakerWaypointBlockID);
  assert.ok(sec04.subsections.some((s) => s.title === 'THANKING THE FIRST SPEAKER'));

  const sec05 = doc.sections[5];
  assert.equal(sec05.speakerName, 'Sandeep Nilwakka');
  assert.ok(sec05.thankSpeakerWaypointBlockID);
  assert.ok(sec05.subsections.some((s) => s.title === 'THANKING THE SECOND SPEAKER'));

  const sec06 = doc.sections[6];
  assert.ok(sec06.thankSpeakerWaypointBlockID);
  assert.ok(sec06.subsections.some((s) => s.title === 'THANKING THE THIRD SPEAKER'));

  const sec07 = doc.sections[7];
  assert.equal(sec07.speakerName, 'Pansilu Jayawardane');
  assert.ok(sec07.thankSpeakerWaypointBlockID);
  assert.ok(sec07.subsections.some((s) => s.title === 'THANKING THE FOURTH SPEAKER'));

  // Verify Q&A subsections in 08
  const sec08 = doc.sections[8];
  assert.equal(sec08.subsections.length, 5);
  assert.deepEqual(
    sec08.subsections.map((s) => s.shortQALabel),
    [
      'Select question',
      'Another perspective',
      'Audience quiet',
      'Too many questions',
      'End Q&A',
    ]
  );

  // Verify Section 10 Backup Lines & Section 11 Moderator Questions
  assert.equal(doc.backupLines.length, 12);
  assert.equal(doc.moderatorQuestions.length, 9);
});

test('MarkdownScriptParserTests: handles custom unnumbered Markdown and dynamic speaker extraction gracefully', () => {
  const custom = `# Custom Event\n## Keynote Session\nIt's my pleasure to welcome **Dr. Maya Lin**.\n*[Timing: 10 mins]*`;
  const doc = parseMarkdownScript(custom);
  assert.equal(doc.sections.length, 1);
  assert.equal(doc.sections[0].speakerName, 'Dr. Maya Lin');
  assert.equal(doc.sections[0].navigableBeats.length, 2);
});

test('NavigationTests: single-arrow beat/section transitions, speaker thank-you jump, and context-preserving on-demand return', () => {
  const doc = parseMarkdownScript(CANONICAL_PATHFINDER_26_MD);
  let state = createInitialNavState(doc);

  assert.equal(getActiveSection(doc, state)?.number, 0);
  const firstBeat = state.activeBeatID;

  state = stepNextBeat(doc, state);
  assert.notEqual(state.activeBeatID, firstBeat);

  state = stepPrevBeat(doc, state);
  assert.equal(state.activeBeatID, firstBeat);

  // Next main section -> 01
  state = stepNextSection(doc, state);
  assert.equal(getActiveSection(doc, state)?.number, 1);

  // Jump to section 04 (Asindu) and verify thank-you waypoint
  state = jumpToSectionById(doc, state, 'sec-04');
  assert.equal(getActiveSection(doc, state)?.number, 4);
  const waypoint = getPendingThankSpeakerWaypoint(doc, state);
  assert.ok(waypoint);
  assert.equal(waypoint.speakerName, 'Asindu De Silva');

  state = jumpToThanksWaypoint(doc, state);
  assert.equal(getActiveBlock(doc, state)?.displayText, 'THANKING THE FIRST SPEAKER');
  assert.equal(getPendingThankSpeakerWaypoint(doc, state), null);

  // Invoke emergency backup line from Section 10 and return to exact live position
  const liveBeatBeforeBackup = state.activeBeatID;
  const mutedLine = doc.backupLines.find((b) => b.title.includes('microphone is muted'))!;
  state = invokeSnippet(doc, state, mutedLine);
  assert.equal(state.activeOnDemandSnippet?.id, mutedLine.id);

  state = returnToLiveBeat(doc, state);
  assert.equal(state.activeOnDemandSnippet, null);
  assert.equal(state.activeBeatID, liveBeatBeforeBackup);

  // Remap after script edit preserves position
  const editedDoc = parseMarkdownScript(
    CANONICAL_PATHFINDER_26_MD.replace('Good evening, everyone!', 'Warm greetings, everyone!')
  );
  const remapped = remapNavStateAfterEdit(doc, editedDoc, state);
  assert.equal(getActiveBlock(editedDoc, remapped)?.displayText, 'THANKING THE FIRST SPEAKER');
});

test('PlaceholderTests: detects unresolved Data Science speaker placeholders in 02, 06, 11 and excludes Section 12 task checkboxes', () => {
  const doc = parseMarkdownScript(CANONICAL_PATHFINDER_26_MD);

  // Section 12 has 18 `- [ ]` task items, none of which should be parsed as placeholders
  assert.equal(doc.checklistBlocks.length, 18);
  const sec12Placeholders = doc.allPlaceholders.filter((p) => p.sectionNumber === 12);
  assert.equal(sec12Placeholders.length, 0);

  // Unresolved Data Science placeholders in 02, 06, 11 must be flagged critical
  const dsPlaceholders = doc.allPlaceholders.filter((p) => p.isDataScienceCritical);
  assert.ok(dsPlaceholders.length >= 5);
  assert.ok(dsPlaceholders.some((p) => p.sectionNumber === 2));
  assert.ok(dsPlaceholders.some((p) => p.sectionNumber === 6));
  assert.ok(dsPlaceholders.some((p) => p.sectionNumber === 11));
});

test('ScriptStoreTests: maintains 5 rolling versions, defaults to Universal Master Script, and recovers LastKnownGood after corrupted write', () => {
  const store = new InMemoryOrLocalScriptStore(null);
  const initSnap = store.loadOrInitialize();
  assert.equal(initSnap.recoveredFromBackup, false);
  assert.ok(initSnap.workingMarkdown.includes('CUEGLASS STUDIO'));

  for (let i = 1; i <= 7; i++) {
    store.saveWorkingCopy(`# Script Edit ${i}\n\nBeat ${i}`, `Revision ${i}`);
  }

  const revs = store.loadRevisions();
  assert.equal(revs.length, 5);
  assert.equal(revs[0].label, 'Revision 7');

  // Simulate corrupted working copy and verify recovery from LastKnownGood
  store.simulateCorruptedWorkingWrite();
  const recovered = store.loadOrInitialize();
  assert.equal(recovered.recoveredFromBackup, true);
  assert.ok(recovered.workingMarkdown.includes('# Script Edit 7'));
});

test('WindowGeometryTests: places near-camera panel centered below notch and clamps disconnected monitor coordinates', () => {
  const macbook15Visible: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 38,
    width: 1710,
    height: 1030,
  };
  const nearCam = computeNearCameraFrame(macbook15Visible);
  assert.equal(nearCam.width, 560);
  assert.equal(nearCam.height, 340);
  assert.equal(nearCam.x, Math.round((1710 - 560) / 2));
  assert.equal(nearCam.y, 38 + 16);

  const bubble = computeNearCameraBubbleFrame(macbook15Visible);
  assert.equal(bubble.width, 46);
  assert.equal(bubble.height, 46);

  // Off-screen external monitor coordinate re-clamps safely inside visible area
  const offscreen = { x: 2900, y: 1500, width: 560, height: 340 };
  const clamped = clampWindowFrame(offscreen, macbook15Visible, false);
  assert.ok(clamped.x >= macbook15Visible.x);
  assert.ok(clamped.y >= macbook15Visible.y);
  assert.ok(clamped.x + clamped.width <= macbook15Visible.x + macbook15Visible.width);
  assert.ok(clamped.y + clamped.height <= macbook15Visible.y + macbook15Visible.height);
});

test('VoiceTrackerTests: progressively darkens spoken words in currentBeat, auto-advances on line completion, and switches via 3-beat sliding window', () => {
  const sampleScript = `# Live Voice Test
## 01 — Opening
Good evening everyone, **[PAUSE]** and ==welcome to CueGlass Studio==!

*[Timing: 1 minute target]*

Today we explore **Liquid Glass** optical design and hands-free voice tracking.

Let us begin with our first keynote speaker.`;

  const doc = parseMarkdownScript(sampleScript);
  let nav = createInitialNavState(doc);

  // Beat 1: "Good evening everyone, **[PAUSE]** and ==welcome to CueGlass Studio==!"
  // Speakable words exclude [PAUSE]: ['good', 'evening', 'everyone', 'and', 'welcome', 'to', 'cueglass', 'studio']
  const beat1 = getActiveBlock(doc, nav)!;
  const words1 = extractSpeakableWords(beat1.rawMarkdown);
  assert.deepEqual(words1, [
    'good',
    'evening',
    'everyone',
    'and',
    'welcome',
    'to',
    'cueglass',
    'studio',
  ]);

  const win1 = getThreeBeatWindow(doc, nav.activeBeatID);
  assert.equal(win1.previousBeat, null);
  assert.equal(win1.currentBeat?.id, beat1.id);
  // Next beat is the timingCue, while nextSpokenBeat skips the cue card to the next spoken dialogue beat!
  assert.equal(win1.nextBeat?.kind, 'timingCue');
  assert.equal(win1.nextSpokenBeat?.kind, 'spokenLine');

  // Speak first 3 words -> darkens 3 words in currentBeat, stays on currentBeat
  const step1 = evaluateThreeBeatWindow(win1, 'Good evening everyone', 0);
  assert.equal(step1.action, 'stay');
  assert.equal(step1.spokenWordCount, 3);

  // Speak rest of line -> completes currentBeat and automatically advances to nextSpokenBeat with 0 stored memory
  const step2 = evaluateThreeBeatWindow(
    win1,
    'and welcome to CueGlass Studio',
    step1.spokenWordCount
  );
  assert.equal(step2.action, 'advanceToNext');
  assert.equal(step2.targetBeatID, win1.nextSpokenBeat?.id);
  assert.equal(step2.spokenWordCount, 0);

  // Move to nextSpokenBeat ("Today we explore **Liquid Glass** optical design and hands-free voice tracking.")
  nav = selectBeatById(doc, nav, step2.targetBeatID!);
  const win2 = getThreeBeatWindow(doc, nav.activeBeatID);

  // Suppose the user skips finishing beat 2 and starts speaking beat 3 ("Let us begin with our...")
  const jumpDecision = evaluateThreeBeatWindow(
    win2,
    'Let us begin with',
    2
  );
  assert.equal(jumpDecision.action, 'jumpToNextWithProgress');
  assert.equal(jumpDecision.targetBeatID, win2.nextBeat?.id);
  assert.equal(jumpDecision.spokenWordCount, 4);

  // Verify lookahead tolerance when a short filler word is skipped by dictation
  const partialProgress = computeBeatWordProgress(
    ['today', 'we', 'explore', 'liquid', 'glass', 'optical', 'design'],
    ['today', 'explore', 'liquid', 'glass'],
    0
  );
  assert.equal(partialProgress.spokenWordCount, 5);
  assert.equal(partialProgress.isLineComplete, false);
});

test('VoiceTrackerTests: recovers effortlessly from bad pronunciation, phonetic transcription drift, garbled proper nouns, compound splits, and N-best alternatives without jumping ahead on stopwords', () => {
  const targetLine = extractSpeakableWords(
    'Welcome everyone to Pathfinder cybersecurity with Atheesha Anarga and our technical keynote panel.'
  );
  // ['welcome', 'everyone', 'to', 'pathfinder', 'cybersecurity', 'with', 'atheesha', 'anarga', 'and', 'our', 'technical', 'keynote', 'panel']

  // 1. Phonetic match on bad pronunciation ("welkum evryone") + compound split ("path finder") + ("cyber security")
  const step1 = computeBeatWordProgress(
    targetLine,
    ['welkum', 'evryone', 'to', 'path', 'finder', 'cyber', 'security'],
    0
  );
  // Should advance through 'cybersecurity' (5 words: welcome, everyone, to, pathfinder, cybersecurity)
  assert.equal(step1.spokenWordCount, 5);
  assert.equal(step1.lastMatchedWord, 'cybersecurity');

  // 2. Difficult proper noun mispronounced / garbled by Siri Dictation ("with uhhm anarga and our teknikal")
  // Here "atheesha" is completely garbled as "uhhm", followed by "anarga" in order -> bridges over "atheesha" seamlessly!
  const step2 = computeBeatWordProgress(
    targetLine,
    ['with', 'uhhm', 'anarga', 'and', 'our', 'teknikal'],
    step1.spokenWordCount
  );
  assert.equal(step2.spokenWordCount, 11);
  assert.equal(step2.lastMatchedWord, 'technical');

  // 3. Anti-runaway stopword guard: speaking a lone filler/stopword like "to" or "and" must NEVER jump ahead
  const stopwordLine = extractSpeakableWords(
    'First we welcome our guests and then we move to the main hall.'
  );
  const afterFirst = computeBeatWordProgress(stopwordLine, ['first', 'we'], 0);
  assert.equal(afterFirst.spokenWordCount, 2);

  // Saying "the" or "to" while at word 2 ("welcome") must NOT jump to "to" or "the" at the end of the line
  const runawayCheck = computeBeatWordProgress(
    stopwordLine,
    ['the'],
    afterFirst.spokenWordCount
  );
  assert.equal(runawayCheck.spokenWordCount, 2);

  // 4. N-best SpeechRecognition alternatives: if primary transcript is noisy ("he note panel")
  // while alternative[0] has "keynote panel", evaluateThreeBeatWindow picks the better alternative and completes the line!
  const doc = parseMarkdownScript(`# Voice Test\n## 01 — Intro\nWelcome everyone to Pathfinder cybersecurity with Atheesha Anarga and our technical keynote panel.\n\nThank you for joining us tonight.`);
  const nav = createInitialNavState(doc);
  const win = getThreeBeatWindow(doc, nav.activeBeatID);

  const finalDecision = evaluateThreeBeatWindow(
    win,
    'zzzrando blorp',
    step2.spokenWordCount,
    ['keynote panel']
  );
  assert.equal(finalDecision.action, 'advanceToNext');
  assert.equal(finalDecision.targetBeatID, win.nextBeat?.id);
});

test('VoiceTrackerTests: switches to next paragraph automatically when spoken from the middle (even with 0 words spoken in current line), while blocking false jumps on same-looking paragraphs in the selected section', () => {
  const scriptWithDistinctAndSimilarBeats = `# Mid-Paragraph Jump & Ambiguity Test
## 01 — Speaker Transitions
Thank you Dr. Perera for sharing those deep technical insights with our audience tonight.

Thank you Dr. Silva for sharing those deep technical insights with our community and exploring quantum cryptography.

In our third segment we will open the floor for interactive live demonstrations.`;

  const doc = parseMarkdownScript(scriptWithDistinctAndSimilarBeats);
  let nav = createInitialNavState(doc);
  const win1 = getThreeBeatWindow(doc, nav.activeBeatID);

  // Beat 1 (current): "Thank you Dr. Perera for sharing those deep technical insights with our audience tonight."
  // Beat 2 (next):    "Thank you Dr. Silva for sharing those deep technical insights with our community and exploring quantum cryptography."
  // Both Beat 1 and Beat 2 are in the same section and look very similar, sharing "for sharing those deep technical insights".

  // 1. Ambiguity Guard: If the user hasn't spoken Beat 1 yet (spokenWordCount = 0) and starts reading from the middle
  // using the SHARED phrase "sharing those deep technical insights", it must NOT jump prematurely to Beat 2!
  // Instead, it stays on Beat 1 and tracks up to "insights" in Beat 1.
  const sharedPhraseDecision = evaluateThreeBeatWindow(
    win1,
    'sharing those deep technical insights',
    0
  );
  assert.equal(sharedPhraseDecision.action, 'stay');
  assert.equal(sharedPhraseDecision.targetBeatID, null);
  assert.equal(sharedPhraseDecision.spokenWordCount, 10);

  // 2. Direct Mid-Paragraph Jump (with 0 words spoken in Beat 1):
  // Now suppose the user is at the start of Beat 1 (spokenWordCount = 0) and skips directly to the middle of Beat 2,
  // speaking a distinctive phrase from the middle of Beat 2 ("with our community and exploring" or "exploring quantum cryptography")
  // without speaking Beat 1 or the first words of Beat 2!
  const midNextDecision = evaluateThreeBeatWindow(
    win1,
    'with our community and exploring',
    0
  );
  assert.equal(midNextDecision.action, 'jumpToNextWithProgress');
  assert.equal(midNextDecision.targetBeatID, win1.nextBeat?.id);
  // "Thank(1) you(2) Dr(3) Silva(4) for(5) sharing(6) those(7) deep(8) technical(9) insights(10) with(11) our(12) community(13) and(14) exploring(15)"
  assert.equal(midNextDecision.spokenWordCount, 15);

  // 3. Also test 2-word distinctive mid-paragraph jump into Beat 3 ("interactive live demonstrations") without speaking Beat 2:
  nav = selectBeatById(doc, nav, win1.nextBeat!.id);
  const win2 = getThreeBeatWindow(doc, nav.activeBeatID);
  const midBeat3Decision = evaluateThreeBeatWindow(
    win2,
    'interactive live',
    0
  );
  assert.equal(midBeat3Decision.action, 'jumpToNextWithProgress');
  assert.equal(midBeat3Decision.targetBeatID, win2.nextBeat?.id);
});



