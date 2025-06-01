
export interface SummaryConfig {
  maxLength: number;
  includeSkills: boolean;
  includeExperience: boolean;
  includeLocation: boolean;
  tone: 'professional' | 'casual' | 'technical';
}

export class ProfileSummarizer {
  private openaiApiKey: string;
  private defaultConfig: SummaryConfig;
  private retryCount: number = 0;
  private maxRetries: number = 2;

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
    this.defaultConfig = {
      maxLength: 150,
      includeSkills: true,
      includeExperience: true,
      includeLocation: true,
      tone: 'professional'
    };
  }

  async generateSummary(candidate: any, platform: string, config?: Partial<SummaryConfig>): Promise<string> {
    // Early validation
    if (!this.openaiApiKey || this.openaiApiKey.trim() === '') {
      console.log('⚠️ OpenAI API key not available, using fallback summary');
      return this.generateFallbackSummary(candidate, platform);
    }

    if (!candidate?.name) {
      console.log('⚠️ Invalid candidate data, using fallback summary');
      return this.generateFallbackSummary(candidate, platform);
    }

    const summaryConfig = { ...this.defaultConfig, ...config };

    try {
      return await this.generateAISummary(candidate, platform, summaryConfig);
    } catch (error) {
      console.error('❌ AI summary generation failed:', error);
      return this.generateFallbackSummary(candidate, platform);
    }
  }

  private async generateAISummary(candidate: any, platform: string, config: SummaryConfig): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(platform, config);
    const userPrompt = this.buildUserPrompt(candidate, config);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🤖 Generating AI summary (attempt ${attempt + 1}/${this.maxRetries + 1})...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: Math.ceil(config.maxLength * 1.5)
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Check if response is successful
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`OpenAI API error ${response.status}:`, errorText);
          
          if (response.status === 429) {
            // Rate limit - wait before retry
            await this.sleep(Math.pow(2, attempt) * 1000);
            continue;
          }
          
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        // Validate response content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('❌ OpenAI returned non-JSON response:', contentType);
          throw new Error('Invalid response format from OpenAI');
        }

        const data = await response.json();
        
        // Validate response structure
        if (!data?.choices?.[0]?.message?.content) {
          console.error('❌ Invalid OpenAI response structure:', data);
          throw new Error('Invalid response structure from OpenAI');
        }

        let summary = data.choices[0].message.content || '';
        summary = this.cleanSummary(summary, config);
        
        console.log('✅ AI summary generated successfully');
        return summary;

      } catch (error) {
        console.error(`❌ AI summary attempt ${attempt + 1} failed:`, error);
        
        if (attempt === this.maxRetries) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }

    throw new Error('All AI summary attempts failed');
  }

  private buildSystemPrompt(platform: string, config: SummaryConfig): string {
    const toneInstructions = {
      professional: 'Use formal, professional language suitable for recruitment',
      casual: 'Use conversational, approachable language',
      technical: 'Focus on technical details and use industry terminology'
    };

    return `Create a ${config.tone} summary for a ${platform} candidate profile. 
    
    Requirements:
    - Maximum ${config.maxLength} words
    - ${toneInstructions[config.tone]}
    - Focus on key professional highlights
    - ${config.includeSkills ? 'Include relevant skills' : 'Minimize skill details'}
    - ${config.includeExperience ? 'Highlight experience level' : 'Focus on current role'}
    - ${config.includeLocation ? 'Mention location if relevant' : 'Omit location details'}
    
    Return only the summary text, no explanations or formatting.`;
  }

  private buildUserPrompt(candidate: any, config: SummaryConfig): string {
    const candidateData = {
      name: candidate.name,
      title: candidate.title,
      summary: candidate.summary,
      experience_years: candidate.experience_years,
      location: config.includeLocation ? candidate.location : undefined,
      skills: config.includeSkills ? candidate.skills : undefined
    };

    return `Generate a professional summary for: ${JSON.stringify(candidateData)}`;
  }

  private cleanSummary(summary: string, config: SummaryConfig): string {
    // Remove quotes and formatting artifacts
    summary = summary.replace(/^["']|["']$/g, '').trim();
    
    // Truncate if too long
    const words = summary.split(' ');
    if (words.length > config.maxLength) {
      summary = words.slice(0, config.maxLength).join(' ') + '...';
    }

    return summary;
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateBulkSummaries(candidates: any[], platform: string, config?: Partial<SummaryConfig>): Promise<any[]> {
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    console.log(`📝 Starting bulk summary generation for ${candidates.length} candidates`);
    
    for (const candidate of candidates) {
      try {
        const summary = await this.generateSummary(candidate, platform, config);
        results.push({
          ...candidate,
          ai_summary: summary,
          summary_generated: true,
          summary_timestamp: new Date().toISOString()
        });
        successCount++;
      } catch (error) {
        console.error(`Summary generation failed for ${candidate.name}:`, error);
        results.push({
          ...candidate,
          summary_generated: false,
          ai_summary: this.generateFallbackSummary(candidate, platform)
        });
        failureCount++;
      }
      
      // Small delay to avoid rate limiting
      await this.sleep(200);
    }
    
    console.log(`📊 Bulk summary completed: ${successCount} success, ${failureCount} fallbacks`);
    return results;
  }
}
