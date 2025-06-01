
export class TimeoutManager {
  private timeBudget: number;
  private startTime: number;
  private sourcePerformance: Map<string, { success: number; total: number; avgTime: number }> = new Map();

  constructor(timeBudgetSeconds: number) {
    this.timeBudget = timeBudgetSeconds * 1000; // Convert to milliseconds
    this.startTime = Date.now();
    this.initializeSourcePerformance();
  }

  private initializeSourcePerformance() {
    const sources = ['github', 'stackoverflow', 'linkedin', 'google', 'devto', 'kaggle'];
    sources.forEach(source => {
      this.sourcePerformance.set(source, { success: 0, total: 0, avgTime: 10000 }); // Default 10s
    });
  }

  getOptimalSourceOrder(sources: string[]): string[] {
    return sources.sort((a, b) => {
      const perfA = this.sourcePerformance.get(a) || { success: 0, total: 1, avgTime: 15000 };
      const perfB = this.sourcePerformance.get(b) || { success: 0, total: 1, avgTime: 15000 };
      
      const scoreA = (perfA.success / Math.max(perfA.total, 1)) * 100 - (perfA.avgTime / 1000);
      const scoreB = (perfB.success / Math.max(perfB.total, 1)) * 100 - (perfB.avgTime / 1000);
      
      return scoreB - scoreA; // Higher score first
    });
  }

  getSourceTimeout(source: string): number {
    const remaining = this.getRemainingBudget();
    const baseTimeout = Math.min(25000, remaining * 0.4); // 40% of remaining time, max 25s
    
    const perf = this.sourcePerformance.get(source);
    if (perf && perf.avgTime > 0) {
      return Math.min(baseTimeout, perf.avgTime * 1.5); // 1.5x average time
    }
    
    return baseTimeout;
  }

  getRemainingBudget(fromTime?: number): number {
    const elapsed = Date.now() - (fromTime || this.startTime);
    return Math.max(0, this.timeBudget - elapsed);
  }

  updateSourcePerformance(source: string, success: boolean, timeMs: number) {
    const current = this.sourcePerformance.get(source) || { success: 0, total: 0, avgTime: 0 };
    
    current.total++;
    if (success) current.success++;
    
    // Update average time with exponential moving average
    if (current.avgTime === 0) {
      current.avgTime = timeMs;
    } else {
      current.avgTime = (current.avgTime * 0.7) + (timeMs * 0.3);
    }
    
    this.sourcePerformance.set(source, current);
  }

  shouldUseProgressiveEnhancement(elapsedTime: number): boolean {
    const remainingTime = this.timeBudget - elapsedTime;
    return remainingTime < (this.timeBudget * 0.4); // Less than 40% time remaining
  }

  createTimeoutPromise<T>(timeoutMs: number, errorMessage: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });
  }

  isNearTimeout(): boolean {
    const remaining = this.getRemainingBudget();
    return remaining < 10000; // Less than 10 seconds remaining
  }

  getPerformanceReport(): any {
    const report: any = {};
    this.sourcePerformance.forEach((perf, source) => {
      report[source] = {
        success_rate: perf.total > 0 ? Math.round((perf.success / perf.total) * 100) : 0,
        avg_time_ms: Math.round(perf.avgTime),
        total_attempts: perf.total
      };
    });
    return report;
  }
}
