
export interface QualityMetrics {
  profile_completeness: number;
  skill_relevance: number;
  experience_match: number;
  activity_score: number;
  credibility_score: number;
  overall_quality: number;
}

export interface QualityThresholds {
  min_profile_completeness: number;
  min_skill_relevance: number;
  min_overall_quality: number;
  premium_quality_threshold: number;
}

export class ResultQualityFilter {
  private static readonly DEFAULT_THRESHOLDS: QualityThresholds = {
    min_profile_completeness: 40,
    min_skill_relevance: 30,
    min_overall_quality: 50,
    premium_quality_threshold: 80
  };

  private static readonly QUALITY_WEIGHTS = {
    profile_completeness: 0.25,
    skill_relevance: 0.35,
    experience_match: 0.20,
    activity_score: 0.10,
    credibility_score: 0.10
  };

  static filterAndRankCandidates(
    candidates: any[], 
    queryAnalysis: any,
    thresholds: Partial<QualityThresholds> = {}
  ): { candidates: any[], qualityReport: any } {
    console.log('🔍 Starting quality filtering and ranking...');
    
    const finalThresholds = { ...this.DEFAULT_THRESHOLDS, ...thresholds };
    const candidatesWithQuality = candidates.map(candidate => 
      this.enrichCandidateWithQuality(candidate, queryAnalysis)
    );

    // Filter by minimum quality thresholds
    const qualifiedCandidates = candidatesWithQuality.filter(candidate => 
      this.meetsQualityThresholds(candidate, finalThresholds)
    );

    // Rank by quality score
    const rankedCandidates = qualifiedCandidates.sort((a, b) => 
      (b.quality_metrics?.overall_quality || 0) - (a.quality_metrics?.overall_quality || 0)
    );

    const qualityReport = this.generateQualityReport(
      candidates, 
      qualifiedCandidates, 
      rankedCandidates,
      finalThresholds
    );

    console.log(`✅ Quality filtering completed: ${rankedCandidates.length}/${candidates.length} candidates passed`);
    
    return {
      candidates: rankedCandidates,
      qualityReport
    };
  }

  private static enrichCandidateWithQuality(candidate: any, queryAnalysis: any): any {
    const qualityMetrics = this.calculateQualityMetrics(candidate, queryAnalysis);
    
    return {
      ...candidate,
      quality_metrics: qualityMetrics,
      quality_tier: this.determineQualityTier(qualityMetrics.overall_quality),
      relevance_score: this.calculateRelevanceScore(candidate, queryAnalysis)
    };
  }

  private static calculateQualityMetrics(candidate: any, queryAnalysis: any): QualityMetrics {
    const profileCompleteness = this.assessProfileCompleteness(candidate);
    const skillRelevance = this.assessSkillRelevance(candidate, queryAnalysis);
    const experienceMatch = this.assessExperienceMatch(candidate, queryAnalysis);
    const activityScore = this.assessActivityScore(candidate);
    const credibilityScore = this.assessCredibilityScore(candidate);

    const overallQuality = 
      (profileCompleteness * this.QUALITY_WEIGHTS.profile_completeness) +
      (skillRelevance * this.QUALITY_WEIGHTS.skill_relevance) +
      (experienceMatch * this.QUALITY_WEIGHTS.experience_match) +
      (activityScore * this.QUALITY_WEIGHTS.activity_score) +
      (credibilityScore * this.QUALITY_WEIGHTS.credibility_score);

    return {
      profile_completeness: profileCompleteness,
      skill_relevance: skillRelevance,
      experience_match: experienceMatch,
      activity_score: activityScore,
      credibility_score: credibilityScore,
      overall_quality: Math.round(overallQuality)
    };
  }

  private static assessProfileCompleteness(candidate: any): number {
    const requiredFields = ['name', 'title', 'summary', 'skills', 'location'];
    const optionalFields = ['avatar_url', 'email', 'github_username', 'experience_years'];
    
    const requiredScore = requiredFields.filter(field => 
      candidate[field] && candidate[field].toString().trim().length > 0
    ).length / requiredFields.length * 70;

    const optionalScore = optionalFields.filter(field => 
      candidate[field] && candidate[field].toString().trim().length > 0
    ).length / optionalFields.length * 30;

    return Math.round(requiredScore + optionalScore);
  }

  private static assessSkillRelevance(candidate: any, queryAnalysis: any): number {
    const candidateSkills = candidate.skills || [];
    const querySkills = [
      ...(queryAnalysis.skill_analysis?.technical_skills || []),
      ...(queryAnalysis.skill_analysis?.domain_expertise || [])
    ];

    if (querySkills.length === 0) return 50; // Neutral score if no specific skills requested

    const matchingSkills = candidateSkills.filter(skill => 
      querySkills.some(querySkill => 
        skill.toLowerCase().includes(querySkill.toLowerCase()) ||
        querySkill.toLowerCase().includes(skill.toLowerCase())
      )
    );

    const relevanceScore = (matchingSkills.length / Math.max(querySkills.length, 1)) * 100;
    
    // Bonus for skill depth (more skills generally better)
    const depthBonus = Math.min(candidateSkills.length / 10 * 20, 20);
    
    return Math.min(Math.round(relevanceScore + depthBonus), 100);
  }

  private static assessExperienceMatch(candidate: any, queryAnalysis: any): number {
    const candidateExperience = candidate.experience_years || 0;
    const roleAnalysis = queryAnalysis.role_analysis;
    
    // Experience expectations based on role hierarchy
    const experienceRanges = {
      'junior': { min: 0, max: 3, optimal: 2 },
      'mid': { min: 2, max: 6, optimal: 4 },
      'senior': { min: 5, max: 12, optimal: 8 },
      'lead': { min: 7, max: 15, optimal: 10 },
      'principal': { min: 10, max: 25, optimal: 15 }
    };

    const hierarchyLevel = roleAnalysis?.hierarchy_level || 'any';
    if (hierarchyLevel === 'any') return 70; // Neutral score

    const range = experienceRanges[hierarchyLevel];
    if (!range) return 60;

    if (candidateExperience >= range.min && candidateExperience <= range.max) {
      // Perfect match gets 100, deviation reduces score
      const deviation = Math.abs(candidateExperience - range.optimal);
      return Math.max(100 - (deviation * 5), 70);
    }

    // Outside range but close gets partial credit
    const distanceFromRange = candidateExperience < range.min 
      ? range.min - candidateExperience 
      : candidateExperience - range.max;
    
    return Math.max(60 - (distanceFromRange * 10), 20);
  }

  private static assessActivityScore(candidate: any): number {
    const lastActive = candidate.last_active;
    if (!lastActive) return 40;

    const daysSinceActive = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceActive <= 30) return 100;
    if (daysSinceActive <= 90) return 80;
    if (daysSinceActive <= 180) return 60;
    if (daysSinceActive <= 365) return 40;
    return 20;
  }

  private static assessCredibilityScore(candidate: any): number {
    let score = 50; // Base score

    // GitHub presence
    if (candidate.github_username) score += 15;
    
    // Public repos and activity
    if (candidate.platformSpecificData?.public_repos > 5) score += 10;
    if (candidate.platformSpecificData?.followers > 10) score += 10;
    
    // Profile verification indicators
    if (candidate.email && candidate.email.includes('@')) score += 10;
    if (candidate.linkedin_url) score += 10;
    
    // Risk flags (reduce score)
    const riskFlags = candidate.risk_flags || [];
    score -= riskFlags.length * 5;

    return Math.max(Math.min(score, 100), 0);
  }

  private static calculateRelevanceScore(candidate: any, queryAnalysis: any): number {
    const qualityWeight = 0.6;
    const matchWeight = 0.4;
    
    const qualityScore = candidate.quality_metrics?.overall_quality || 0;
    const matchScore = candidate.hybrid_score || candidate.overall_score || 0;
    
    return Math.round((qualityScore * qualityWeight) + (matchScore * matchWeight));
  }

  private static meetsQualityThresholds(candidate: any, thresholds: QualityThresholds): boolean {
    const metrics = candidate.quality_metrics;
    if (!metrics) return false;

    return (
      metrics.profile_completeness >= thresholds.min_profile_completeness &&
      metrics.skill_relevance >= thresholds.min_skill_relevance &&
      metrics.overall_quality >= thresholds.min_overall_quality
    );
  }

  private static determineQualityTier(overallQuality: number): string {
    if (overallQuality >= 90) return 'premium';
    if (overallQuality >= 75) return 'high';
    if (overallQuality >= 60) return 'good';
    if (overallQuality >= 45) return 'fair';
    return 'basic';
  }

  private static generateQualityReport(
    originalCandidates: any[],
    qualifiedCandidates: any[],
    rankedCandidates: any[],
    thresholds: QualityThresholds
  ) {
    const totalOriginal = originalCandidates.length;
    const totalQualified = qualifiedCandidates.length;
    const qualificationRate = totalOriginal > 0 ? (totalQualified / totalOriginal) * 100 : 0;

    const qualityDistribution = rankedCandidates.reduce((acc, candidate) => {
      const tier = candidate.quality_tier;
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {});

    const averageQuality = rankedCandidates.length > 0 
      ? rankedCandidates.reduce((sum, c) => sum + (c.quality_metrics?.overall_quality || 0), 0) / rankedCandidates.length
      : 0;

    return {
      total_processed: totalOriginal,
      total_qualified: totalQualified,
      qualification_rate: Math.round(qualificationRate),
      average_quality_score: Math.round(averageQuality),
      quality_distribution: qualityDistribution,
      thresholds_applied: thresholds,
      quality_summary: {
        premium: qualityDistribution.premium || 0,
        high: qualityDistribution.high || 0,
        good: qualityDistribution.good || 0,
        fair: qualityDistribution.fair || 0,
        basic: qualityDistribution.basic || 0
      }
    };
  }
}
