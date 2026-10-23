import { EmergencySnippet, ScriptBlock, ScriptDocument, ScriptSection } from './types';

export interface NavigationState {
  activeBeatID: string;
  lastLiveBeatID: string;
  activeOnDemandSnippet: EmergencySnippet | null;
  lastNavigationHint: string | null;
}

export function createInitialNavState(
  doc: ScriptDocument,
  savedBeatID?: string | null
): NavigationState {
  const validSaved =
    savedBeatID && doc.liveFlowBeats.some((b) => b.id === savedBeatID)
      ? savedBeatID
      : doc.liveFlowBeats[0]?.id ?? '';
  return {
    activeBeatID: validSaved,
    lastLiveBeatID: validSaved,
    activeOnDemandSnippet: null,
    lastNavigationHint: null,
  };
}

export function getActiveSection(
  doc: ScriptDocument,
  state: NavigationState
): ScriptSection | undefined {
  return (
    doc.sections.find((sec) => sec.blocks.some((b) => b.id === state.activeBeatID)) ??
    doc.liveFlowSections[0]
  );
}

export function getActiveBlock(
  doc: ScriptDocument,
  state: NavigationState
): ScriptBlock | undefined {
  for (const sec of doc.sections) {
    const found = sec.blocks.find((b) => b.id === state.activeBeatID);
    if (found) return found;
  }
  return undefined;
}

export function getBeatPositionInSection(
  doc: ScriptDocument,
  state: NavigationState
): { index: number; total: number } {
  const sec = getActiveSection(doc, state);
  if (!sec) return { index: 1, total: 1 };
  const idx = sec.navigableBeats.findIndex((b) => b.id === state.activeBeatID);
  return {
    index: idx >= 0 ? idx + 1 : 1,
    total: Math.max(1, sec.navigableBeats.length),
  };
}

export function getPendingThankSpeakerWaypoint(
  doc: ScriptDocument,
  state: NavigationState
): { speakerName: string; targetBlockID: string; sectionShortTitle: string } | null {
  if (state.activeOnDemandSnippet) return null;
  const sec = getActiveSection(doc, state);
  if (!sec || !sec.thankSpeakerWaypointBlockID || !sec.speakerName) return null;

  const currentIdx = sec.navigableBeats.findIndex((b) => b.id === state.activeBeatID);
  const thankIdx = sec.navigableBeats.findIndex(
    (b) => b.id === sec.thankSpeakerWaypointBlockID
  );
  if (currentIdx >= 0 && thankIdx >= 0 && currentIdx < thankIdx) {
    return {
      speakerName: sec.speakerName,
      targetBlockID: sec.thankSpeakerWaypointBlockID,
      sectionShortTitle: sec.shortTitle,
    };
  }
  return null;
}

export function selectBeatById(
  doc: ScriptDocument,
  state: NavigationState,
  beatID: string
): NavigationState {
  const sec = doc.sections.find((s) => s.blocks.some((b) => b.id === beatID));
  if (!sec) return state;

  const isLive = sec.role === 'liveFlow';
  const beatIdx = sec.navigableBeats.findIndex((b) => b.id === beatID);
  const hint = `${sec.numberBadge} ${sec.shortTitle} · Beat ${Math.max(1, beatIdx + 1)}/${sec.navigableBeats.length}`;

  return {
    activeBeatID: beatID,
    lastLiveBeatID: isLive ? beatID : state.lastLiveBeatID,
    activeOnDemandSnippet: null,
    lastNavigationHint: hint,
  };
}

export function stepNextBeat(
  doc: ScriptDocument,
  state: NavigationState
): NavigationState {
  if (state.activeOnDemandSnippet) {
    return returnToLiveBeat(doc, state);
  }
  const beats = doc.liveFlowBeats;
  if (beats.length === 0) return state;
  const idx = beats.findIndex((b) => b.id === state.activeBeatID);
  if (idx >= 0 && idx + 1 < beats.length) {
    return selectBeatById(doc, state, beats[idx + 1].id);
  }
  return state;
}

export function stepPrevBeat(
  doc: ScriptDocument,
  state: NavigationState
): NavigationState {
  if (state.activeOnDemandSnippet) {
    return returnToLiveBeat(doc, state);
  }
  const beats = doc.liveFlowBeats;
  if (beats.length === 0) return state;
  const idx = beats.findIndex((b) => b.id === state.activeBeatID);
  if (idx > 0) {
    return selectBeatById(doc, state, beats[idx - 1].id);
  }
  return state;
}

export function stepNextSection(
  doc: ScriptDocument,
  state: NavigationState
): NavigationState {
  const liveSecs = doc.liveFlowSections;
  const currentSec = getActiveSection(doc, state);
  if (!currentSec || liveSecs.length === 0) return state;
  const secIdx = liveSecs.findIndex((s) => s.id === currentSec.id);
  const nextIdx = Math.min(secIdx + 1, liveSecs.length - 1);
  const firstBeat = liveSecs[nextIdx]?.navigableBeats[0];
  if (!firstBeat) return state;
  return selectBeatById(doc, state, firstBeat.id);
}

export function stepPrevSection(
  doc: ScriptDocument,
  state: NavigationState
): NavigationState {
  const liveSecs = doc.liveFlowSections;
  const currentSec = getActiveSection(doc, state);
  if (!currentSec || liveSecs.length === 0) return state;

  const pos = getBeatPositionInSection(doc, state);
  if (pos.index > 1 && currentSec.navigableBeats[0]) {
    return selectBeatById(doc, state, currentSec.navigableBeats[0].id);
  }

  const secIdx = liveSecs.findIndex((s) => s.id === currentSec.id);
  const prevIdx = Math.max(secIdx - 1, 0);
  const firstBeat = liveSecs[prevIdx]?.navigableBeats[0];
  if (!firstBeat) return state;
  return selectBeatById(doc, state, firstBeat.id);
}

export function jumpToSectionById(
  doc: ScriptDocument,
  state: NavigationState,
  sectionID: string
): NavigationState {
  const sec = doc.sections.find((s) => s.id === sectionID);
  const firstBeat = sec?.navigableBeats[0];
  if (!firstBeat) return state;
  return selectBeatById(doc, state, firstBeat.id);
}

export function jumpToThanksWaypoint(
  doc: ScriptDocument,
  state: NavigationState
): NavigationState {
  const waypoint = getPendingThankSpeakerWaypoint(doc, state);
  if (!waypoint) return state;
  return selectBeatById(doc, state, waypoint.targetBlockID);
}

export function invokeSnippet(
  doc: ScriptDocument,
  state: NavigationState,
  snippet: EmergencySnippet
): NavigationState {
  const currentSec = getActiveSection(doc, state);
  const savedLive =
    currentSec?.role === 'liveFlow' ? state.activeBeatID : state.lastLiveBeatID;
  return {
    ...state,
    lastLiveBeatID: savedLive,
    activeOnDemandSnippet: snippet,
    lastNavigationHint: `On-Demand · ${snippet.title}`,
  };
}

export function returnToLiveBeat(
  doc: ScriptDocument,
  state: NavigationState
): NavigationState {
  const targetID = doc.liveFlowBeats.some((b) => b.id === state.lastLiveBeatID)
    ? state.lastLiveBeatID
    : doc.liveFlowBeats[0]?.id ?? state.activeBeatID;
  const sec = doc.sections.find((s) => s.blocks.some((b) => b.id === targetID));
  return {
    activeBeatID: targetID,
    lastLiveBeatID: targetID,
    activeOnDemandSnippet: null,
    lastNavigationHint: sec
      ? `Returned to ${sec.numberBadge} ${sec.shortTitle}`
      : 'Returned to live script',
  };
}

export function remapNavStateAfterEdit(
  prevDoc: ScriptDocument,
  nextDoc: ScriptDocument,
  state: NavigationState
): NavigationState {
  if (nextDoc.liveFlowBeats.some((b) => b.id === state.activeBeatID)) {
    return state;
  }
  const prevBlock = getActiveBlock(prevDoc, state);
  if (prevBlock) {
    const byFingerprint = nextDoc.liveFlowBeats.find(
      (b) => b.address.blockFingerprint === prevBlock.address.blockFingerprint
    );
    if (byFingerprint) {
      return {
        ...state,
        activeBeatID: byFingerprint.id,
        lastLiveBeatID: byFingerprint.id,
      };
    }
    const sameSec = nextDoc.sections.find((s) => s.id === prevBlock.sectionID);
    if (sameSec && sameSec.navigableBeats[0]) {
      return {
        ...state,
        activeBeatID: sameSec.navigableBeats[0].id,
        lastLiveBeatID: sameSec.navigableBeats[0].id,
      };
    }
  }
  const fallbackID = nextDoc.liveFlowBeats[0]?.id ?? '';
  return {
    ...state,
    activeBeatID: fallbackID,
    lastLiveBeatID: fallbackID,
  };
}
