
import { ParsedQuery } from '../core/QueryParser';

export interface EnhancedQuery extends ParsedQuery {
  intent: {
    urgency: 'low' | 'medium' | 'high';
    roleLevel: 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
    cultureFit: string[];
    teamSize: 'small' | 'medium' | 'large' | 'enterprise';
    workStyle: 'remote' | 'hybrid' | 'onsite' | 'flexible';
  };
  expandedSkills: string[];
  relatedTechnologies: string[];
  contextualKeywords: string[];
  searchStrategy: 'broad' | 'targeted' | 'specialized';
  aiConfidence: number;
}

export class AIQueryProcessor {
  private openaiApiKey: string;

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
  }

  async enhanceQuery(query: string): Promise<EnhancedQuery> {
    try {
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
              content: `You are an expert technical recruiter AI. Analyze hiring queries and extract comprehensive hiring intelligence.

Parse the query and return ONLY valid JSON with this exact structure:
{
  "originalQuery": "original query text",
  "skills": ["core technical skills array"],
  "roles": ["job titles/roles array"],
  "location": "primary location or null",
  "seniority": "experience level",
  "interpretation": "human-readable interpretation",
  "confidence": 85,
  "intent": {
    "urgency": "low|medium|high",
    "roleLevel": "junior|mid|senior|lead|executive", 
    "cultureFit": ["startup", "enterprise", "remote-first"],
    "teamSize": "small|medium|large|enterprise",
    "workStyle": "remote|hybrid|onsite|flexible"
  },
  "expandedSkills": ["skill variations and synonyms"],
  "relatedTechnologies": ["complementary technologies"],
  "contextualKeywords": ["search optimization keywords"],
  "searchStrategy": "broad|targeted|specialized",
  "aiConfidence": 90
}`
            },
            {
              role: 'user',
              content: `Analyze this hiring query: "${query}"`
            }
          ],
          temperature: 0.2,
          max_tokens: 800
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(content);
        return this.validateEnhancedQuery(parsed);
      } catch (parseError) {
        console.error('Failed to parse AI response:', content);
        return this.getFallbackQuery(query);
      }
    } catch (error) {
      console.error('AI query enhancement failed:', error);
      return this.getFallbackQuery(query);
    }
  }

  private validateEnhancedQuery(parsed: any): EnhancedQuery {
    return {
      originalQuery: parsed.originalQuery || '',
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      roles: Array.isArray(parsed.roles) ? parsed.roles : [],
      location: parsed.location || undefined,
      seniority: parsed.seniority || undefined,
      interpretation: parsed.interpretation || 'AI-enhanced search query',
      confidence: Math.min(Math.max(parsed.confidence || 50, 0), 100),
      intent: {
        urgency: ['low', 'medium', 'high'].includes(parsed.intent?.urgency) ? parsed.intent.urgency : 'medium',
        roleLevel: ['junior', 'mid', 'senior', 'lead', 'executive'].includes(parsed.intent?.roleLevel) ? parsed.intent.roleLevel : 'mid',
        cultureFit: Array.isArray(parsed.intent?.cultureFit) ? parsed.intent.cultureFit : [],
        teamSize: ['small', 'medium', 'large', 'enterprise'].includes(parsed.intent?.teamSize) ? parsed.intent.teamSize : 'medium',
        workStyle: ['remote', 'hybrid', 'onsite', 'flexible'].includes(parsed.intent?.workStyle) ? parsed.intent.workStyle : 'flexible'
      },
      expandedSkills: Array.isArray(parsed.expandedSkills) ? parsed.expandedSkills : [],
      relatedTechnologies: Array.isArray(parsed.relatedTechnologies) ? parsed.relatedTechnologies : [],
      contextualKeywords: Array.isArray(parsed.contextualKeywords) ? parsed.contextualKeywords : [],
      searchStrategy: ['broad', 'targeted', 'specialized'].includes(parsed.searchStrategy) ? parsed.searchStrategy : 'targeted',
      aiConfidence: Math.min(Math.max(parsed.aiConfidence || 70, 0), 100)
    };
  }

  private getFallbackQuery(query: string): EnhancedQuery {
    return {
      originalQuery: query,
      skills: [],
      roles: [],
      location: undefined,
      seniority: undefined,
      interpretation: 'Fallback parsing - AI enhancement unavailable',
      confidence: 30,
      intent: {
        urgency: 'medium',
        roleLevel: 'mid',
        cultureFit: [],
        teamSize: 'medium',
        workStyle: 'flexible'
      },
      expandedSkills: [],
      relatedTechnologies: [],
      contextualKeywords: [],
      searchStrategy: 'broad',
      aiConfidence: 30
    };
  }
}
