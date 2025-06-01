
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
    const summaryConfig = { ...this.defaultConfig, ...config };

    try {
      const systemPrompt = this.buildSystemPrompt(platform, summaryConfig);
      const userPrompt = this.buildUserPrompt(candidate, summaryConfig);

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
          max_tokens: Math.ceil(summaryConfig.maxLength * 1.5)
        }),
      });

      const data = await response.json();
      let summary = data.choices[0].message.content || '';

      // Clean and validate summary
      summary = this.cleanSummary(summary, summaryConfig);
      
      return summary;
    } catch (error) {
      console.error('Summary generation error:', error);
      return this.generateFallbackSummary(candidate, platform);
    }
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
    
    if (candidate.title) {
      parts.push(candidate.title);
    }
    
    if (candidate.experience_years) {
      parts.push(`with ${candidate.experience_years} years of experience`);
    }
    
    if (candidate.location) {
      parts.push(`based in ${candidate.location}`);
    }
    
    if (candidate.skills && candidate.skills.length > 0) {
      const topSkills = candidate.skills.slice(0, 3).join(', ');
      parts.push(`skilled in ${topSkills}`);
    }

    const summary = parts.join(' ') || `Professional developer found on ${platform}`;
    return `${candidate.name || 'Developer'} is a ${summary}.`;
  }

  async generateBulkSummaries(candidates: any[], platform: string, config?: Partial<SummaryConfig>): Promise<any[]> {
    const results = [];
    
    for (const candidate of candidates) {
      try {
        const summary = await this.generateSummary(candidate, platform, config);
        results.push({
          ...candidate,
          ai_summary: summary,
          summary_generated: true,
          summary_timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Summary generation failed for ${candidate.name}:`, error);
        results.push({
          ...candidate,
          summary_generated: false
        });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
}
