
export interface AIProcessingConfig {
  enableScoring: boolean;
  enableValidation: boolean;
  enableSummarization: boolean;
  enablePerplexityEnrichment: boolean;
  scoringModel: string;
  summaryModel: string;
  gracefulDegradation: boolean;
}

export interface ProcessedCandidate {
  candidate: any;
  aiProcessingStatus: {
    scored: boolean;
    validated: boolean;
    summarized: boolean;
    perplexityEnriched: boolean;
    processingTime: number;
    errors: string[];
  };
}

export class AIProcessor {
  private openaiApiKey: string;
  private perplexityApiKey: string;
  private config: AIProcessingConfig;
  private circuitBreaker: Map<string, { failures: number; lastFailure: number; isOpen: boolean }>;

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
      gracefulDegradation: true,
      ...config
    };
    this.circuitBreaker = new Map();
  }

  async processCandidate(candidate: any, enhancedQuery: any, platform: string): Promise<ProcessedCandidate> {
    const startTime = Date.now();
    const aiProcessingStatus = {
      scored: false,
      validated: false,
      summarized: false,
      perplexityEnriched: false,
      processingTime: 0,
      errors: []
    };

    let processedCandidate = { ...candidate };

    // Early validation
    if (!candidate?.name) {
      console.log('⚠️ Invalid candidate data, skipping AI processing');
      return {
        candidate: this.applyDefaultScores(processedCandidate, platform),
        aiProcessingStatus: { ...aiProcessingStatus, processingTime: Date.now() - startTime }
      };
    }

    try {
      // Step 1: Enhanced Validation (with circuit breaker)
      if (this.config.enableValidation && this.isServiceAvailable('validation')) {
        try {
          const validation = await this.performValidation(processedCandidate, enhancedQuery, platform);
          if (validation) {
            processedCandidate = {
              ...processedCandidate,
              validation_result: validation,
              is_valid: validation.isValid,
              validation_confidence: validation.confidence,
              suggested_tier: validation.suggested_tier || 'bronze'
            };
            aiProcessingStatus.validated = true;
            this.recordSuccess('validation');
          }
        } catch (error) {
          this.recordFailure('validation');
          aiProcessingStatus.errors.push(`Validation: ${error.message}`);
          console.log(`⚠️ Validation failed for ${processedCandidate.name}: ${error.message}`);
        }
      }

      // Step 2: Enhanced Scoring (with circuit breaker)
      if (this.config.enableScoring && this.isServiceAvailable('scoring')) {
        try {
          const tier = processedCandidate.suggested_tier || 'bronze';
          const scored = await this.performScoring(processedCandidate, enhancedQuery, tier, platform);
          if (scored) {
            processedCandidate = { ...processedCandidate, ...scored };
            aiProcessingStatus.scored = true;
            this.recordSuccess('scoring');
          }
        } catch (error) {
          this.recordFailure('scoring');
          aiProcessingStatus.errors.push(`Scoring: ${error.message}`);
          console.log(`⚠️ Scoring failed for ${processedCandidate.name}: ${error.message}`);
          processedCandidate = this.applyDefaultScores(processedCandidate, platform);
        }
      } else {
        processedCandidate = this.applyDefaultScores(processedCandidate, platform);
      }

      // Step 3: Profile Summarization (with circuit breaker)
      if (this.config.enableSummarization && this.isServiceAvailable('summarization')) {
        try {
          const summary = await this.generateProfileSummary(processedCandidate, platform);
          if (summary) {
            processedCandidate = {
              ...processedCandidate,
              ai_summary: summary,
              summary_generated: true
            };
            aiProcessingStatus.summarized = true;
            this.recordSuccess('summarization');
          }
        } catch (error) {
          this.recordFailure('summarization');
          aiProcessingStatus.errors.push(`Summarization: ${error.message}`);
          console.log(`⚠️ Summarization failed for ${processedCandidate.name}: ${error.message}`);
          
          // Generate fallback summary
          processedCandidate.ai_summary = this.generateFallbackSummary(processedCandidate, platform);
          processedCandidate.summary_generated = false;
        }
      }

      // Step 4: Perplexity Enrichment (with circuit breaker)
      if (this.config.enablePerplexityEnrichment && this.perplexityApiKey && this.isServiceAvailable('perplexity')) {
        try {
          const enriched = await this.enrichWithPerplexity(processedCandidate);
          if (enriched) {
            processedCandidate = { ...processedCandidate, ...enriched };
            aiProcessingStatus.perplexityEnriched = true;
            this.recordSuccess('perplexity');
          }
        } catch (error) {
          this.recordFailure('perplexity');
          aiProcessingStatus.errors.push(`Perplexity: ${error.message}`);
          console.log(`⚠️ Perplexity enrichment failed for ${processedCandidate.name}: ${error.message}`);
        }
      }

    } catch (error) {
      console.error(`❌ AI processing failed for ${processedCandidate.name}:`, error);
      aiProcessingStatus.errors.push(`General: ${error.message}`);
    }

    aiProcessingStatus.processingTime = Date.now() - startTime;

    return {
      candidate: processedCandidate,
      aiProcessingStatus
    };
  }

  private isServiceAvailable(service: string): boolean {
    if (!this.openaiApiKey || this.openaiApiKey.trim() === '') {
      return false;
    }

    const breaker = this.circuitBreaker.get(service);
    if (!breaker) {
      this.circuitBreaker.set(service, { failures: 0, lastFailure: 0, isOpen: false });
      return true;
    }

    // Circuit breaker logic
    const now = Date.now();
    const resetTime = 60000; // 1 minute

    if (breaker.isOpen && (now - breaker.lastFailure) > resetTime) {
      breaker.isOpen = false;
      breaker.failures = 0;
    }

    return !breaker.isOpen;
  }

  private recordSuccess(service: string): void {
    const breaker = this.circuitBreaker.get(service);
    if (breaker) {
      breaker.failures = 0;
      breaker.isOpen = false;
    }
  }

  private recordFailure(service: string): void {
    let breaker = this.circuitBreaker.get(service);
    if (!breaker) {
      breaker = { failures: 0, lastFailure: 0, isOpen: false };
      this.circuitBreaker.set(service, breaker);
    }

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= 3) {
      breaker.isOpen = true;
      console.log(`🔴 Circuit breaker opened for ${service} service`);
    }
  }

  private async makeOpenAIRequest(messages: any[], options: any = {}): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.scoringModel,
          messages,
          temperature: 0.1,
          max_tokens: 500,
          ...options
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
      }

      // Validate content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from OpenAI');
      }

      const data = await response.json();
      
      if (!data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response structure from OpenAI');
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async performValidation(candidate: any, enhancedQuery: any, platform: string) {
    try {
      const data = await this.makeOpenAIRequest([
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
      ]);

      const content = data.choices[0].message.content;
      
      try {
        return JSON.parse(content.replace(/```json\s*|\s*```/g, ''));
      } catch (e) {
        console.error('Failed to parse validation JSON:', content);
        return {
          isValid: false,
          confidence: 0,
          reason: 'Validation parsing failed',
          suggested_tier: 'bronze'
        };
      }
    } catch (error) {
      throw new Error(`Validation failed: ${error.message}`);
    }
  }

  private async performScoring(candidate: any, enhancedQuery: any, tier: string, platform: string) {
    try {
      const data = await this.makeOpenAIRequest([
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
      ], { max_tokens: 400, temperature: 0.2 });

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
        console.error('Failed to parse scoring JSON:', content);
        return this.applyDefaultScores(candidate, platform);
      }
    } catch (error) {
      throw new Error(`Scoring failed: ${error.message}`);
    }
  }

  private async generateProfileSummary(candidate: any, platform: string): Promise<string> {
    try {
      const data = await this.makeOpenAIRequest([
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
      ], { max_tokens: 200, temperature: 0.3 });

      return data.choices[0].message.content || this.generateFallbackSummary(candidate, platform);
    } catch (error) {
      throw new Error(`Summary generation failed: ${error.message}`);
    }
  }

  private async enrichWithPerplexity(candidate: any) {
    if (!this.perplexityApiKey) return null;

    try {
      const searchQuery = this.buildPerplexityQuery(candidate);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      const enrichmentData = data.choices[0].message.content || '';
      
      return {
        ...candidate,
        perplexity_enrichment: enrichmentData,
        perplexity_enriched: true,
        last_enriched: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Perplexity enrichment failed: ${error.message}`);
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

  private generateFallbackSummary(candidate: any, platform: string): string {
    const parts = [];
    
    const name = candidate.name || 'Developer';
    parts.push(name);
    
    if (candidate.title) {
      parts.push(`is a ${candidate.title}`);
    } else {
      parts.push('is a professional developer');
    }
    
    if (candidate.experience_years && candidate.experience_years > 0) {
      parts.push(`with ${candidate.experience_years} years of experience`);
    }
    
    if (candidate.location) {
      parts.push(`based in ${candidate.location}`);
    }
    
    if (candidate.skills && candidate.skills.length > 0) {
      const topSkills = candidate.skills.slice(0, 3).join(', ');
      parts.push(`Skilled in ${topSkills}`);
    }

    parts.push(`Found on ${platform}`);
    
    return parts.join(' ') + '.';
  }
}
