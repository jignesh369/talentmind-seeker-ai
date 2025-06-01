
export interface ScoringCriteria {
  weights: {
    skillMatch: number;
    experience: number;
    reputation: number;
    freshness: number;
    socialProof: number;
  };
  tierThresholds: {
    gold: number;
    silver: number;
    bronze: number;
  };
  platformBonuses: {
    [platform: string]: number;
  };
}

export interface ScoringResult {
  overall_score: number;
  skill_match: number;
  experience: number;
  reputation: number;
  freshness: number;
  social_proof: number;
  weighted_score: number;
  tier: string;
  platform_bonus: number;
  confidence: number;
}

export class ScoringStandardizer {
  private openaiApiKey: string;
  private criteria: ScoringCriteria;

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
    this.criteria = {
      weights: {
        skillMatch: 0.40,  // 40% - Most important
        experience: 0.25,  // 25% - Very important
        reputation: 0.15,  // 15% - Important
        freshness: 0.12,   // 12% - Somewhat important
        socialProof: 0.08  // 8% - Least important
      },
      tierThresholds: {
        gold: 75,
        silver: 55,
        bronze: 35
      },
      platformBonuses: {
        github: 5,
        stackoverflow: 4,
        linkedin: 3,
        google: 2,
        kaggle: 3,
        devto: 2
      }
    };
  }

  async scoreCandidate(candidate: any, enhancedQuery: any, platform: string, tier: string): Promise<ScoringResult> {
    try {
      // Get AI scores
      const aiScores = await this.getAIScores(candidate, enhancedQuery, platform, tier);
      
      // Calculate weighted score
      const weightedScore = this.calculateWeightedScore(aiScores);
      
      // Apply platform bonus
      const platformBonus = this.criteria.platformBonuses[platform] || 0;
      
      // Determine final tier
      const finalTier = this.determineTier(weightedScore + platformBonus);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(aiScores, platform);

      return {
        overall_score: aiScores.overall_score,
        skill_match: aiScores.skill_match,
        experience: aiScores.experience,
        reputation: aiScores.reputation,
        freshness: aiScores.freshness,
        social_proof: aiScores.social_proof,
        weighted_score: Math.round(weightedScore),
        tier: finalTier,
        platform_bonus: platformBonus,
        confidence
      };
    } catch (error) {
      console.error('Scoring error:', error);
      return this.getDefaultScores(platform, tier);
    }
  }

  private async getAIScores(candidate: any, enhancedQuery: any, platform: string, tier: string) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Score this ${platform} candidate for ${tier} tier. Rate each dimension 0-100:

SCORING DIMENSIONS:
- overall_score: Holistic assessment considering all factors
- skill_match: How well technical skills align with requirements
- experience: Appropriate experience level and quality
- reputation: Professional credibility and recognition
- freshness: Recent activity and current relevance
- social_proof: Community engagement and visibility

TIER EXPECTATIONS:
- Bronze (30-54): Basic requirements met, shows potential
- Silver (55-74): Good match with solid credentials
- Gold (75-100): Exceptional match with strong credentials

Return ONLY JSON:
{
  "overall_score": 0-100,
  "skill_match": 0-100,
  "experience": 0-100,
  "reputation": 0-100,
  "freshness": 0-100,
  "social_proof": 0-100,
  "reasoning": "brief explanation"
}`
          },
          {
            role: 'user',
            content: `Platform: ${platform}
Target Tier: ${tier}
Search Requirements: ${JSON.stringify(enhancedQuery)}

Candidate Profile:
Name: ${candidate.name}
Title: ${candidate.title || 'N/A'}
Summary: ${candidate.summary || 'N/A'}
Skills: ${JSON.stringify(candidate.skills || [])}
Experience: ${candidate.experience_years || 'N/A'} years
Location: ${candidate.location || 'N/A'}
Platform Data: ${JSON.stringify(this.extractPlatformData(candidate, platform))}`
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const scores = JSON.parse(content.replace(/```json\s*|\s*```/g, ''));
      return {
        overall_score: Math.max(0, Math.min(100, scores.overall_score || 50)),
        skill_match: Math.max(0, Math.min(100, scores.skill_match || 50)),
        experience: Math.max(0, Math.min(100, scores.experience || 50)),
        reputation: Math.max(0, Math.min(100, scores.reputation || 50)),
        freshness: Math.max(0, Math.min(100, scores.freshness || 50)),
        social_proof: Math.max(0, Math.min(100, scores.social_proof || 50))
      };
    } catch (e) {
      throw new Error('Failed to parse AI scoring response');
    }
  }

  private calculateWeightedScore(scores: any): number {
    return (
      scores.skill_match * this.criteria.weights.skillMatch +
      scores.experience * this.criteria.weights.experience +
      scores.reputation * this.criteria.weights.reputation +
      scores.freshness * this.criteria.weights.freshness +
      scores.social_proof * this.criteria.weights.socialProof
    );
  }

  private determineTier(score: number): string {
    if (score >= this.criteria.tierThresholds.gold) return 'gold';
    if (score >= this.criteria.tierThresholds.silver) return 'silver';
    return 'bronze';
  }

  private calculateConfidence(scores: any, platform: string): number {
    // Base confidence from score consistency
    const scoresArray = [
      scores.skill_match,
      scores.experience,
      scores.reputation,
      scores.freshness,
      scores.social_proof
    ];
    
    const mean = scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length;
    const variance = scoresArray.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scoresArray.length;
    const consistency = Math.max(0, 1 - variance / 1000); // Normalize variance
    
    // Platform reliability bonus
    const platformReliability = {
      github: 0.9,
      stackoverflow: 0.85,
      linkedin: 0.8,
      google: 0.6,
      kaggle: 0.75,
      devto: 0.7
    };
    
    const reliability = platformReliability[platform] || 0.5;
    
    // Combine factors
    return Math.round((consistency * 0.6 + reliability * 0.4) * 100) / 100;
  }

  private extractPlatformData(candidate: any, platform: string): any {
    switch (platform) {
      case 'github':
        return {
          username: candidate.github_username,
          repos: candidate.public_repos,
          followers: candidate.followers,
          languages: candidate.detected_languages
        };
      case 'stackoverflow':
        return {
          reputation: candidate.reputation,
          answers: candidate.answer_count,
          questions: candidate.question_count,
          badges: candidate.badge_counts
        };
      case 'linkedin':
        return {
          url: candidate.linkedin_url,
          company: candidate.company,
          connections: candidate.connections
        };
      default:
        return {};
    }
  }

  private getDefaultScores(platform: string, tier: string): ScoringResult {
    const baseScore = this.criteria.tierThresholds[tier] || 40;
    const platformBonus = this.criteria.platformBonuses[platform] || 0;
    
    return {
      overall_score: baseScore,
      skill_match: baseScore,
      experience: baseScore,
      reputation: baseScore,
      freshness: baseScore,
      social_proof: baseScore,
      weighted_score: baseScore,
      tier,
      platform_bonus: platformBonus,
      confidence: 0.5
    };
  }
}
