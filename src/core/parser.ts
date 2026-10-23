import {
  EmergencySnippet,
  ScriptBlock,
  ScriptBlockKind,
  ScriptDocument,
  ScriptMetadata,
  ScriptPlaceholder,
  ScriptSection,
  ScriptSubsection,
  SectionRole,
} from './types';

const QA_SHORT_LABEL_MAP: Record<string, string> = {
  'WHEN SELECTING A QUESTION': 'Select question',
  "WHEN INVITING ANOTHER SPEAKER'S PERSPECTIVE": 'Another perspective',
  'WHEN INVITING ANOTHER SPEAKER’S PERSPECTIVE': 'Another perspective',
  'IF THE AUDIENCE IS QUIET': 'Audience quiet',
  'IF THERE ARE TOO MANY QUESTIONS': 'Too many questions',
  'ENDING THE Q&A': 'End Q&A',
};

const BREATH_TOKENS = new Set(['[PAUSE]', '[BEAT]', '[BREATHE]']);

function computeShortTitle(sectionNumber: number, title: string, speakerName?: string): string {
  const upper = title.toUpperCase();
  if (sectionNumber === 0 && upper.includes('BEFORE THE SESSION')) return 'Pre-Session';
  if (sectionNumber === 1 && upper.includes('OPENING')) return 'Opening & Welcome';
  if (sectionNumber === 2 && upper.includes('OVERVIEW')) return 'Program Overview';
  if (sectionNumber === 3 && upper.includes('BEFORE WE GET STARTED')) return 'Reminders';
  if (sectionNumber === 4 && upper.includes('ARTIFICIAL INTELLIGENCE')) return 'AI · Asindu';
  if (sectionNumber === 5 && upper.includes('CYBERSECURITY')) return 'Cyber · Sandeep';
  if (sectionNumber === 6 && upper.includes('DATA SCIENCE')) return 'Data Science';
  if (
    sectionNumber === 7 &&
    (upper.includes('STANDARD COMPUTER SCIENCE') || upper.includes('CORE COMPUTER SCIENCE'))
  ) {
    return 'Standard CS · Pansilu';
  }
  if (sectionNumber === 8 && upper.includes('Q&A')) return 'Q&A Session';
  if (sectionNumber === 9 && upper.includes('CLOSING')) return 'Closing Remarks';
  if (sectionNumber === 10 && upper.includes('BACKUP')) return 'Backup Lines';
  if (sectionNumber === 11 && upper.includes('QUESTION')) return 'Mod Questions';
  if (sectionNumber === 12 && upper.includes('CHECKLIST')) return 'Checklist';

  const clean = title
    .replace(/^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH)\s+SESSION:\s*/i, '')
    .trim();
  const shortClean = clean.length > 22 ? `${clean.slice(0, 20)}…` : clean;
  if (speakerName && !speakerName.startsWith('[')) {
    const first = speakerName.split(/\s+/)[0];
    return `${shortClean} · ${first}`;
  }
  return shortClean;
}

function getSectionSpeaker(sectionNumber: number, title: string, bodyLines: string[]): string | undefined {
  const upper = title.toUpperCase();
  if (sectionNumber === 4 && upper.includes('ARTIFICIAL INTELLIGENCE')) return 'Asindu De Silva';
  if (sectionNumber === 5 && upper.includes('CYBERSECURITY')) return 'Sandeep Nilwakka';
  if (sectionNumber === 6 && upper.includes('DATA SCIENCE')) return "[Confirmed Speaker's Full Name]";
  if (
    sectionNumber === 7 &&
    (upper.includes('STANDARD COMPUTER SCIENCE') || upper.includes('CORE COMPUTER SCIENCE'))
  ) {
    return 'Pansilu Jayawardane';
  }

  for (const line of bodyLines) {
    const welcomeMatch = line.match(
      /(?:welcome|introduce|invite|featuring|with)\s+\*\*([^*]+)\*\*/i
    );
    if (welcomeMatch) {
      return welcomeMatch[1].trim();
    }
    const overToMatch = line.match(
      /\*\*(?:Over to you,?\s*)?([A-Z][a-zA-Z\s.'-]+?)(?:,\s*over to you|,\s*the (?:session|floor) is yours|\.)\*\*/i
    );
    if (overToMatch && !overToMatch[1].toLowerCase().startsWith('over to you')) {
      return overToMatch[1].trim();
    }
  }
  return undefined;
}

function getSectionRole(sectionNumber: number, title: string): SectionRole {
  const upper = title.toUpperCase();
  if (sectionNumber === 10 || upper.includes('BACKUP MODERATOR') || upper.includes('EMERGENCY BACKUP')) {
    return 'backupLines';
  }
  if (sectionNumber === 11 || upper.includes('OPTIONAL MODERATOR QUESTION')) {
    return 'moderatorQuestions';
  }
  if (sectionNumber === 12 || upper.includes('PRIVATE ORGANIZER CHECKLIST')) {
    return 'organizerChecklist';
  }
  return 'liveFlow';
}

export function classifyCueKind(innerCueText: string): ScriptBlockKind {
  const trimmed = innerCueText.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith('timing:') ||
    lower.startsWith('time:') ||
    lower.startsWith('pacing:') ||
    lower.startsWith('duration:')
  ) {
    return 'timingCue';
  }
  if (
    lower.startsWith('slide:') ||
    lower.startsWith('visual:') ||
    lower.startsWith('screen:') ||
    lower.startsWith('camera:') ||
    lower.startsWith('video:')
  ) {
    return 'visualCue';
  }
  if (
    lower.startsWith('tone:') ||
    lower.startsWith('delivery:') ||
    lower.startsWith('voice:') ||
    lower.startsWith('energy:') ||
    lower.startsWith('posture:')
  ) {
    return 'deliveryCue';
  }
  if (
    lower.startsWith('action:') ||
    lower.startsWith('stage:') ||
    lower.startsWith('handoff:') ||
    lower.startsWith('allow the presentation')
  ) {
    return 'actionCue';
  }
  if (
    lower.startsWith('if ') ||
    lower.startsWith('optional') ||
    lower.startsWith('branch:') ||
    lower.includes('if necessary, say') ||
    lower.includes('if confirmed')
  ) {
    return 'conditionalCue';
  }
  return 'organizerCue';
}

function extractPlaceholdersFromText(
  text: string,
  sectionNumber: number,
  sectionTitle: string,
  blockID: string,
  lineNumber: number,
  isChecklistLine: boolean,
  isCueLine: boolean,
  kind: ScriptBlockKind
): ScriptPlaceholder[] {
  if (isChecklistLine) return [];

  let scanText = text;
  if (isCueLine && scanText.startsWith('*[') && scanText.endsWith(']*')) {
    scanText = scanText.slice(2, -2);
  }

  const tokens: ScriptPlaceholder[] = [];
  const regex = /\[([^\[\]]+)\]/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(scanText)) !== null) {
    const inner = match[1].trim();
    if (!inner || inner === 'x' || inner === 'X') continue;

    const fullToken = `[${inner}]`;
    if (BREATH_TOKENS.has(fullToken.toUpperCase())) {
      continue;
    }

    const lower = inner.toLowerCase();
    const isDataScienceCritical =
      sectionNumber === 6 ||
      lower.includes('confirmed speaker') ||
      lower.includes("speaker's full name") ||
      lower.includes("speaker's first name") ||
      (sectionNumber === 2 && lower.includes('speaker'));

    tokens.push({
      id: `${blockID}-ph-${idx++}`,
      rawToken: fullToken,
      label: inner,
      sectionNumber,
      sectionTitle,
      blockID,
      lineNumber,
      isDataScienceCritical,
      isConditional: kind === 'conditionalCue' || isCueLine,
    });
  }

  // Also check if this is Section 6's unconfirmed bio cue or Section 11's Data Science — Confirmed Speaker heading
  if (
    sectionNumber === 6 &&
    isCueLine &&
    scanText.toLowerCase().includes('verified academic background')
  ) {
    tokens.push({
      id: `${blockID}-ph-bio`,
      rawToken: '[Insert Data Science Speaker Bio]',
      label: 'Insert one or two sentences about the speaker’s verified academic background',
      sectionNumber,
      sectionTitle,
      blockID,
      lineNumber,
      isDataScienceCritical: true,
      isConditional: false,
    });
  }

  if (
    sectionNumber === 11 &&
    kind === 'subsectionHeading' &&
    scanText.toLowerCase().includes('data science') &&
    scanText.toLowerCase().includes('confirmed speaker')
  ) {
    tokens.push({
      id: `${blockID}-ph-sec11-ds`,
      rawToken: 'Data Science — Confirmed Speaker',
      label: 'Data Science — Confirmed Speaker',
      sectionNumber,
      sectionTitle,
      blockID,
      lineNumber,
      isDataScienceCritical: true,
      isConditional: false,
    });
  }

  return tokens;
}

export function parseMarkdownScript(markdown: string): ScriptDocument {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const metadata: ScriptMetadata = {
    title: 'CUEGLASS STUDIO',
    subtitle: 'Master Moderator Script',
    fields: {},
  };

  const sections: ScriptSection[] = [];
  const allBlocksById: Record<string, ScriptBlock> = {};
  const allPlaceholders: ScriptPlaceholder[] = [];
  const checklistBlocks: ScriptBlock[] = [];

  let currentSection: ScriptSection | null = null;
  let currentSubsection: ScriptSubsection | null = null;
  let customSectionCounter = 0;
  let blockCounter = 0;

  const ensureFallbackSection = () => {
    if (!currentSection) {
      const secNum = customSectionCounter++;
      const badge = String(secNum).padStart(2, '0');
      const secId = `sec-${badge}`;
      currentSection = {
        id: secId,
        number: secNum,
        numberBadge: badge,
        rawHeading: '00 — SCRIPT',
        title: 'SCRIPT',
        shortTitle: 'Script',
        role: 'liveFlow',
        isLiveFlow: true,
        blocks: [],
        subsections: [],
        navigableBeats: [],
      };
      sections.push(currentSection);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) continue;

    // Top-level Metadata before first ## section
    if (!currentSection) {
      if (trimmed.startsWith('# ')) {
        metadata.title = trimmed.replace(/^#\s+/, '').trim();
        continue;
      }
      if (trimmed.startsWith('## ') && !/^##\s+\d+\s*[—–-]/.test(trimmed)) {
        const hasNumberedSectionsLater = lines
          .slice(i + 1)
          .some((l) => /^##\s+\d+\s*[—–-]/.test(l.trim()));
        if (hasNumberedSectionsLater && Object.keys(metadata.fields).length === 0 && i < 6) {
          metadata.subtitle = trimmed.replace(/^##\s+/, '').trim();
          continue;
        }
      }
      const metaMatch = trimmed.match(/^\*\*([^*]+):\*\*\s*(.+)$/);
      if (metaMatch) {
        metadata.fields[metaMatch[1].trim()] = metaMatch[2].trim();
        continue;
      }
      if (trimmed === '---') {
        continue;
      }
    }

    if (
      trimmed === '---' ||
      trimmed === '**END OF MODERATOR SCRIPT**' ||
      trimmed === '**END OF MASTER MODERATOR SCRIPT**'
    ) {
      continue;
    }

    // Main section heading: ## 00 — TITLE or ## Custom Title
    if (trimmed.startsWith('## ')) {
      const rawHeading = trimmed.replace(/^##\s+/, '').trim();
      const numberedMatch = rawHeading.match(/^(\d+)\s*[—–-]\s*(.+)$/);

      let secNum: number;
      let secTitle: string;
      if (numberedMatch) {
        secNum = parseInt(numberedMatch[1], 10);
        secTitle = numberedMatch[2].trim();
        customSectionCounter = Math.max(customSectionCounter, secNum + 1);
      } else {
        secNum = customSectionCounter++;
        secTitle = rawHeading;
      }

      const sectionBodyPreview: string[] = [];
      for (let k = i + 1; k < Math.min(lines.length, i + 25); k++) {
        if (lines[k].trim().startsWith('## ')) break;
        if (lines[k].trim()) sectionBodyPreview.push(lines[k].trim());
      }

      const badge = String(secNum).padStart(2, '0');
      const secId = `sec-${badge}-${sections.length}`;
      const canonicalId = sections.some((s) => s.id === `sec-${badge}`)
        ? secId
        : `sec-${badge}`;

      const role = getSectionRole(secNum, secTitle);
      const speakerName = getSectionSpeaker(secNum, secTitle, sectionBodyPreview);

      currentSection = {
        id: canonicalId,
        number: secNum,
        numberBadge: badge,
        rawHeading,
        title: secTitle,
        shortTitle: computeShortTitle(secNum, secTitle, speakerName),
        role,
        isLiveFlow: role === 'liveFlow',
        speakerName,
        blocks: [],
        subsections: [],
        navigableBeats: [],
      };
      currentSubsection = null;
      sections.push(currentSection);
      continue;
    }

    // Subsection heading: ### TITLE
    if (trimmed.startsWith('### ')) {
      ensureFallbackSection();
      const subTitle = trimmed.replace(/^###\s+/, '').trim();
      const subId = `${currentSection!.id}-sub-${currentSection!.subsections.length + 1}`;
      const blockId = `blk-${++blockCounter}`;
      const beatIdx = currentSection!.navigableBeats.length;

      const placeholders = extractPlaceholdersFromText(
        subTitle,
        currentSection!.number,
        currentSection!.title,
        blockId,
        lineNum,
        false,
        false,
        'subsectionHeading'
      );
      allPlaceholders.push(...placeholders);

      const subHeadingBlock: ScriptBlock = {
        id: blockId,
        kind: 'subsectionHeading',
        rawMarkdown: rawLine,
        displayText: subTitle,
        sectionID: currentSection!.id,
        sectionNumber: currentSection!.number,
        subsectionID: subId,
        subsectionTitle: subTitle,
        speakerName: currentSection!.speakerName,
        lineNumber: lineNum,
        placeholders,
        address: {
          sectionNumber: currentSection!.number,
          subsectionTitle: subTitle,
          beatIndexInSection: beatIdx,
          blockFingerprint: `${currentSection!.number}:${subTitle}:${beatIdx}`,
        },
      };

      const shortQA =
        QA_SHORT_LABEL_MAP[subTitle.toUpperCase()] ||
        (currentSection!.number === 8 ? subTitle : undefined);

      currentSubsection = {
        id: subId,
        title: subTitle,
        shortQALabel: shortQA,
        parentSectionID: currentSection!.id,
        parentSectionNumber: currentSection!.number,
        blocks: [subHeadingBlock],
        firstNavigableBlockID: blockId,
      };

      currentSection!.subsections.push(currentSubsection);
      currentSection!.blocks.push(subHeadingBlock);
      currentSection!.navigableBeats.push(subHeadingBlock);
      allBlocksById[blockId] = subHeadingBlock;

      if (
        subTitle.toUpperCase().startsWith('THANKING ') ||
        subTitle.toUpperCase().startsWith('THANK YOU')
      ) {
        currentSection!.thankSpeakerWaypointBlockID = blockId;
      }
      continue;
    }

    ensureFallbackSection();
    const blockId = `blk-${++blockCounter}`;
    const beatIdx = currentSection!.navigableBeats.length;

    // Checklist item: - [ ] or - [x]
    const checklistMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.+)$/);
    if (checklistMatch) {
      const isChecked = checklistMatch[1].toLowerCase() === 'x';
      const taskText = checklistMatch[2].trim();
      const block: ScriptBlock = {
        id: blockId,
        kind: 'checklistTask',
        rawMarkdown: rawLine,
        displayText: taskText,
        sectionID: currentSection!.id,
        sectionNumber: currentSection!.number,
        subsectionID: currentSubsection?.id,
        subsectionTitle: currentSubsection?.title,
        lineNumber: lineNum,
        placeholders: [],
        isChecked,
        isCheckedByDefault: isChecked,
        address: {
          sectionNumber: currentSection!.number,
          subsectionTitle: currentSubsection?.title ?? null,
          beatIndexInSection: beatIdx,
          blockFingerprint: `${currentSection!.number}:chk:${taskText.slice(0, 24)}`,
        },
      };
      currentSection!.blocks.push(block);
      if (currentSubsection) currentSubsection.blocks.push(block);
      allBlocksById[blockId] = block;
      checklistBlocks.push(block);
      continue;
    }

    // Section 12 private header or group label
    if (currentSection!.role === 'organizerChecklist') {
      const isItalicPrivate =
        trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.startsWith('*[');
      const isBoldCategory = trimmed.startsWith('**') && trimmed.endsWith('**');
      const cleanText = trimmed.replace(/^\*\*|\*\*$/g, '').replace(/^\*|\*$/g, '').trim();
      const block: ScriptBlock = {
        id: blockId,
        kind: isItalicPrivate || isBoldCategory ? 'privateNote' : 'spokenLine',
        rawMarkdown: rawLine,
        displayText: cleanText,
        sectionID: currentSection!.id,
        sectionNumber: currentSection!.number,
        subsectionID: currentSubsection?.id,
        subsectionTitle: currentSubsection?.title,
        lineNumber: lineNum,
        placeholders: [],
        address: {
          sectionNumber: currentSection!.number,
          subsectionTitle: currentSubsection?.title ?? null,
          beatIndexInSection: beatIdx,
          blockFingerprint: `${currentSection!.number}:note:${cleanText.slice(0, 24)}`,
        },
      };
      currentSection!.blocks.push(block);
      allBlocksById[blockId] = block;
      continue;
    }

    // Categorized Cue card: *[...]*
    const isBracketedCue = trimmed.startsWith('*[') && trimmed.endsWith(']*');
    let kind: ScriptBlockKind = 'spokenLine';
    let displayText = trimmed;

    if (isBracketedCue) {
      const inner = trimmed.slice(2, -2).trim();
      displayText = inner;
      kind = classifyCueKind(inner);
    }

    const placeholders = extractPlaceholdersFromText(
      trimmed,
      currentSection!.number,
      currentSection!.title,
      blockId,
      lineNum,
      false,
      isBracketedCue,
      kind
    );
    allPlaceholders.push(...placeholders);

    const block: ScriptBlock = {
      id: blockId,
      kind,
      rawMarkdown: rawLine,
      displayText,
      sectionID: currentSection!.id,
      sectionNumber: currentSection!.number,
      subsectionID: currentSubsection?.id,
      subsectionTitle: currentSubsection?.title,
      speakerName: currentSection!.speakerName,
      lineNumber: lineNum,
      placeholders,
      address: {
        sectionNumber: currentSection!.number,
        subsectionTitle: currentSubsection?.title ?? null,
        beatIndexInSection: beatIdx,
        blockFingerprint: `${currentSection!.number}:${currentSubsection?.title ?? 'main'}:${beatIdx}`,
      },
    };

    currentSection!.blocks.push(block);
    currentSection!.navigableBeats.push(block);
    if (!currentSection!.introduceWaypointBlockID && kind === 'spokenLine') {
      currentSection!.introduceWaypointBlockID = block.id;
    }
    if (currentSubsection) {
      currentSubsection.blocks.push(block);
      if (!currentSubsection.firstNavigableBlockID) {
        currentSubsection.firstNavigableBlockID = block.id;
      }
    }
    allBlocksById[blockId] = block;
  }

  const liveFlowSections = sections.filter((s) => s.isLiveFlow);
  const onDemandSections = sections.filter((s) => !s.isLiveFlow);
  const liveFlowBeats = liveFlowSections.flatMap((s) => s.navigableBeats);

  // Build Section 10 Backup Lines snippets
  const backupLines: EmergencySnippet[] = [];
  const sec10 = sections.find((s) => s.role === 'backupLines');
  if (sec10) {
    for (const sub of sec10.subsections) {
      const cues = sub.blocks
        .filter((b) => b.kind !== 'subsectionHeading' && b.kind !== 'spokenLine')
        .map((b) => b.displayText);
      const spoken = sub.blocks
        .filter((b) => b.kind === 'spokenLine')
        .map((b) => b.displayText.replace(/^"|"$/g, ''));
      const phs = sub.blocks.flatMap((b) => b.placeholders);
      backupLines.push({
        id: `backup-${sub.id}`,
        category: 'backup',
        groupTitle: sub.title,
        title: sub.title,
        cues,
        spokenLines: spoken,
        sourceSubsectionID: sub.id,
        placeholders: phs,
      });
    }
  }

  // Build Section 11 Optional Moderator Questions snippets
  const moderatorQuestions: EmergencySnippet[] = [];
  const sec11 = sections.find((s) => s.role === 'moderatorQuestions');
  if (sec11) {
    for (const sub of sec11.subsections) {
      const contentBlocks = sub.blocks.filter((b) => b.kind !== 'subsectionHeading');
      let currentQLabel = '';
      let qIndex = 0;

      for (let idx = 0; idx < contentBlocks.length; idx++) {
        const b = contentBlocks[idx];
        const qMatch = b.displayText.match(/^\*\*Question\s*(\d+):\*\*$/i);
        if (qMatch) {
          currentQLabel = `Question ${qMatch[1]}`;
          continue;
        }
        if (b.kind === 'spokenLine') {
          qIndex++;
          const nextBlock = contentBlocks[idx + 1];
          const cues: string[] = [];
          if (
            nextBlock &&
            nextBlock.kind !== 'spokenLine' &&
            nextBlock.kind !== 'subsectionHeading'
          ) {
            cues.push(nextBlock.displayText);
          }
          moderatorQuestions.push({
            id: `modq-${sub.id}-${qIndex}`,
            category: 'question',
            groupTitle: sub.title,
            title: currentQLabel ? `${sub.title} · ${currentQLabel}` : sub.title,
            cues,
            spokenLines: [b.displayText.replace(/^"|"$/g, '')],
            speakerTag: sub.title,
            sourceSubsectionID: sub.id,
            placeholders: b.placeholders,
          });
          currentQLabel = '';
        }
      }
    }
  }

  return {
    metadata,
    sections,
    liveFlowSections,
    onDemandSections,
    liveFlowBeats,
    allNavigableBeats: liveFlowBeats,
    allBlocksById,
    backupLines,
    moderatorQuestions,
    checklistBlocks,
    allPlaceholders,
    unresolvedPlaceholders: allPlaceholders,
  };
}
