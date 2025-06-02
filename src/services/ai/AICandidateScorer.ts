
export interface AIScoreBreakdown {
  technicalFit: number;
  experienceLevel: number;
  culturalAlignment: number;
  riskAssessment: number;
  communicationQuality: number;
  projectConsistency: number;
  overallScore: number;
  tier: 'A' | 'B' | 'C' | 'D';
  confidence: number;
  reasoning: string;
  strengths: string[];
  concerns: string[];
  recommendedActions: string[];
}

export interface CandidateProfile {
  name: string;
  title?: string;
  summary?: string;
  skills: string[];
  experience_years?: number;
  location?: string;
  github_username?: string;
  linkedin_url?: string;
  projects?: any[];
  repositories?: any[];
  platform: string;
}

export class AICandidateScorer {
  private openaiApiKey: string;

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
  }

  async scoreCandidate(
    candidate: CandidateProfile, 
    searchQuery: any, 
    context?: any
  ): Promise<AIScoreBreakdown> {
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
              content: `You are an expert technical recruiter AI that evaluates candidates holistically.

Analyze the candidate against the search requirements and return ONLY valid JSON:
{
  "technicalFit": 85,
  "experienceLevel": 75,
  "culturalAlignment": 80,
  "riskAssessment": 90,
  "communicationQuality": 70,
  "projectConsistency": 85,
  "overallScore": 82,
  "tier": "A",
  "confidence": 88,
  "reasoning": "Strong technical fit with relevant experience...",
  "strengths": ["Technical expertise", "Active in community"],
  "concerns": ["Limited recent activity", "Profile gaps"],
  "recommendedActions": ["Technical interview", "Portfolio review"]
}

Scoring (0-100):
- technicalFit: How well skills match requirements
- experienceLevel: Appropriate experience for role level
- culturalAlignment: Fit with company culture/work style  
- riskAssessment: Reliability and stability indicators (higher = lower risk)
- communicationQuality: Public communication/documentation quality
- projectConsistency: Consistency in project contributions

Tiers: A (80-100), B (60-79), C (40-59), D (<40)`
            },
            {
              role: 'user',
              content: `Search Requirements: ${JSON.stringify(searchQuery)}

Candidate Profile:
Name: ${candidate.name}
Title: ${candidate.title || 'Not specified'}
Platform: ${candidate.platform}
Skills: ${candidate.skills?.join(', ') || 'None listed'}
Experience: ${candidate.experience_years || 0} years
Location: ${candidate.location || 'Not specified'}
Summary: ${candidate.summary || 'No summary available'}
GitHub: ${candidate.github_username || 'Not provided'}
LinkedIn: ${candidate.linkedin_url ? 'Available' : 'Not provided'}

Additional Context: ${JSON.stringify(context || {})}`
            }
          ],
          temperature: 0.1,
          max_tokens: 600
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(content);
        return this.validateScoreBreakdown(parsed);
      } catch (parseError) {
        console.error('Failed to parse AI scoring response:', content);
        return this.getFallbackScoring(candidate);
      }
    } catch (error) {
      console.error('AI candidate scoring failed:', error);
      return this.getFallbackScoring(candidate);
    }
  }

  private validateScoreBreakdown(parsed: any): AIScoreBreakdown {
    const normalizeScore = (score: any): number => {
      const num = typeof score === 'number' ? score : parseInt(score) || 50;
      return Math.min(Math.max(num, 0), 100);
    };

    const tier = this.calculateTier(normalizeScore(parsed.overallScore));

    return {
      technicalFit: normalizeScore(parsed.technicalFit),
      experienceLevel: normalizeScore(parsed.experienceLevel),
      culturalAlignment: normalizeScore(parsed.culturalAlignment),
      riskAssessment: normalizeScore(parsed.riskAssessment),
      communicationQuality: normalizeScore(parsed.communicationQuality),
      projectConsistency: normalizeScore(parsed.projectConsistency),
      overallScore: normalizeScore(parsed.overallScore),
      tier,
      confidence: normalizeScore(parsed.confidence),
      reasoning: parsed.reasoning || 'AI assessment completed',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : []
    };
  }

  private calculateTier(score: number): 'A' | 'B' | 'C' | 'D' {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    return 'D';
  }

  private getFallbackScoring(candidate: CandidateProfile): AIScoreBreakdown {
    const baseScore = 50;
    return {
      technicalFit: baseScore,
      experienceLevel: baseScore,
      culturalAlignment: baseScore,
      riskAssessment: baseScore,
      communicationQuality: baseScore,
      projectConsistency: baseScore,
      overallScore: baseScore,
      tier: 'C',
      confidence: 30,
      reasoning: 'Fallback scoring - AI assessment unavailable',
      strengths: ['Profile available'],
      concerns: ['Limited assessment available'],
      recommendedActions: ['Manual review recommended']
    };
  }
}
