import { CANONICAL_PATHFINDER_26_MD, UNIVERSAL_GUIDELINE_SCRIPT_MD } from './canonicalScript';
import { ScriptRevision } from './types';

export const MAX_ROLLING_VERSIONS = 5;

export interface ScriptStoreSnapshot {
  workingMarkdown: string;
  lastKnownGoodMarkdown: string;
  revisions: ScriptRevision[];
  recoveredFromBackup: boolean;
}

export class InMemoryOrLocalScriptStore {
  private storage: Storage | null;
  private mem: Record<string, string> = {};
  private defaultSeedMarkdown: string;

  private static KEYS = {
    working: 'cg.workingScript.v2',
    lastGood: 'cg.lastKnownGood.v2',
    revisions: 'cg.revisions.v2',
  };

  constructor(storage?: Storage | null, defaultSeedMarkdown = UNIVERSAL_GUIDELINE_SCRIPT_MD) {
    this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    this.defaultSeedMarkdown = defaultSeedMarkdown;
  }

  private getItem(key: string): string | null {
    if (this.storage) {
      try {
        return this.storage.getItem(key);
      } catch {
        return this.mem[key] ?? null;
      }
    }
    return this.mem[key] ?? null;
  }

  private setItem(key: string, value: string): void {
    this.mem[key] = value;
    if (this.storage) {
      try {
        this.storage.setItem(key, value);
      } catch {
        // Fallback to in-memory
      }
    }
  }

  public loadOrInitialize(): ScriptStoreSnapshot {
    const rawWorking = this.getItem(InMemoryOrLocalScriptStore.KEYS.working);
    const rawLastGood = this.getItem(InMemoryOrLocalScriptStore.KEYS.lastGood);
    const revisions = this.loadRevisions();

    if (rawWorking !== null) {
      if (rawWorking.trim().length > 0) {
        return {
          workingMarkdown: rawWorking,
          lastKnownGoodMarkdown: rawLastGood || rawWorking,
          revisions,
          recoveredFromBackup: false,
        };
      }
      // Corrupted / empty working script -> recover from LastKnownGood
      if (rawLastGood && rawLastGood.trim().length > 0) {
        this.setItem(InMemoryOrLocalScriptStore.KEYS.working, rawLastGood);
        return {
          workingMarkdown: rawLastGood,
          lastKnownGoodMarkdown: rawLastGood,
          revisions,
          recoveredFromBackup: true,
        };
      }
    }

    // Initialize from canonical universal guideline script
    const saved = this.saveWorkingCopy(
      this.defaultSeedMarkdown,
      'Universal Master Script & AI Blueprint'
    );
    return {
      workingMarkdown: saved.workingMarkdown,
      lastKnownGoodMarkdown: saved.lastKnownGoodMarkdown,
      revisions: saved.revisions,
      recoveredFromBackup: false,
    };
  }

  public saveWorkingCopy(markdown: string, label = 'Autosave'): ScriptStoreSnapshot {
    if (!markdown.trim()) {
      throw new Error('Cannot overwrite working script with empty content.');
    }
    this.setItem(InMemoryOrLocalScriptStore.KEYS.working, markdown);
    this.setItem(InMemoryOrLocalScriptStore.KEYS.lastGood, markdown);

    const existing = this.loadRevisions();
    const newRev: ScriptRevision = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      label,
      markdown,
    };
    const updated = [newRev, ...existing].slice(0, MAX_ROLLING_VERSIONS);
    this.setItem(InMemoryOrLocalScriptStore.KEYS.revisions, JSON.stringify(updated));

    return {
      workingMarkdown: markdown,
      lastKnownGoodMarkdown: markdown,
      revisions: updated,
      recoveredFromBackup: false,
    };
  }

  public restoreBundledOriginal(): ScriptStoreSnapshot {
    return this.saveWorkingCopy(
      UNIVERSAL_GUIDELINE_SCRIPT_MD,
      'Restored Universal Master Guideline Script'
    );
  }

  public loadPathfinder26Template(): ScriptStoreSnapshot {
    return this.saveWorkingCopy(CANONICAL_PATHFINDER_26_MD, 'Loaded Pathfinder ’26 Event Script');
  }

  public simulateCorruptedWorkingWrite(): void {
    this.setItem(InMemoryOrLocalScriptStore.KEYS.working, '   ');
  }

  public loadRevisions(): ScriptRevision[] {
    const raw = this.getItem(InMemoryOrLocalScriptStore.KEYS.revisions);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, MAX_ROLLING_VERSIONS) : [];
    } catch {
      return [];
    }
  }
}
