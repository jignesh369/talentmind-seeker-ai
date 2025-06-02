
export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: string[];
  tier: 'bronze' | 'silver' | 'gold';
  confidence: number;
}

export class CandidateValidator {
  static validateCandidate(candidate: any, searchQuery?: string): ValidationResult {
    const issues: string[] = [];
    let score = 0;
    
    // Basic authenticity checks
    if (!candidate.name || candidate.name.length < 2) {
      issues.push('Invalid or missing name');
    } else if (candidate.name.startsWith('#') || candidate.name.includes('#')) {
      issues.push('Name appears to be a hashtag or keyword');
      score -= 30;
    } else {
      score += 20;
    }

    // Check for real person indicators
    if (candidate.email && this.isValidEmail(candidate.email)) {
      score += 15;
    }

    if (candidate.github_username && candidate.github_username.length > 2) {
      score += 10;
    }

    if (candidate.linkedin_url && candidate.linkedin_url.includes('linkedin.com')) {
      score += 10;
    }

    // Technical relevance
    if (candidate.skills && Array.isArray(candidate.skills) && candidate.skills.length > 0) {
      score += Math.min(candidate.skills.length * 3, 20);
    } else {
      issues.push('No technical skills listed');
    }

    if (candidate.title && candidate.title.length > 5) {
      score += 10;
    } else {
      issues.push('Missing or incomplete job title');
    }

    // Profile quality
    if (candidate.summary && candidate.summary.length > 50) {
      score += 15;
    }

    if (candidate.experience_years && candidate.experience_years > 0) {
      score += 10;
    }

    if (candidate.location && candidate.location.length > 2) {
      score += 5;
    }

    // Platform activity indicators
    if (candidate.last_active) {
      const daysSinceActive = this.getDaysSinceDate(candidate.last_active);
      if (daysSinceActive < 30) score += 10;
      else if (daysSinceActive < 90) score += 5;
    }

    // Search relevance (if query provided)
    if (searchQuery) {
      const relevanceScore = this.calculateRelevance(candidate, searchQuery);
      score += relevanceScore;
    }

    // Determine tier and validity
    const tier = score >= 70 ? 'gold' : score >= 50 ? 'silver' : 'bronze';
    const isValid = score >= 30; // Minimum threshold for inclusion
    const confidence = Math.min(score, 100);

    return {
      isValid,
      score: Math.min(score, 100),
      issues,
      tier,
      confidence
    };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static getDaysSinceDate(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  private static calculateRelevance(candidate: any, query: string): number {
    let relevanceScore = 0;
    const queryTerms = query.toLowerCase().split(/\s+/);

    // Check name relevance
    if (candidate.name) {
      const nameMatches = queryTerms.filter(term => 
        candidate.name.toLowerCase().includes(term)
      ).length;
      relevanceScore += nameMatches * 5;
    }

    // Check title relevance
    if (candidate.title) {
      const titleMatches = queryTerms.filter(term => 
        candidate.title.toLowerCase().includes(term)
      ).length;
      relevanceScore += titleMatches * 8;
    }

    // Check skills relevance
    if (candidate.skills && Array.isArray(candidate.skills)) {
      const skillMatches = queryTerms.filter(term => 
        candidate.skills.some((skill: string) => 
          skill.toLowerCase().includes(term)
        )
      ).length;
      relevanceScore += skillMatches * 10;
    }

    // Check summary relevance
    if (candidate.summary) {
      const summaryMatches = queryTerms.filter(term => 
        candidate.summary.toLowerCase().includes(term)
      ).length;
      relevanceScore += summaryMatches * 3;
    }

    return Math.min(relevanceScore, 30);
  }

  static filterHighQualityCandidates(candidates: any[], minScore: number = 40): any[] {
    return candidates
      .map(candidate => ({
        ...candidate,
        validation: this.validateCandidate(candidate)
      }))
      .filter(candidate => candidate.validation.isValid && candidate.validation.score >= minScore)
      .sort((a, b) => b.validation.score - a.validation.score);
  }
}
