export type BudgetStatus = 'ok' | 'warn' | 'compress' | 'panic';

export class ContextBudget {
  private _usedTokens = 0;
  readonly totalAllowed: number;

  constructor(totalAllowed = 128_000) {
    this.totalAllowed = totalAllowed;
  }

  get usedTokens(): number {
    return this._usedTokens;
  }

  get remaining(): number {
    return this.totalAllowed - this._usedTokens;
  }

  get ratio(): number {
    return this._usedTokens / this.totalAllowed;
  }

  get status(): BudgetStatus {
    const r = this.ratio;
    if (r >= 0.95) return 'panic';
    if (r >= 0.85) return 'compress';
    if (r >= 0.7) return 'warn';
    return 'ok';
  }

  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  addTokens(count: number): BudgetStatus {
    this._usedTokens += count;
    return this.status;
  }

  reset(): void {
    this._usedTokens = 0;
  }
}

export const globalContextBudget = new ContextBudget();
