import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { compressToCaveman } from '@kontex/caveman-compress';
import Database from 'better-sqlite3';

export interface Observation {
  sessionId: string;
  phase: string;
  toolName: string;
  originalLen: number;
  compressedLen: number;
  ratio: number;
  compressedText: string;
  createdAt?: string;
}

export interface SessionRecord {
  sessionId: string;
  projectPath: string;
  mode: string;
  startedAt: string;
  endedAt: string | null;
  totalTokens: number | null;
  totalSaved: number | null;
}

export class CavememStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    mkdirSync(dir, { recursive: true });
    this.db = new Database(dbPath);
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sessionId TEXT NOT NULL,
        phase TEXT NOT NULL,
        toolName TEXT NOT NULL,
        originalLen INTEGER NOT NULL,
        compressedLen INTEGER NOT NULL,
        ratio REAL NOT NULL,
        compressedText TEXT NOT NULL,
        createdAt TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sessions (
        sessionId TEXT PRIMARY KEY,
        projectPath TEXT,
        mode TEXT,
        startedAt TEXT NOT NULL,
        endedAt TEXT,
        totalTokens INTEGER,
        totalSaved INTEGER
      );
    `);
  }

  storeObservation(sessionId: string, phase: string, toolName: string, originalText: string): Observation {
    const result = compressToCaveman(originalText, 'full');

    this.db
      .prepare(
        `INSERT INTO observations (sessionId, phase, toolName, originalLen, compressedLen, ratio, compressedText)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(sessionId, phase, toolName, result.originalLen, result.compressedLen, result.ratio, result.compressed);

    return {
      sessionId,
      phase,
      toolName,
      originalLen: result.originalLen,
      compressedLen: result.compressedLen,
      ratio: result.ratio,
      compressedText: result.compressed,
    };
  }

  storeSession(session: SessionRecord): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO sessions (sessionId, projectPath, mode, startedAt, endedAt, totalTokens, totalSaved)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        session.sessionId,
        session.projectPath,
        session.mode,
        session.startedAt,
        session.endedAt,
        session.totalTokens,
        session.totalSaved,
      );
  }

  recall(limit = 20): Observation[] {
    return this.db.prepare('SELECT * FROM observations ORDER BY createdAt DESC LIMIT ?').all(limit) as Observation[];
  }

  getSessionHistory(limit = 10): SessionRecord[] {
    return this.db.prepare('SELECT * FROM sessions ORDER BY startedAt DESC LIMIT ?').all(limit) as SessionRecord[];
  }

  sessionTotalSaved(sessionId: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(SUM(originalLen - compressedLen), 0) AS total FROM observations WHERE sessionId = ?')
      .get(sessionId) as { total: number };
    return row.total;
  }

  close(): void {
    this.db.close();
  }
}

let store: CavememStore | null = null;

export function getCavememStore(): CavememStore | null {
  return store;
}

export async function initCavememIntegration(dbPath?: string): Promise<void> {
  const resolvedPath = path.resolve(process.cwd(), dbPath || '.kontex/cavemem.db');
  store = new CavememStore(resolvedPath);
}
