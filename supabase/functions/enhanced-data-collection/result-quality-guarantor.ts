
export interface QualityGuaranteeConfig {
  minimumResults: number;
  qualityThreshold: number;
  maxRetries: number;
  fallbackStrategies: string[];
}

export class ResultQualityGuarantor {
  private config: QualityGuaranteeConfig;

  constructor(config: Partial<QualityGuaranteeConfig> = {}) {
    this.config = {
      minimumResults: 10,
      qualityThreshold: 60,
      maxRetries: 2,
      fallbackStrategies: ['broadening', 'alternative_sources', 'relaxed_criteria'],
      ...config
    };
  }

  async guaranteeQualityResults(
    currentResults: any[],
    originalQuery: string,
    location: string,
    sources: string[],
    collectFunction: (query: string, location: string, sources: string[]) => Promise<any>
  ): Promise<{ results: any[]; guaranteeMetrics: any }> {
    
    console.log(`🎯 Quality Guarantor: Ensuring minimum ${this.config.minimumResults} high-quality results`);
    
    let allResults = [...currentResults];
    let retryCount = 0;
    let strategiesUsed: string[] = [];
    
    // Filter high-quality results
    const highQualityResults = this.filterHighQualityResults(allResults);
    
    console.log(`📊 Initial quality analysis: ${highQualityResults.length}/${allResults.length} high-quality results`);
    
    // If we have enough high-quality results, return them
    if (highQualityResults.length >= this.config.minimumResults) {
      return {
        results: highQualityResults.slice(0, this.config.minimumResults * 1.5), // Return 50% more for selection
        guaranteeMetrics: {
          strategy_used: 'sufficient_quality',
          retries_needed: 0,
          final_quality_rate: (highQualityResults.length / allResults.length) * 100,
          guarantee_met: true
        }
      };
    }
    
    // Apply fallback strategies to meet minimum requirements
    while (highQualityResults.length < this.config.minimumResults && retryCount < this.config.maxRetries) {
      retryCount++;
      console.log(`🔄 Quality Guarantor retry ${retryCount}: Need ${this.config.minimumResults - highQualityResults.length} more results`);
      
      const strategy = this.config.fallbackStrategies[Math.min(retryCount - 1, this.config.fallbackStrategies.length - 1)];
      strategiesUsed.push(strategy);
      
      const enhancedQuery = this.applyFallbackStrategy(originalQuery, strategy, retryCount);
      const enhancedSources = this.selectOptimalSources(sources, strategy);
      
      try {
        console.log(`📈 Applying strategy "${strategy}" with query: "${enhancedQuery}"`);
        const additionalResults = await collectFunction(enhancedQuery, location, enhancedSources);
        
        if (additionalResults && additionalResults.results) {
          const newCandidates = Object.values(additionalResults.results)
            .flat()
            .filter((candidate: any) => candidate && candidate.id)
            .filter((candidate: any) => !allResults.some(existing => existing.id === candidate.id));
          
          allResults.push(...newCandidates);
          const newHighQuality = this.filterHighQualityResults(newCandidates);
          highQualityResults.push(...newHighQuality);
          
          console.log(`✅ Strategy "${strategy}" added ${newCandidates.length} candidates (${newHighQuality.length} high-quality)`);
        }
      } catch (error) {
        console.error(`❌ Fallback strategy "${strategy}" failed:`, error.message);
      }
    }
    
    // If still not enough, apply relaxed criteria
    if (highQualityResults.length < this.config.minimumResults) {
      console.log(`🔽 Applying relaxed criteria to meet minimum requirements`);
      const relaxedResults = this.applyRelaxedCriteria(allResults, this.config.minimumResults);
      
      return {
        results: relaxedResults,
        guaranteeMetrics: {
          strategy_used: 'relaxed_criteria',
          retries_needed: retryCount,
          strategies_applied: strategiesUsed,
          final_quality_rate: (highQualityResults.length / relaxedResults.length) * 100,
          guarantee_met: relaxedResults.length >= this.config.minimumResults,
          quality_compromise: true
        }
      };
    }
    
    return {
      results: highQualityResults.slice(0, this.config.minimumResults * 1.5),
      guaranteeMetrics: {
        strategy_used: 'fallback_success',
        retries_needed: retryCount,
        strategies_applied: strategiesUsed,
        final_quality_rate: (highQualityResults.length / allResults.length) * 100,
        guarantee_met: true,
        quality_maintained: true
      }
    };
  }

  private filterHighQualityResults(results: any[]): any[] {
    return results.filter(candidate => {
      if (!candidate) return false;
      
      const qualityScore = this.calculateQualityScore(candidate);
      return qualityScore >= this.config.qualityThreshold;
    });
  }

  private calculateQualityScore(candidate: any): number {
    let score = 0;
    const maxScore = 100;
    
    // Profile completeness (30 points)
    const completenessFactors = [
      !!candidate.name,
      !!candidate.title,
      !!candidate.summary && candidate.summary.length > 50,
      !!candidate.location,
      !!candidate.skills && candidate.skills.length >= 3,
      !!candidate.experience_years && candidate.experience_years > 0
    ];
    score += (completenessFactors.filter(Boolean).length / completenessFactors.length) * 30;
    
    // Skills relevance (25 points)
    const skillScore = candidate.skill_match || 0;
    score += Math.min(skillScore, 25);
    
    // Experience quality (25 points)
    const experienceScore = Math.min((candidate.experience_years || 0) * 3, 25);
    score += experienceScore;
    
    // Social proof/reputation (20 points)
    const reputationScore = Math.min((candidate.reputation || 0) / 5, 20);
    score += reputationScore;
    
    return Math.round(score);
  }

  private applyFallbackStrategy(originalQuery: string, strategy: string, retryCount: number): string {
    switch (strategy) {
      case 'broadening':
        // Remove specific requirements and broaden the search
        const broaderTerms = originalQuery
          .toLowerCase()
          .replace(/\b(senior|lead|principal|staff)\b/g, '') // Remove seniority
          .replace(/\b(with|having|knowledge|experience)\s+in\b/g, '') // Simplify requirements
          .replace(/\s+/g, ' ')
          .trim();
        return broaderTerms || 'developer engineer';
        
      case 'alternative_sources':
        // Focus on different aspects of the query
        const words = originalQuery.split(' ').filter(word => word.length > 3);
        return words.slice(0, Math.max(2, words.length - retryCount)).join(' ');
        
      case 'relaxed_criteria':
        // Use more general terms
        const generalTerms = this.extractGeneralTerms(originalQuery);
        return generalTerms.join(' ') || 'software developer';
        
      default:
        return originalQuery;
    }
  }

  private extractGeneralTerms(query: string): string[] {
    const generalMappings = {
      'backend': 'developer',
      'frontend': 'developer', 
      'fullstack': 'developer',
      'devops': 'engineer',
      'machine learning': 'data scientist',
      'ai': 'developer',
      'mobile': 'developer',
      'web': 'developer'
    };
    
    const terms: string[] = [];
    const queryLower = query.toLowerCase();
    
    Object.entries(generalMappings).forEach(([specific, general]) => {
      if (queryLower.includes(specific)) {
        terms.push(general);
      }
    });
    
    // Add common programming languages
    const languages = ['python', 'javascript', 'java', 'typescript', 'go'];
    languages.forEach(lang => {
      if (queryLower.includes(lang)) {
        terms.push(lang);
      }
    });
    
    return terms.length > 0 ? terms : ['developer'];
  }

  private selectOptimalSources(sources: string[], strategy: string): string[] {
    switch (strategy) {
      case 'broadening':
        // Use all sources to maximize reach
        return sources;
        
      case 'alternative_sources':
        // Prioritize different sources
        const alternativeOrder = ['linkedin', 'github', 'stackoverflow', 'google'];
        return alternativeOrder.filter(source => sources.includes(source));
        
      case 'relaxed_criteria':
        // Focus on sources with more candidates
        const highVolumeOrder = ['github', 'linkedin', 'google', 'stackoverflow'];
        return highVolumeOrder.filter(source => sources.includes(source));
        
      default:
        return sources;
    }
  }

  private applyRelaxedCriteria(allResults: any[], targetCount: number): any[] {
    // Sort all results by a relaxed scoring system
    const scoredResults = allResults.map(candidate => ({
      ...candidate,
      relaxed_score: this.calculateRelaxedScore(candidate)
    }));
    
    // Sort by relaxed score and take the best available
    scoredResults.sort((a, b) => b.relaxed_score - a.relaxed_score);
    
    return scoredResults.slice(0, Math.max(targetCount, allResults.length));
  }

  private calculateRelaxedScore(candidate: any): number {
    let score = 0;
    
    // Basic profile presence (40 points)
    if (candidate.name) score += 20;
    if (candidate.title) score += 10;
    if (candidate.summary) score += 10;
    
    // Any skills present (30 points)
    if (candidate.skills && candidate.skills.length > 0) {
      score += Math.min(candidate.skills.length * 5, 30);
    }
    
    // Any experience (30 points)
    if (candidate.experience_years > 0) {
      score += Math.min(candidate.experience_years * 3, 30);
    } else if (candidate.overall_score > 0) {
      score += 15; // Some indication of experience
    }
    
    return score;
  }
}
