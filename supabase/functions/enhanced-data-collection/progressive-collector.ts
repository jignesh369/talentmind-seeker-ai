
export interface ProgressiveResult {
  candidates: any[];
  sources: string[];
  isPartial: boolean;
  completionRate: number;
  nextRecommendedSources: string[];
}

export class ProgressiveCollector {
  private collectedCandidates: Map<string, any> = new Map();
  private completedSources: Set<string> = new Set();
  private failedSources: Set<string> = new Set();
  private sourceResults: Map<string, any> = new Map();

  addSourceResult(source: string, result: any, success: boolean) {
    if (success) {
      this.completedSources.add(source);
      this.sourceResults.set(source, result);
      
      // Add candidates with deduplication
      if (result.candidates) {
        result.candidates.forEach((candidate: any) => {
          const key = this.generateCandidateKey(candidate);
          if (!this.collectedCandidates.has(key)) {
            candidate.source_platform = source;
            candidate.collection_timestamp = new Date().toISOString();
            this.collectedCandidates.set(key, candidate);
          }
        });
      }
    } else {
      this.failedSources.add(source);
    }
  }

  private generateCandidateKey(candidate: any): string {
    // Create a unique key for deduplication
    const identifiers = [
      candidate.email,
      candidate.github_username,
      candidate.linkedin_url,
      candidate.name?.toLowerCase().trim()
    ].filter(Boolean);

    return identifiers.length > 0 ? identifiers.join('|') : `${candidate.name || 'unknown'}-${Date.now()}`;
  }

  getProgressiveResult(totalSources: string[]): ProgressiveResult {
    const candidates = Array.from(this.collectedCandidates.values());
    const completionRate = this.completedSources.size / totalSources.length;
    const isPartial = completionRate < 1.0;

    // Recommend next sources based on success probability and complement
    const nextRecommendedSources = totalSources
      .filter(source => !this.completedSources.has(source) && !this.failedSources.has(source))
      .slice(0, 2); // Recommend up to 2 more sources

    return {
      candidates: this.sortCandidatesByQuality(candidates),
      sources: Array.from(this.completedSources),
      isPartial,
      completionRate,
      nextRecommendedSources
    };
  }

  private sortCandidatesByQuality(candidates: any[]): any[] {
    return candidates.sort((a, b) => {
      // Sort by composite score, data completeness, and freshness
      const scoreA = (a.composite_score || a.overall_score || 50) + 
                    (a.data_quality || 0) * 0.5 + 
                    (a.freshness || 0) * 0.3;
      const scoreB = (b.composite_score || b.overall_score || 50) + 
                    (b.data_quality || 0) * 0.5 + 
                    (b.freshness || 0) * 0.3;
      
      return scoreB - scoreA;
    });
  }

  hasMinimumResults(): boolean {
    return this.collectedCandidates.size >= 3;
  }

  getSourceResults() {
    return Object.fromEntries(this.sourceResults);
  }

  getCompletedSources(): string[] {
    return Array.from(this.completedSources);
  }

  getFailedSources(): string[] {
    return Array.from(this.failedSources);
  }

  getCandidateCount(): number {
    return this.collectedCandidates.size;
  }
}
