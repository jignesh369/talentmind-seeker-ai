
import { AICandidateScorer, AIScoreBreakdown } from './AICandidateScorer';
import { ComplexQueryAnalysis } from './EnhancedQueryProcessor';
import { CompanyIntelligence, CompanyProfile } from './CompanyIntelligence';

export interface EnhancedScoreBreakdown extends AIScoreBreakdown {
  openSourceScore: number;
  aiExpertiseScore: number;
  startupFitScore: number;
  demographicFitScore: number;
  locationMatchScore: number;
  detailedAnalysis: {
    openSourceContributions: {
      level: 'none' | 'casual' | 'regular' | 'maintainer' | 'creator';
      evidence: string[];
      score: number;
    };
    aiExpertise: {
      specializations: string[];
      experienceLevel: 'beginner' | 'intermediate' | 'expert' | 'researcher';
      evidence: string[];
      score: number;
    };
    startupReadiness: {
      indicators: string[];
      riskFactors: string[];
      score: number;
    };
    cultureAlignment: {
      workStyle: string[];
      values: string[];
      score: number;
    };
  };
}

export class EnhancedCandidateScorer extends AICandidateScorer {
  private companyIntelligence: CompanyIntelligence;

  constructor(openaiApiKey: string) {
    super(openaiApiKey);
    this.companyIntelligence = new CompanyIntelligence(openaiApiKey);
  }

  async scoreWithComplexQuery(
    candidate: any, 
    queryAnalysis: ComplexQueryAnalysis,
    searchQuery: any
  ): Promise<EnhancedScoreBreakdown> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert technical recruiter AI specializing in complex candidate evaluation.

Analyze this candidate against the specific search criteria and return a comprehensive assessment.

Focus on:
1. Open Source Contributions (analyze GitHub activity, projects, community involvement)
2. AI/ML Expertise (specializations, depth, practical experience)
3. Startup Ecosystem Fit (adaptability, growth mindset, risk tolerance)
4. Demographic Alignment (experience level, career stage)
5. Location and Cultural Fit

Return ONLY valid JSON:
{
  "overallScore": 85,
  "tier": "A",
  "technicalFit": 90,
  "experienceLevel": 85,
  "riskAssessment": "low",
  "openSourceScore": 80,
  "aiExpertiseScore": 90,
  "startupFitScore": 85,
  "demographicFitScore": 80,
  "locationMatchScore": 95,
  "reasoning": "detailed explanation",
  "strengths": ["strength1", "strength2"],
  "concerns": ["concern1"],
  "detailedAnalysis": {
    "openSourceContributions": {
      "level": "regular",
      "evidence": ["maintains 3 popular repos", "500+ GitHub stars"],
      "score": 80
    },
    "aiExpertise": {
      "specializations": ["machine learning", "computer vision"],
      "experienceLevel": "expert",
      "evidence": ["3 years ML experience", "published papers"],
      "score": 90
    },
    "startupReadiness": {
      "indicators": ["fast learner", "adaptable"],
      "riskFactors": ["no startup experience"],
      "score": 75
    },
    "cultureAlignment": {
      "workStyle": ["collaborative", "innovative"],
      "values": ["growth-oriented", "technical excellence"],
      "score": 85
    }
  }
}`
            },
            {
              role: 'user',
              content: `Evaluate candidate against search criteria:

CANDIDATE:
Name: ${candidate.name}
Skills: ${JSON.stringify(candidate.skills || [])}
Experience: ${candidate.experience_years || 0} years
Location: ${candidate.location || 'Unknown'}
GitHub: ${candidate.github_username || 'None'}
Current Company: ${candidate.company || 'Unknown'}
Summary: ${candidate.summary || 'No summary'}

SEARCH CRITERIA:
${JSON.stringify(queryAnalysis, null, 2)}

ORIGINAL QUERY: "${searchQuery.query || searchQuery}"`
            }
          ],
          temperature: 0.2,
          max_tokens: 1200
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(content);
        return this.validateEnhancedScore(parsed);
      } catch (parseError) {
        console.error('Failed to parse enhanced scoring:', content);
        return this.getFallbackEnhancedScore();
      }
    } catch (error) {
      console.error('Enhanced candidate scoring failed:', error);
      return this.getFallbackEnhancedScore();
    }
  }

  private validateEnhancedScore(parsed: any): EnhancedScoreBreakdown {
    return {
      overallScore: Math.min(Math.max(parsed.overallScore || 50, 0), 100),
      tier: ['A', 'B', 'C', 'D'].includes(parsed.tier) ? parsed.tier : 'C',
      technicalFit: Math.min(Math.max(parsed.technicalFit || 50, 0), 100),
      experienceLevel: Math.min(Math.max(parsed.experienceLevel || 50, 0), 100),
      riskAssessment: ['low', 'medium', 'high'].includes(parsed.riskAssessment) ? parsed.riskAssessment : 'medium',
      openSourceScore: Math.min(Math.max(parsed.openSourceScore || 0, 0), 100),
      aiExpertiseScore: Math.min(Math.max(parsed.aiExpertiseScore || 0, 0), 100),
      startupFitScore: Math.min(Math.max(parsed.startupFitScore || 50, 0), 100),
      demographicFitScore: Math.min(Math.max(parsed.demographicFitScore || 50, 0), 100),
      locationMatchScore: Math.min(Math.max(parsed.locationMatchScore || 50, 0), 100),
      reasoning: parsed.reasoning || 'AI analysis completed',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
      detailedAnalysis: {
        openSourceContributions: {
          level: ['none', 'casual', 'regular', 'maintainer', 'creator'].includes(parsed.detailedAnalysis?.openSourceContributions?.level)
            ? parsed.detailedAnalysis.openSourceContributions.level : 'none',
          evidence: Array.isArray(parsed.detailedAnalysis?.openSourceContributions?.evidence) 
            ? parsed.detailedAnalysis.openSourceContributions.evidence : [],
          score: Math.min(Math.max(parsed.detailedAnalysis?.openSourceContributions?.score || 0, 0), 100)
        },
        aiExpertise: {
          specializations: Array.isArray(parsed.detailedAnalysis?.aiExpertise?.specializations) 
            ? parsed.detailedAnalysis.aiExpertise.specializations : [],
          experienceLevel: ['beginner', 'intermediate', 'expert', 'researcher'].includes(parsed.detailedAnalysis?.aiExpertise?.experienceLevel)
            ? parsed.detailedAnalysis.aiExpertise.experienceLevel : 'intermediate',
          evidence: Array.isArray(parsed.detailedAnalysis?.aiExpertise?.evidence) 
            ? parsed.detailedAnalysis.aiExpertise.evidence : [],
          score: Math.min(Math.max(parsed.detailedAnalysis?.aiExpertise?.score || 0, 0), 100)
        },
        startupReadiness: {
          indicators: Array.isArray(parsed.detailedAnalysis?.startupReadiness?.indicators) 
            ? parsed.detailedAnalysis.startupReadiness.indicators : [],
          riskFactors: Array.isArray(parsed.detailedAnalysis?.startupReadiness?.riskFactors) 
            ? parsed.detailedAnalysis.startupReadiness.riskFactors : [],
          score: Math.min(Math.max(parsed.detailedAnalysis?.startupReadiness?.score || 50, 0), 100)
        },
        cultureAlignment: {
          workStyle: Array.isArray(parsed.detailedAnalysis?.cultureAlignment?.workStyle) 
            ? parsed.detailedAnalysis.cultureAlignment.workStyle : [],
          values: Array.isArray(parsed.detailedAnalysis?.cultureAlignment?.values) 
            ? parsed.detailedAnalysis.cultureAlignment.values : [],
          score: Math.min(Math.max(parsed.detailedAnalysis?.cultureAlignment?.score || 50, 0), 100)
        }
      }
    };
  }

  private getFallbackEnhancedScore(): EnhancedScoreBreakdown {
    return {
      overallScore: 50,
      tier: 'C',
      technicalFit: 50,
      experienceLevel: 50,
      riskAssessment: 'medium',
      openSourceScore: 0,
      aiExpertiseScore: 0,
      startupFitScore: 50,
      demographicFitScore: 50,
      locationMatchScore: 50,
      reasoning: 'Fallback scoring due to AI analysis failure',
      strengths: [],
      concerns: ['Unable to perform detailed AI analysis'],
      detailedAnalysis: {
        openSourceContributions: {
          level: 'none',
          evidence: [],
          score: 0
        },
        aiExpertise: {
          specializations: [],
          experienceLevel: 'intermediate',
          evidence: [],
          score: 0
        },
        startupReadiness: {
          indicators: [],
          riskFactors: [],
          score: 50
        },
        cultureAlignment: {
          workStyle: [],
          values: [],
          score: 50
        }
      }
    };
  }
}
