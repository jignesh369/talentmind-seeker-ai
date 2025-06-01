
import { extractJSON } from './query-enhancement.ts'

export async function calculateEnhancedTieredScoring(candidate: any, enhancedQuery: any, tier: string, platform: string, openaiApiKey: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an enhanced tiered candidate scorer for ${platform}. Apply tier-appropriate expectations with platform-specific bonuses.

            ENHANCED SCORING for ${tier.toUpperCase()} tier on ${platform.toUpperCase()} (0-100 each):
            
            Base Scores:
            - overall_score: Holistic assessment with platform context
            - skill_match: Technical alignment (boosted for ${platform} specific skills)
            - experience: Experience appropriateness with platform validation
            - reputation: Professional credibility with platform authority
            - freshness: Recent activity (platform-specific interpretation)
            - social_proof: Community presence (platform network effects)
            
            Platform Bonuses:
            - GitHub: Repository quality, language expertise, contribution patterns
            - Stack Overflow: Answer quality, expertise depth, community impact  
            - LinkedIn: Professional completeness, cross-platform verification
            
            TIER EXPECTATIONS:
            - Bronze: Promising candidate with growth potential, lower barriers
            - Silver: Solid professional with good platform presence
            - Gold: Exceptional candidate with strong platform authority
            
            Return ONLY a JSON object with enhanced scores (0-100):
            {
              "overall_score": integer,
              "skill_match": integer,
              "experience": integer,
              "reputation": integer,
              "freshness": integer,
              "social_proof": integer,
              "validation_confidence": 0.0-1.0,
              "platform_bonus": 0-15,
              "tier_justification": "why this tier is appropriate"
            }`
          },
          {
            role: 'user',
            content: `Platform: ${platform}
            Tier: ${tier}
            Search requirements: ${JSON.stringify(enhancedQuery)}
            Candidate profile: ${JSON.stringify(candidate)}`
          }
        ],
        temperature: 0.2
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    const scores = extractJSON(content) || {}
    
    return {
      ...candidate,
      overall_score: Math.round(scores.overall_score || getEnhancedDefaultScoreForTier(tier, platform)),
      skill_match: Math.round(scores.skill_match || getEnhancedDefaultScoreForTier(tier, platform)),
      experience: Math.round(scores.experience || getEnhancedDefaultScoreForTier(tier, platform)),
      reputation: Math.round(scores.reputation || getEnhancedDefaultScoreForTier(tier, platform)),
      freshness: Math.round(scores.freshness || getEnhancedDefaultScoreForTier(tier, platform)),
      social_proof: Math.round(scores.social_proof || getEnhancedDefaultScoreForTier(tier, platform)),
      validation_confidence: scores.validation_confidence || getEnhancedDefaultConfidenceForTier(tier, platform),
      platform_bonus: Math.round(scores.platform_bonus || 0),
      tier_justification: scores.tier_justification || `Enhanced ${tier} tier candidate from ${platform}`,
      ai_scored: true,
      enhanced_scoring: true,
      scoring_timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error in enhanced tiered scoring:', error)
    const defaultScore = getEnhancedDefaultScoreForTier(tier, platform)
    return {
      ...candidate,
      overall_score: defaultScore,
      skill_match: defaultScore,
      experience: defaultScore,
      reputation: defaultScore,
      freshness: defaultScore,
      social_proof: defaultScore,
      validation_confidence: getEnhancedDefaultConfidenceForTier(tier, platform),
      ai_scored: false,
      enhanced_scoring: false
    }
  }
}

export function getEnhancedMinScoreForTier(tier: string, platform: string): number {
  const baseScores = {
    'gold': 70,
    'silver': 50, 
    'bronze': 30
  }
  
  // Platform adjustments (GitHub and SO get slight bonus for technical validation)
  const platformBonus = ['github', 'stackoverflow'].includes(platform) ? 5 : 0
  
  return (baseScores[tier] || 30) - platformBonus
}

export function getEnhancedMinConfidenceForTier(tier: string, platform: string): number {
  const baseConfidence = {
    'gold': 0.7,
    'silver': 0.5,
    'bronze': 0.3
  }
  
  return baseConfidence[tier] || 0.3
}

export function getEnhancedDefaultScoreForTier(tier: string, platform: string): number {
  const baseScores = {
    'gold': 75,
    'silver': 55,
    'bronze': 35
  }
  
  const platformBonus = ['github', 'stackoverflow'].includes(platform) ? 5 : 0
  return (baseScores[tier] || 35) + platformBonus
}

export function getEnhancedDefaultConfidenceForTier(tier: string, platform: string): number {
  const baseConfidence = {
    'gold': 0.8,
    'silver': 0.6,
    'bronze': 0.4
  }
  
  return baseConfidence[tier] || 0.4
}

export function applyPlatformSpecificBonuses(candidate: any, platform: string, rawData: any) {
  if (platform === 'github') {
    // GitHub-specific bonuses
    if (candidate.readme_email_found) {
      candidate.overall_score += 3
      candidate.contact_discovery_bonus = 3
    }
    if (candidate.language_expertise > 70) {
      candidate.overall_score += 5
      candidate.language_expertise_bonus = 5
    }
  } else if (platform === 'stackoverflow') {
    // Stack Overflow-specific bonuses
    if (candidate.expertise_score > 70) {
      candidate.overall_score += 5
      candidate.expertise_bonus = 5
    }
    if (candidate.answer_quality_score > 70) {
      candidate.overall_score += 3
      candidate.answer_quality_bonus = 3
    }
  } else if (platform === 'linkedin-cross-platform') {
    // LinkedIn cross-platform bonuses
    if (candidate.cross_platform_match) {
      candidate.overall_score += 8
      candidate.cross_platform_bonus = 8
    }
    if (candidate.source_correlation_score > 60) {
      candidate.overall_score += 5
      candidate.correlation_bonus = 5
    }
  }
  
  return candidate
}

export function calculateAdvancedCompleteness(candidate: any): number {
  let score = 0
  const maxScore = 100
  
  // Basic information (25 points)
  if (candidate.name) score += 8
  if (candidate.title) score += 8  
  if (candidate.location) score += 9
  
  // Professional details (35 points)
  if (candidate.summary && candidate.summary.length > 30) score += 15
  if (candidate.skills && candidate.skills.length > 2) score += 12
  if (candidate.experience_years !== undefined) score += 8
  
  // Contact and links (25 points)
  if (candidate.email) score += 10
  if (candidate.github_username || candidate.linkedin_url || candidate.stackoverflow_id) score += 15
  
  // Enhanced data (15 points)
  if (candidate.perplexity_enriched) score += 8
  if (candidate.semantic_similarity) score += 7
  
  return Math.min(score, maxScore)
}
