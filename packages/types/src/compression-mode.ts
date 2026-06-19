export type CompressionLevel = 'off' | 'lite' | 'full' | 'ultra' | 'wenyan';

export const COMPRESSION_LEVELS: CompressionLevel[] = ['off', 'lite', 'full', 'ultra', 'wenyan'];

export const PHASE_COMPRESSION_MAP: Record<string, CompressionLevel> = {
  analysis: 'lite',
  planning: 'full',
  implementation: 'ultra',
  testing: 'full',
  verification: 'lite',
};

export type CompressionModeChangeListener = (newLevel: CompressionLevel, oldLevel: CompressionLevel) => void;

export class CompressionModeStore {
  private _level: CompressionLevel = 'off';
  private listeners = new Set<CompressionModeChangeListener>();

  get level(): CompressionLevel {
    return this._level;
  }

  setLevel(level: CompressionLevel): void {
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

  getEffectiveLevel(phase?: string): CompressionLevel {
    if (this._level !== 'off') return this._level;
    if (phase && phase in PHASE_COMPRESSION_MAP) return PHASE_COMPRESSION_MAP[phase];
    return 'full';
  }

  onChange(listener: CompressionModeChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const globalCompressionMode = new CompressionModeStore();
