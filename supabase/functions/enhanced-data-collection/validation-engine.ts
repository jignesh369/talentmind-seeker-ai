
import { extractJSON } from './query-enhancement.ts'

export async function performEnhancedValidation(candidate: any, enhancedQuery: any, platform: string, openaiApiKey: string) {
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
            content: `You are an enhanced technical recruiter validator specialized in ${platform} profiles. Perform platform-aware validation with enhanced criteria.

            ENHANCED VALIDATION CRITERIA for ${platform.toUpperCase()}:
            1. BASIC_AUTHENTICITY: Real person with professional presence (0.2+ = pass)
            2. TECHNICAL_RELEVANCE: Technical skills and experience (0.3+ = pass) 
            3. PROFILE_QUALITY: Information depth and completeness (0.3+ = pass)
            4. PLATFORM_ACTIVITY: Recent and meaningful activity (0.2+ = pass)
            
            PLATFORM-SPECIFIC BONUSES:
            - GitHub: Repository quality, language expertise, README emails
            - Stack Overflow: Answer quality, reputation, expertise scores
            - LinkedIn: Professional completeness, cross-platform correlation
            
            Enhanced TIER CLASSIFICATION:
            - Bronze: Basic validation passed, shows promise (lower bar for emerging talent)
            - Silver: Good validation scores, solid professional profile
            - Gold: Excellent validation, comprehensive expertise demonstration
            
            Return ONLY a JSON object:
            {
              "isValid": boolean,
              "confidence": 0.0-1.0,
              "reason": "brief explanation",
              "basic_authenticity": 0.0-1.0,
              "technical_relevance": 0.0-1.0,
              "profile_quality": 0.0-1.0,
              "platform_activity": 0.0-1.0,
              "suggested_tier": "bronze|silver|gold",
              "platform_specific_bonus": 0.0-0.2,
              "strengths": ["key positives"],
              "enhancement_potential": ["growth areas"]
            }`
          },
          {
            role: 'user',
            content: `Platform: ${platform}
            Search criteria: ${JSON.stringify(enhancedQuery)}
            
            Candidate profile:
            Name: ${candidate.name}
            Title: ${candidate.title || 'N/A'}
            Summary: ${candidate.summary || 'N/A'}
            Skills: ${JSON.stringify(candidate.skills || [])}
            Experience: ${candidate.experience_years || 'N/A'} years
            Location: ${candidate.location || 'N/A'}
            
            Platform-specific data:
            ${platform === 'github' ? `Repositories: ${candidate.github_username ? 'Yes' : 'No'}, README email: ${candidate.readme_email_found ? 'Found' : 'Not found'}` : ''}
            ${platform === 'stackoverflow' ? `Reputation: ${candidate.reputation || 'N/A'}, Expertise score: ${candidate.expertise_score || 'N/A'}` : ''}
            ${platform === 'linkedin' ? `Cross-platform match: ${candidate.cross_platform_match ? 'Yes' : 'No'}, Discovery method: ${candidate.discovery_method || 'N/A'}` : ''}
            `
          }
        ],
        temperature: 0.1
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    const result = extractJSON(content)
    
    return result || { isValid: false, confidence: 0, reason: 'Enhanced validation failed', suggested_tier: 'bronze' }
  } catch (error) {
    console.error('Error in enhanced validation:', error)
    return { isValid: false, confidence: 0, reason: 'Enhanced validation error', suggested_tier: 'bronze' }
  }
}

export function calculateEnhancedCandidateTier(validationResult: any, platform: string): string {
  let baseScore = (
    validationResult.basic_authenticity + 
    validationResult.technical_relevance + 
    validationResult.profile_quality + 
    validationResult.platform_activity
  ) / 4
  
  // Add platform-specific bonus
  baseScore += (validationResult.platform_specific_bonus || 0)
  
  // Platform-specific adjustments
  if (platform === 'github' && baseScore >= 0.6) return 'gold'
  if (platform === 'stackoverflow' && baseScore >= 0.65) return 'gold'
  if (platform === 'linkedin' && baseScore >= 0.7) return 'gold'
  
  if (baseScore >= 0.6) return 'gold'
  if (baseScore >= 0.45) return 'silver'
  return 'bronze'
}
