export type CavemanLevel = 'off' | 'lite' | 'full' | 'ultra' | 'wenyan';

export const CAVEMAN_LEVELS: CavemanLevel[] = ['off', 'lite', 'full', 'ultra', 'wenyan'];

export const PHASE_COMPRESSION_MAP: Record<string, CavemanLevel> = {
  analysis: 'lite',
  planning: 'full',
  implementation: 'ultra',
  testing: 'full',
  verification: 'lite',
};

export type CavemanModeChangeListener = (newLevel: CavemanLevel, oldLevel: CavemanLevel) => void;

export class CavemanModeStore {
  private _level: CavemanLevel = 'off';
  private listeners = new Set<CavemanModeChangeListener>();

  get level(): CavemanLevel {
    return this._level;
  }

  setLevel(level: CavemanLevel): void {
    const old = this._level;
    this._level = level;
    for (const listener of this.listeners) {
      try {
        listener(level, old);
      } catch {
        // individual listener error shouldn't break others
      }
    }
  }

  getEffectiveLevel(phase?: string): CavemanLevel {
    if (this._level !== 'off') return this._level;
    if (phase && phase in PHASE_COMPRESSION_MAP) return PHASE_COMPRESSION_MAP[phase];
    return 'full';
  }

  onChange(listener: CavemanModeChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const globalCavemanMode = new CavemanModeStore();
