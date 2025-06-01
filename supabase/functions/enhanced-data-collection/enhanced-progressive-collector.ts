
import { DeduplicationEngine, CandidateProfile, DeduplicationResult } from './deduplication-engine.ts';

export interface EnhancedProgressiveResult {
  candidates: any[];
  sources: string[];
  isPartial: boolean;
  completionRate: number;
  nextRecommendedSources: string[];
  deduplicationStats: {
    originalCount: number;
    deduplicatedCount: number;
    duplicatesRemoved: number;
    mergeDecisions: number;
  };
}

export class EnhancedProgressiveCollector {
  private collectedCandidates: Map<string, any> = new Map();
  private completedSources: Set<string> = new Set();
  private failedSources: Set<string> = new Set();
  private sourceResults: Map<string, any> = new Map();
  private deduplicationStats: DeduplicationResult | null = null;

  addSourceResult(source: string, result: any, success: boolean) {
    if (success) {
      this.completedSources.add(source);
      this.sourceResults.set(source, result);
      
      // Add candidates with enhanced deduplication
      if (result.candidates) {
        result.candidates.forEach((candidate: any) => {
          // Enhanced candidate key generation
          const key = this.generateEnhancedCandidateKey(candidate);
          if (!this.collectedCandidates.has(key)) {
            candidate.source_platform = source;
            candidate.collection_timestamp = new Date().toISOString();
            candidate.platform = source; // Ensure platform is set for deduplication
            this.collectedCandidates.set(key, candidate);
          }
        });
      }
    } else {
      this.failedSources.add(source);
    }
  }

  private generateEnhancedCandidateKey(candidate: any): string {
    // Multi-level key generation for better deduplication
    const identifiers = [];
    
    // Primary identifiers (highest priority)
    if (candidate.email) {
      identifiers.push(`email:${candidate.email.toLowerCase().trim()}`);
    }
    
    if (candidate.github_username) {
      identifiers.push(`github:${candidate.github_username.toLowerCase()}`);
    }
    
    if (candidate.linkedin_url) {
      const linkedinId = candidate.linkedin_url.split('/').pop();
      identifiers.push(`linkedin:${linkedinId}`);
    }

    // Secondary identifiers
    if (candidate.name) {
      const normalizedName = candidate.name.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '-')
        .trim();
      identifiers.push(`name:${normalizedName}`);
    }

    // Fallback identifier
    if (identifiers.length === 0) {
      identifiers.push(`fallback:${candidate.name || 'unknown'}-${Date.now()}-${Math.random()}`);
    }

    return identifiers.join('|');
  }

  getEnhancedProgressiveResult(totalSources: string[]): EnhancedProgressiveResult {
    // Convert candidates to DeduplicationEngine format
    const candidatesArray = Array.from(this.collectedCandidates.values());
    const candidateProfiles: CandidateProfile[] = candidatesArray.map(c => ({
      id: c.id || this.generateId(),
      name: c.name || 'Unknown',
      email: c.email,
      location: c.location,
      github_username: c.github_username,
      linkedin_url: c.linkedin_url,
      skills: c.skills || [],
      platform: c.platform || c.source_platform || 'unknown',
      ...c // Include all other properties
    }));

    // Run enhanced deduplication
    console.log(`🔄 Running enhanced deduplication on ${candidateProfiles.length} candidates...`);
    this.deduplicationStats = DeduplicationEngine.deduplicate(candidateProfiles);

    const completionRate = this.completedSources.size / totalSources.length;
    const isPartial = completionRate < 1.0;

    // Recommend next sources based on success probability
    const nextRecommendedSources = totalSources
      .filter(source => !this.completedSources.has(source) && !this.failedSources.has(source))
      .slice(0, 2);

    return {
      candidates: this.sortCandidatesByQuality(this.deduplicationStats.mergedProfiles),
      sources: Array.from(this.completedSources),
      isPartial,
      completionRate,
      nextRecommendedSources,
      deduplicationStats: {
        originalCount: this.deduplicationStats.originalCount,
        deduplicatedCount: this.deduplicationStats.deduplicatedCount,
        duplicatesRemoved: this.deduplicationStats.duplicatesFound,
        mergeDecisions: this.deduplicationStats.mergeDecisions.length
      }
    };
  }

  private sortCandidatesByQuality(candidates: any[]): any[] {
    return candidates.sort((a, b) => {
      // Enhanced sorting with deduplication quality factors
      const scoreA = this.calculateEnhancedQualityScore(a);
      const scoreB = this.calculateEnhancedQualityScore(b);
      
      return scoreB - scoreA;
    });
  }

  private calculateEnhancedQualityScore(candidate: any): number {
    let score = candidate.composite_score || candidate.overall_score || 50;
    
    // Bonus for data completeness
    if (candidate.email) score += 10;
    if (candidate.location) score += 5;
    if (candidate.github_username) score += 8;
    if (candidate.linkedin_url) score += 8;
    if (candidate.skills?.length > 5) score += 15;
    
    // Bonus for merged profiles (higher confidence)
    if (candidate.platforms_merged?.length > 1) {
      score += candidate.platforms_merged.length * 5;
    }
    
    // Bonus for merge confidence
    if (candidate.merge_confidence) {
      score += candidate.merge_confidence * 10;
    }
    
    // Freshness bonus
    if (candidate.freshness) score += candidate.freshness * 0.3;
    
    return score;
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
    return this.deduplicationStats?.deduplicatedCount || this.collectedCandidates.size;
  }

  getDeduplicationStats(): DeduplicationResult | null {
    return this.deduplicationStats;
  }

  private generateId(): string {
    return crypto.randomUUID();
  }
}
