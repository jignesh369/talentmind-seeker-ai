
export interface TimeBudget {
  total: number;
  perSource: number;
  perCandidate: number;
  aiOperation: number;
  remaining: number;
  startTime: number;
}

export interface ProgressUpdate {
  phase: string;
  completedSources: number;
  totalSources: number;
  candidatesFound: number;
  timeElapsed: number;
  timeRemaining: number;
}

export class TimeBudgetManager {
  private budget: TimeBudget;
  private callbacks: ((update: ProgressUpdate) => void)[] = [];

  constructor(totalTimeSeconds: number = 90) {
    this.budget = {
      total: totalTimeSeconds * 1000,
      perSource: Math.floor((totalTimeSeconds * 1000) / 6), // ~15 seconds per source
      perCandidate: 3000, // 3 seconds per candidate enhancement
      aiOperation: 5000, // 5 seconds per AI operation
      remaining: totalTimeSeconds * 1000,
      startTime: Date.now()
    };
  }

  onProgress(callback: (update: ProgressUpdate) => void) {
    this.callbacks.push(callback);
  }

  updateProgress(phase: string, completedSources: number, totalSources: number, candidatesFound: number) {
    const timeElapsed = Date.now() - this.budget.startTime;
    const timeRemaining = Math.max(0, this.budget.total - timeElapsed);
    
    this.budget.remaining = timeRemaining;

    const update: ProgressUpdate = {
      phase,
      completedSources,
      totalSources,
      candidatesFound,
      timeElapsed,
      timeRemaining
    };

    this.callbacks.forEach(callback => callback(update));
  }

  hasTimeRemaining(): boolean {
    return this.budget.remaining > 1000; // At least 1 second remaining
  }

  getTimeForSource(): number {
    return Math.min(this.budget.perSource, this.budget.remaining);
  }

  getTimeForCandidate(): number {
    return Math.min(this.budget.perCandidate, this.budget.remaining);
  }

  getTimeForAI(): number {
    return Math.min(this.budget.aiOperation, this.budget.remaining);
  }

  shouldContinueCollection(candidatesFound: number): boolean {
    // Early return conditions
    if (!this.hasTimeRemaining()) return false;
    if (candidatesFound >= 20) return false; // Good enough for most searches
    
    return true;
  }

  createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
    });
  }

  async withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T | null> {
    try {
      return await Promise.race([
        operation,
        this.createTimeoutPromise<T>(timeoutMs)
      ]);
    } catch (error) {
      console.log(`Operation timed out after ${timeoutMs}ms:`, error.message);
      return null;
    }
  }
}
