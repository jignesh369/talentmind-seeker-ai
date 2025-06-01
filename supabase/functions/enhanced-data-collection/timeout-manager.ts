
export class TimeoutManager {
  private timeBudget: number;
  private startTime: number;
  private sourcePerformance: Map<string, { success: number; total: number; avgTime: number }> = new Map();

  constructor(timeBudgetSeconds: number) {
    // Clamp time budget between reasonable bounds
    this.timeBudget = Math.max(30, Math.min(120, timeBudgetSeconds)) * 1000; // Convert to milliseconds
    this.startTime = Date.now();
    this.initializeSourcePerformance();
  }

  private initializeSourcePerformance() {
    const sources = ['github', 'stackoverflow', 'linkedin', 'google', 'devto', 'kaggle'];
    sources.forEach(source => {
      this.sourcePerformance.set(source, { success: 0, total: 0, avgTime: 15000 }); // Default 15s
    });
  }

  getOptimalSourceOrder(sources: string[]): string[] {
    return sources.sort((a, b) => {
      const perfA = this.sourcePerformance.get(a) || { success: 0, total: 1, avgTime: 20000 };
      const perfB = this.sourcePerformance.get(b) || { success: 0, total: 1, avgTime: 20000 };
      
      // Enhanced scoring: success rate (50%) + speed bonus (30%) + reliability (20%)
      const successRateA = perfA.success / Math.max(perfA.total, 1);
      const successRateB = perfB.success / Math.max(perfB.total, 1);
      
      const speedBonusA = (25000 - Math.min(perfA.avgTime, 25000)) / 25000;
      const speedBonusB = (25000 - Math.min(perfB.avgTime, 25000)) / 25000;
      
      const reliabilityA = Math.min(perfA.total / 10, 1); // More attempts = more reliable data
      const reliabilityB = Math.min(perfB.total / 10, 1);
      
      const scoreA = (successRateA * 50) + (speedBonusA * 30) + (reliabilityA * 20);
      const scoreB = (successRateB * 50) + (speedBonusB * 30) + (reliabilityB * 20);
      
      return scoreB - scoreA; // Higher score first
    });
  }

  getSourceTimeout(source: string): number {
    const remaining = this.getRemainingBudget();
    const remainingSeconds = remaining / 1000;
    
    // Base timeout: 25% of remaining time, with reasonable bounds
    let baseTimeout = Math.max(8000, Math.min(25000, remaining * 0.25));
    
    // Adjust based on historical performance
    const perf = this.sourcePerformance.get(source);
    if (perf && perf.avgTime > 0 && perf.total > 0) {
      // Use 1.5x average time with bounds checking
      const adaptiveTimeout = Math.max(8000, Math.min(25000, perf.avgTime * 1.5));
      baseTimeout = Math.min(baseTimeout, adaptiveTimeout);
    }
    
    // Ensure we don't use more than 80% of remaining time for a single source
    const maxAllowedTimeout = Math.min(baseTimeout, remaining * 0.8);
    
    // Final bounds: 8-25 seconds
    const finalTimeout = Math.max(8000, Math.min(25000, maxAllowedTimeout));
    
    console.log(`⏱️ ${source} timeout: ${Math.round(finalTimeout/1000)}s (remaining: ${Math.round(remainingSeconds)}s)`);
    return finalTimeout;
  }

  getRemainingBudget(fromTime?: number): number {
    const elapsed = Date.now() - (fromTime || this.startTime);
    return Math.max(0, this.timeBudget - elapsed);
  }

  updateSourcePerformance(source: string, success: boolean, timeMs: number) {
    const current = this.sourcePerformance.get(source) || { success: 0, total: 0, avgTime: 0 };
    
    current.total++;
    if (success) current.success++;
    
    // Update average time with weighted moving average
    if (current.avgTime === 0) {
      current.avgTime = timeMs;
    } else {
      // Weight recent performance more heavily
      const weight = Math.min(0.3, 1 / current.total); // Decreasing weight as we get more data
      current.avgTime = (current.avgTime * (1 - weight)) + (timeMs * weight);
    }
    
    this.sourcePerformance.set(source, current);
    
    console.log(`📊 ${source} performance: ${current.success}/${current.total} success, avg: ${Math.round(current.avgTime)}ms`);
  }

  shouldUseProgressiveEnhancement(elapsedTime: number): boolean {
    const remainingTime = this.timeBudget - elapsedTime;
    const progressPercentage = elapsedTime / this.timeBudget;
    
    // Progressive enhancement when:
    // 1. Less than 20% time remaining, OR
    // 2. More than 80% time elapsed, OR  
    // 3. Less than 15 seconds remaining
    return remainingTime < (this.timeBudget * 0.2) || 
           progressPercentage > 0.8 || 
           remainingTime < 15000;
  }

  createTimeoutPromise<T>(timeoutMs: number, errorMessage: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });
  }

  isNearTimeout(): boolean {
    const remaining = this.getRemainingBudget();
    const remainingPercentage = remaining / this.timeBudget;
    return remainingPercentage < 0.15 || remaining < 12000; // Less than 15% or 12 seconds
  }

  getPerformanceReport(): any {
    const report: any = {};
    this.sourcePerformance.forEach((perf, source) => {
      report[source] = {
        success_rate: perf.total > 0 ? Math.round((perf.success / perf.total) * 100) : 0,
        avg_time_ms: Math.round(perf.avgTime),
        total_attempts: perf.total,
        reliability_score: Math.min(perf.total / 5, 1) // 0-1 based on number of attempts
      };
    });
    return report;
  }

  getTimebudgetStatus(): { remaining: number; used: number; percentage: number } {
    const elapsed = Date.now() - this.startTime;
    const remaining = this.getRemainingBudget();
    const percentage = Math.round((elapsed / this.timeBudget) * 100);
    
    return {
      remaining: Math.round(remaining / 1000),
      used: Math.round(elapsed / 1000),
      percentage
    };
  }
}
