export type ScriptBlockKind =
  | 'sectionHeading'
  | 'subsectionHeading'
  | 'spokenLine'
  | 'organizerCue'
  | 'conditionalCue'
  | 'timingCue'
  | 'visualCue'
  | 'deliveryCue'
  | 'actionCue'
  | 'checklistTask'
  | 'privateNote'
  | 'metadataItem'
  | 'divider';

export type SectionRole =
  | 'liveFlow'
  | 'backupLines'
  | 'moderatorQuestions'
  | 'organizerChecklist';

export type CueCategoryMeta = {
  kind: ScriptBlockKind;
  badgeLabel: string;
  syntaxExample: string;
  description: string;
};

export type WindowLayoutMode = 'fullLiquidGlass' | 'classicCard';
export type GlassThemeMode = 'light' | 'dark';
export type FontWeightOption = 400 | 500 | 600 | 700;
/** Official Apple Developer macOS 26 Tahoe Glass variants (`Glass.regular`, `Glass.clear`, `Glass.identity`) */
export type AppleGlassVariant = 'regular' | 'clear' | 'identity';
/** Official Apple Developer `.tint(_:)` refractive volume tint presets */
export type AppleGlassTintPreset =
  | 'crystalNeutral'
  | 'tahoeBlue'
  | 'ultraviolet'
  | 'emeraldMist'
  | 'amberGold';

export interface LiquidGlassSettings {
  themeMode: GlassThemeMode;
  windowLayoutMode: WindowLayoutMode;
  glassVariant: AppleGlassVariant;
  glassTintPreset: AppleGlassTintPreset;
  glassInteractive: boolean;
  glassContainerSpacing: number;
  /** 0 - 100: Refractive sheen, liquid curvature highlight & specular dispersion rim */
  liquidness: number;
  /** 0 - 100: See-through transparency of the window & reading viewport */
  transparency: number;
  /** 0 - 100: Optical frost blur radius & vibrancy saturation */
  glassEffectLevel: number;
  /** 400 | 500 | 600 | 700: Base typography weight for spoken beats */
  fontWeight: FontWeightOption;
  /** 18 - 48: Reading font size in px/pt */
  fontSize: number;
  /** 1.2 - 1.85: Line height multiplier */
  lineHeight: number;
  /** 0 - 100: Luminance of the active beat focus ring & card glow */
  activeBeatGlow: number;
  showOrganizerCues: boolean;
  narrowReadingWidth: boolean;
  alwaysOnTop: boolean;
}

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScriptPlaceholder {
  id: string;
  rawToken: string; // e.g., "[Confirmed Speaker's Name]"
  label: string; // e.g., "Confirmed Speaker's Name"
  sectionNumber: number | null;
  sectionTitle: string;
  blockID: string;
  lineNumber: number;
  isDataScienceCritical: boolean;
  isConditional: boolean;
}

export type PlaceholderToken = ScriptPlaceholder;

export interface ScriptBlockAddress {
  sectionNumber: number | null;
  subsectionTitle: string | null;
  beatIndexInSection: number;
  blockFingerprint: string;
}

export interface ScriptBlock {
  id: string;
  kind: ScriptBlockKind;
  rawMarkdown: string;
  displayText: string;
  sectionID: string;
  sectionNumber: number;
  subsectionID?: string;
  subsectionTitle?: string;
  speakerName?: string;
  lineNumber: number;
  placeholders: ScriptPlaceholder[];
  isChecked?: boolean;
  isCheckedByDefault?: boolean;
  address: ScriptBlockAddress;
}

export interface ScriptSubsection {
  id: string;
  title: string;
  shortQALabel?: string;
  parentSectionID: string;
  parentSectionNumber: number;
  blocks: ScriptBlock[];
  firstNavigableBlockID?: string;
}

export interface ScriptSection {
  id: string;
  number: number; // 0..12 or custom
  numberBadge: string; // e.g. "04"
  rawHeading: string; // e.g. "04 — FIRST SESSION: ARTIFICIAL INTELLIGENCE"
  title: string; // e.g. "FIRST SESSION: ARTIFICIAL INTELLIGENCE"
  shortTitle: string; // e.g. "AI · Asindu"
  role: SectionRole;
  isLiveFlow: boolean;
  speakerName?: string;
  blocks: ScriptBlock[];
  subsections: ScriptSubsection[];
  navigableBeats: ScriptBlock[];
  introduceWaypointBlockID?: string;
  thankSpeakerWaypointBlockID?: string;
}

export interface ScriptMetadata {
  title: string;
  subtitle: string;
  fields: Record<string, string>;
}

export interface EmergencySnippet {
  id: string;
  category: 'backup' | 'question';
  groupTitle: string;
  title: string;
  cues: string[];
  spokenLines: string[];
  speakerTag?: string;
  sourceSubsectionID: string;
  placeholders: ScriptPlaceholder[];
}

export type OnDemandSnippet = EmergencySnippet;

export interface ScriptDocument {
  metadata: ScriptMetadata;
  sections: ScriptSection[];
  liveFlowSections: ScriptSection[];
  onDemandSections: ScriptSection[];
  liveFlowBeats: ScriptBlock[];
  allNavigableBeats: ScriptBlock[];
  allBlocksById: Record<string, ScriptBlock>;
  backupLines: EmergencySnippet[];
  moderatorQuestions: EmergencySnippet[];
  checklistBlocks: ScriptBlock[];
  allPlaceholders: ScriptPlaceholder[];
  unresolvedPlaceholders: ScriptPlaceholder[];
}

export type ParsedScriptDocument = ScriptDocument;

export interface SavedModeratorPosition {
  sectionID: string;
  subsectionID?: string;
  beatID: string;
  timestamp: number;
}

export interface ScriptRevision {
  id: string;
  timestamp: string;
  label: string;
  markdown: string;
}
