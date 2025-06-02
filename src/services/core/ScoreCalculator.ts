
import { ParsedQuery } from './QueryParser';

export class ScoreCalculator {
  async calculateScores(
    candidates: any[], 
    parsedQuery: ParsedQuery,
    filters?: any
  ): Promise<any[]> {
    return candidates.map(candidate => {
      const scores = this.calculateIndividualScores(candidate, parsedQuery);
      const overallScore = this.calculateOverallScore(scores);

      return {
        ...candidate,
        overall_score: overallScore,
        skill_match: scores.skillMatch,
        experience: scores.experience,
        reputation: scores.reputation,
        freshness: scores.freshness,
        social_proof: scores.socialProof,
        relevanceScore: overallScore,
        matchExplanation: this.generateMatchExplanation(candidate, parsedQuery, scores)
      };
    }).sort((a, b) => b.overall_score - a.overall_score);
  }

  private calculateIndividualScores(candidate: any, parsedQuery: ParsedQuery) {
    const candidateSkills = candidate.skills || [];
    
    // Skill match score
    const skillMatches = parsedQuery.skills.filter(skill => 
      candidateSkills.some((cs: string) => 
        cs.toLowerCase().includes(skill.toLowerCase())
      )
    );
    const skillMatch = Math.min((skillMatches.length / Math.max(parsedQuery.skills.length, 1)) * 100, 100);

    // Experience score
    const experienceYears = candidate.experience_years || 0;
    const experience = Math.min(experienceYears * 10, 100);

    // Reputation score (platform-specific)
    let reputation = 0;
    if (candidate.platform === 'github') {
      reputation = Math.min((candidate.followers || 0) * 2, 100);
    } else if (candidate.platform === 'stackoverflow') {
      reputation = Math.min((candidate.reputation || 0) / 50, 100);
    } else if (candidate.platform === 'linkedin') {
      reputation = Math.min((candidate.connections || 0) / 10, 100);
    }

    // Freshness score
    const lastActive = candidate.last_active ? new Date(candidate.last_active) : new Date();
    const daysSinceActive = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    const freshness = Math.max(0, 100 - daysSinceActive);

    // Social proof score
    const stars = candidate.total_stars || 0;
    const forks = candidate.total_forks || 0;
    const socialProof = Math.min((stars + forks) / 10, 100);

    return {
      skillMatch,
      experience,
      reputation,
      freshness,
      socialProof
    };
  }

  private calculateOverallScore(scores: any): number {
    const weights = {
      skillMatch: 0.35,
      experience: 0.25,
      reputation: 0.20,
      freshness: 0.10,
      socialProof: 0.10
    };

    return Math.round(
      scores.skillMatch * weights.skillMatch +
      scores.experience * weights.experience +
      scores.reputation * weights.reputation +
      scores.freshness * weights.freshness +
      scores.socialProof * weights.socialProof
    );
  }

  private generateMatchExplanation(candidate: any, parsedQuery: ParsedQuery, scores: any): string {
    const explanations = [];

    if (scores.skillMatch > 60) {
      const candidateSkills = candidate.skills || [];
      const matchingSkills = parsedQuery.skills.filter(skill => 
        candidateSkills.some((cs: string) => cs.toLowerCase().includes(skill.toLowerCase()))
      );
      explanations.push(`Skills: ${matchingSkills.join(', ')}`);
    }

    if (scores.experience > 50) {
      explanations.push(`Experience: ${candidate.experience_years || 0} years`);
    }

    if (scores.reputation > 60) {
      explanations.push(`Strong reputation on ${candidate.platform}`);
    }

    return explanations.length > 0 ? explanations.join(' • ') : 'General match';
  }
}
