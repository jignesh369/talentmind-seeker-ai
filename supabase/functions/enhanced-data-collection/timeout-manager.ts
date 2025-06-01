
export interface TimeoutConfig {
  sourceTimeout: number;
  totalTimeout: number;
  retryTimeout: number;
  progressiveTimeout: number;
}

export interface SourcePriority {
  source: string;
  priority: number;
  estimatedTime: number;
  successRate: number;
  lastSuccess: number;
}

export class TimeoutManager {
  private config: TimeoutConfig;
  private sourcePriorities: Map<string, SourcePriority>;

  constructor(timeBudget: number = 60) {
    this.config = {
      sourceTimeout: Math.min(30000, timeBudget * 800), // 80% of time budget, max 30s
      totalTimeout: timeBudget * 1000,
      retryTimeout: 5000,
      progressiveTimeout: timeBudget * 600 // 60% for progressive enhancement
    };

    // Initialize source priorities based on historical performance
    this.sourcePriorities = new Map([
      ['github', { source: 'github', priority: 1, estimatedTime: 8000, successRate: 0.95, lastSuccess: Date.now() }],
      ['linkedin', { source: 'linkedin', priority: 2, estimatedTime: 3000, successRate: 0.90, lastSuccess: Date.now() }],
      ['stackoverflow', { source: 'stackoverflow', priority: 3, estimatedTime: 2000, successRate: 0.85, lastSuccess: Date.now() }],
      ['google', { source: 'google', priority: 4, estimatedTime: 12000, successRate: 0.70, lastSuccess: Date.now() }],
      ['kaggle', { source: 'kaggle', priority: 5, estimatedTime: 4000, successRate: 0.80, lastSuccess: Date.now() }],
      ['devto', { source: 'devto', priority: 6, estimatedTime: 3000, successRate: 0.75, lastSuccess: Date.now() }]
    ]);
  }

  getSourceTimeout(source: string): number {
    const priority = this.sourcePriorities.get(source);
    if (!priority) return this.config.sourceTimeout;

    // Adjust timeout based on priority and success rate
    const baseTimeout = this.config.sourceTimeout;
    const priorityMultiplier = 1 + (0.2 * (6 - priority.priority)); // Higher priority gets more time
    const successMultiplier = 0.8 + (0.4 * priority.successRate); // Higher success rate gets more time

    return Math.min(baseTimeout * priorityMultiplier * successMultiplier, 35000);
  }

  getOptimalSourceOrder(requestedSources: string[]): string[] {
    return requestedSources
      .filter(source => this.sourcePriorities.has(source))
      .sort((a, b) => {
        const priorityA = this.sourcePriorities.get(a)!;
        const priorityB = this.sourcePriorities.get(b)!;
        
        // Calculate composite score: priority + success rate + recency
        const scoreA = (6 - priorityA.priority) + (priorityA.successRate * 2) + 
                      (Date.now() - priorityA.lastSuccess < 300000 ? 1 : 0);
        const scoreB = (6 - priorityB.priority) + (priorityB.successRate * 2) + 
                      (Date.now() - priorityB.lastSuccess < 300000 ? 1 : 0);
        
        return scoreB - scoreA;
      });
  }

  updateSourcePerformance(source: string, success: boolean, duration: number) {
    const priority = this.sourcePriorities.get(source);
    if (!priority) return;

    // Update success rate with exponential moving average
    const alpha = 0.3;
    priority.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * priority.successRate;
    
    // Update estimated time
    if (success) {
      priority.estimatedTime = alpha * duration + (1 - alpha) * priority.estimatedTime;
      priority.lastSuccess = Date.now();
    }

    this.sourcePriorities.set(source, priority);
  }

  shouldUseProgressiveEnhancement(elapsedTime: number): boolean {
    return elapsedTime > this.config.progressiveTimeout;
  }

  getRemainingBudget(startTime: number): number {
    return Math.max(0, this.config.totalTimeout - (Date.now() - startTime));
  }

  createTimeoutPromise<T>(ms: number, errorMessage: string = 'Operation timeout'): Promise<T> {
    return new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), ms);
    });
  }
}
