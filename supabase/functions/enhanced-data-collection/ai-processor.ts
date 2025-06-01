
export interface AIProcessingConfig {
  enableScoring: boolean;
  enableValidation: boolean;
  enableSummarization: boolean;
  enablePerplexityEnrichment: boolean;
  scoringModel: string;
  summaryModel: string;
}

export interface ProcessedCandidate {
  candidate: any;
  aiProcessingStatus: {
    scored: boolean;
    validated: boolean;
    summarized: boolean;
    perplexityEnriched: boolean;
    processingTime: number;
  };
}

export class AIProcessor {
  private openaiApiKey: string;
  private perplexityApiKey: string;
  private config: AIProcessingConfig;

  constructor(openaiApiKey: string, perplexityApiKey: string, config: AIProcessingConfig) {
    this.openaiApiKey = openaiApiKey;
    this.perplexityApiKey = perplexityApiKey;
    this.config = {
      enableScoring: true,
      enableValidation: true,
      enableSummarization: true,
      enablePerplexityEnrichment: true,
      scoringModel: 'gpt-4o-mini',
      summaryModel: 'gpt-4o-mini',
      ...config
    };
  }

  async processCandidate(candidate: any, enhancedQuery: any, platform: string): Promise<ProcessedCandidate> {
    const startTime = Date.now();
    const aiProcessingStatus = {
      scored: false,
      validated: false,
      summarized: false,
      perplexityEnriched: false,
      processingTime: 0
    };

    let processedCandidate = { ...candidate };

    try {
      // Step 1: Enhanced Validation
      if (this.config.enableValidation && this.openaiApiKey) {
        try {
          const validation = await this.performValidation(processedCandidate, enhancedQuery, platform);
          processedCandidate = {
            ...processedCandidate,
            validation_result: validation,
            is_valid: validation.isValid,
            validation_confidence: validation.confidence,
            suggested_tier: validation.suggested_tier || 'bronze'
          };
          aiProcessingStatus.validated = true;
        } catch (error) {
          console.log(`⚠️ Validation failed for ${processedCandidate.name}: ${error.message}`);
        }
      }

      // Step 2: Enhanced Scoring
      if (this.config.enableScoring && this.openaiApiKey) {
        try {
          const tier = processedCandidate.suggested_tier || 'bronze';
          const scored = await this.performScoring(processedCandidate, enhancedQuery, tier, platform);
          processedCandidate = { ...processedCandidate, ...scored };
          aiProcessingStatus.scored = true;
        } catch (error) {
          console.log(`⚠️ Scoring failed for ${processedCandidate.name}: ${error.message}`);
          processedCandidate = this.applyDefaultScores(processedCandidate, platform);
        }
      }

      // Step 3: Profile Summarization
      if (this.config.enableSummarization && this.openaiApiKey) {
        try {
          const summary = await this.generateProfileSummary(processedCandidate, platform);
          processedCandidate = {
            ...processedCandidate,
            ai_summary: summary,
            summary_generated: true
          };
          aiProcessingStatus.summarized = true;
        } catch (error) {
          console.log(`⚠️ Summarization failed for ${processedCandidate.name}: ${error.message}`);
        }
      }

      // Step 4: Perplexity Enrichment
      if (this.config.enablePerplexityEnrichment && this.perplexityApiKey) {
        try {
          const enriched = await this.enrichWithPerplexity(processedCandidate);
          processedCandidate = { ...processedCandidate, ...enriched };
          aiProcessingStatus.perplexityEnriched = true;
        } catch (error) {
          console.log(`⚠️ Perplexity enrichment failed for ${processedCandidate.name}: ${error.message}`);
        }
      }

    } catch (error) {
      console.error(`❌ AI processing failed for ${processedCandidate.name}:`, error);
    }

    aiProcessingStatus.processingTime = Date.now() - startTime;

    return {
      candidate: processedCandidate,
      aiProcessingStatus
    };
  }

  private async performValidation(candidate: any, enhancedQuery: any, platform: string) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.scoringModel,
        messages: [
          {
            role: 'system',
            content: `You are a technical recruiter validator for ${platform}. Validate candidates with platform-specific criteria and return JSON only.

VALIDATION CRITERIA:
- basic_authenticity: Real person with professional presence (0.0-1.0)
- technical_relevance: Technical skills match (0.0-1.0)  
- profile_quality: Information completeness (0.0-1.0)
- platform_activity: Recent meaningful activity (0.0-1.0)

Return ONLY JSON:
{
  "isValid": boolean,
  "confidence": 0.0-1.0,
  "reason": "brief explanation",
  "basic_authenticity": 0.0-1.0,
  "technical_relevance": 0.0-1.0,
  "profile_quality": 0.0-1.0,
  "platform_activity": 0.0-1.0,
  "suggested_tier": "bronze|silver|gold"
}`
          },
          {
            role: 'user',
            content: `Platform: ${platform}
Query: ${JSON.stringify(enhancedQuery)}
Candidate: ${JSON.stringify({
              name: candidate.name,
              title: candidate.title,
              summary: candidate.summary,
              skills: candidate.skills,
              location: candidate.location
            })}`
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      return JSON.parse(content.replace(/```json\s*|\s*```/g, ''));
    } catch (e) {
      return {
        isValid: false,
        confidence: 0,
        reason: 'Validation parsing failed',
        suggested_tier: 'bronze'
      };
    }
  }

  private async performScoring(candidate: any, enhancedQuery: any, tier: string, platform: string) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.scoringModel,
        messages: [
          {
            role: 'system',
            content: `You are an enhanced candidate scorer for ${platform} with ${tier} tier expectations.

Score each area 0-100:
- overall_score: Holistic assessment
- skill_match: Technical alignment  
- experience: Experience appropriateness
- reputation: Professional credibility
- freshness: Recent activity
- social_proof: Community presence

Return ONLY JSON:
{
  "overall_score": integer,
  "skill_match": integer,
  "experience": integer,
  "reputation": integer,
  "freshness": integer,
  "social_proof": integer,
  "platform_bonus": 0-15,
  "tier_justification": "explanation"
}`
          },
          {
            role: 'user',
            content: `Platform: ${platform}
Tier: ${tier}
Requirements: ${JSON.stringify(enhancedQuery)}
Candidate: ${JSON.stringify(candidate)}`
          }
        ],
        temperature: 0.2,
        max_tokens: 400
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const scores = JSON.parse(content.replace(/```json\s*|\s*```/g, ''));
      return {
        overall_score: Math.round(scores.overall_score || 50),
        skill_match: Math.round(scores.skill_match || 50),
        experience: Math.round(scores.experience || 50),
        reputation: Math.round(scores.reputation || 50),
        freshness: Math.round(scores.freshness || 50),
        social_proof: Math.round(scores.social_proof || 50),
        platform_bonus: Math.round(scores.platform_bonus || 0),
        tier_justification: scores.tier_justification || `${tier} tier candidate`,
        ai_scored: true,
        scoring_timestamp: new Date().toISOString()
      };
    } catch (e) {
      return this.applyDefaultScores(candidate, platform);
    }
  }

  private async generateProfileSummary(candidate: any, platform: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.summaryModel,
        messages: [
          {
            role: 'system',
            content: `Create a concise professional summary for this ${platform} candidate. Focus on key skills, experience, and professional highlights. Keep it under 150 words and professional tone.`
          },
          {
            role: 'user',
            content: `Create a summary for: ${JSON.stringify({
              name: candidate.name,
              title: candidate.title,
              summary: candidate.summary,
              skills: candidate.skills,
              experience_years: candidate.experience_years,
              location: candidate.location
            })}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content || 'Professional summary not available.';
  }

  private async enrichWithPerplexity(candidate: any) {
    if (!this.perplexityApiKey) return candidate;

    try {
      const searchQuery = this.buildPerplexityQuery(candidate);
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: 'Find recent professional information about this developer. Focus on current employment, recent projects, and achievements. Be concise and factual.'
            },
            {
              role: 'user',
              content: searchQuery
            }
          ],
          temperature: 0.2,
          max_tokens: 400
        }),
      });

      const data = await response.json();
      const enrichmentData = data.choices[0].message.content || '';
      
      return {
        ...candidate,
        perplexity_enrichment: enrichmentData,
        perplexity_enriched: true,
        last_enriched: new Date().toISOString()
      };
    } catch (error) {
      console.error('Perplexity enrichment error:', error);
      return { ...candidate, perplexity_enriched: false };
    }
  }

  private buildPerplexityQuery(candidate: any): string {
    const searchTerms = [
      candidate.name,
      candidate.github_username,
      candidate.title,
      'developer'
    ].filter(Boolean);

    return `Find recent professional information about: ${searchTerms.join(' ')}`;
  }

  private applyDefaultScores(candidate: any, platform: string) {
    const platformBonus = ['github', 'stackoverflow'].includes(platform) ? 5 : 0;
    const baseScore = 50 + platformBonus;

    return {
      ...candidate,
      overall_score: baseScore,
      skill_match: baseScore,
      experience: baseScore,
      reputation: baseScore,
      freshness: baseScore,
      social_proof: baseScore,
      ai_scored: false,
      scoring_timestamp: new Date().toISOString()
    };
  }
}
