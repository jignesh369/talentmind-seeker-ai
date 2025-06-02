export class MonitoringService {
  private searchMetrics = new Map<string, any>();
  private performanceData: any[] = [];

  trackSearchStart(searchId: string, request: any): void {
    this.searchMetrics.set(searchId, {
      id: searchId,
      request,
      startTime: Date.now(),
      status: 'in_progress'
    });
  }

  trackSearchComplete(searchId: string, result: any): void {
    const metrics = this.searchMetrics.get(searchId);
    if (metrics) {
      metrics.status = 'completed';
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.candidatesFound = result.candidates.length;
      metrics.sourcesUsed = result.metadata.sourcesUsed;
      
      this.performanceData.push(metrics);
      
      // Keep only last 100 searches in memory
      if (this.performanceData.length > 100) {
        this.performanceData.shift();
      }
    }
  }

  trackSearchError(searchId: string, error: any): void {
    const metrics = this.searchMetrics.get(searchId);
    if (metrics) {
      metrics.status = 'failed';
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.error = error.message;
      
      this.performanceData.push(metrics);
    }
  }

  getPerformanceMetrics(): any {
    const completedSearches = this.performanceData.filter(m => m.status === 'completed');
    const failedSearches = this.performanceData.filter(m => m.status === 'failed');
    
    return {
      totalSearches: this.performanceData.length,
      successRate: completedSearches.length / Math.max(this.performanceData.length, 1),
      averageDuration: completedSearches.reduce((sum, m) => sum + m.duration, 0) / Math.max(completedSearches.length, 1),
      averageCandidatesFound: completedSearches.reduce((sum, m) => sum + m.candidatesFound, 0) / Math.max(completedSearches.length, 1),
      errorCount: failedSearches.length,
      recentSearches: this.performanceData.slice(-10)
    };
  }
}
