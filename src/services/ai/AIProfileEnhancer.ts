
export interface EnhancedProfile {
  summary: string;
  strengths: string[];
  specializations: string[];
  careerTrajectory: string;
  communicationStyle: string;
  projectTypes: string[];
  leadershipIndicators: string[];
  riskFlags: string[];
  outreachSuggestions: string[];
  confidenceLevel: number;
}

export class AIProfileEnhancer {
  private openaiApiKey: string;

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
  }

  async enhanceProfile(candidate: any, additionalData?: any): Promise<EnhancedProfile> {
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
              content: `You are an expert talent analyst. Create enhanced candidate profiles from available data.

Return ONLY valid JSON:
{
  "summary": "Comprehensive professional summary (150-200 words)",
  "strengths": ["Key professional strengths"],
  "specializations": ["Technical specializations"],
  "careerTrajectory": "Career progression analysis",
  "communicationStyle": "Communication style assessment",
  "projectTypes": ["Types of projects they work on"],
  "leadershipIndicators": ["Leadership/mentoring signs"],
  "riskFlags": ["Potential concerns"],
  "outreachSuggestions": ["Personalized outreach tips"],
  "confidenceLevel": 85
}

Focus on:
- Technical expertise and depth
- Communication and collaboration patterns
- Project complexity and consistency
- Leadership and mentoring potential
- Cultural fit indicators
- Growth potential and adaptability`
            },
            {
              role: 'user',
              content: `Analyze this candidate profile:

Name: ${candidate.name}
Title: ${candidate.title || 'Not specified'}
Platform: ${candidate.platform}
Location: ${candidate.location || 'Not specified'}
Experience: ${candidate.experience_years || 'Unknown'} years
Skills: ${candidate.skills?.join(', ') || 'Not specified'}
Summary/Bio: ${candidate.summary || candidate.bio || 'No summary available'}

GitHub Data: ${candidate.github_username ? 'Available' : 'Not available'}
Public Repos: ${candidate.public_repos || 0}
Followers: ${candidate.followers || 0}
Languages: ${candidate.detected_languages?.join(', ') || 'Not specified'}

Recent Activity: ${candidate.last_active ? new Date(candidate.last_active).toDateString() : 'Unknown'}

Additional Context: ${JSON.stringify(additionalData || {})}`
            }
          ],
          temperature: 0.3,
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
        return this.validateEnhancedProfile(parsed);
      } catch (parseError) {
        console.error('Failed to parse AI profile enhancement:', content);
        return this.getFallbackProfile(candidate);
      }
    } catch (error) {
      console.error('AI profile enhancement failed:', error);
      return this.getFallbackProfile(candidate);
    }
  }

  private validateEnhancedProfile(parsed: any): EnhancedProfile {
    return {
      summary: parsed.summary || 'Professional developer with technical expertise',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      specializations: Array.isArray(parsed.specializations) ? parsed.specializations : [],
      careerTrajectory: parsed.careerTrajectory || 'Steady technical growth',
      communicationStyle: parsed.communicationStyle || 'Professional communicator',
      projectTypes: Array.isArray(parsed.projectTypes) ? parsed.projectTypes : [],
      leadershipIndicators: Array.isArray(parsed.leadershipIndicators) ? parsed.leadershipIndicators : [],
      riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags : [],
      outreachSuggestions: Array.isArray(parsed.outreachSuggestions) ? parsed.outreachSuggestions : [],
      confidenceLevel: Math.min(Math.max(parsed.confidenceLevel || 60, 0), 100)
    };
  }

  private getFallbackProfile(candidate: any): EnhancedProfile {
    return {
      summary: `${candidate.name} is a ${candidate.title || 'software professional'} with ${candidate.experience_years || 'some'} years of experience.`,
      strengths: ['Technical background'],
      specializations: candidate.skills?.slice(0, 3) || [],
      careerTrajectory: 'Career progression information limited',
      communicationStyle: 'Communication style requires assessment',
      projectTypes: ['Software development'],
      leadershipIndicators: [],
      riskFlags: ['Limited profile information'],
      outreachSuggestions: ['Request portfolio or additional information'],
      confidenceLevel: 40
    };
  }

  async generateOutreachMessage(
    candidate: any, 
    enhancedProfile: EnhancedProfile, 
    jobContext: any
  ): Promise<string> {
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
              content: `Create personalized, professional outreach messages for technical recruitment.

Requirements:
- Professional but warm tone
- Reference specific skills/projects when possible
- Highlight growth opportunities
- Include clear next steps
- Keep under 200 words
- Avoid generic templates

Focus on:
- Why they're specifically qualified
- What makes this opportunity unique
- Mutual benefit and career growth
- Respect their current situation`
            },
            {
              role: 'user',
              content: `Create outreach message for:

Candidate: ${candidate.name}
Current Title: ${candidate.title || 'Developer'}
Key Strengths: ${enhancedProfile.strengths.join(', ')}
Specializations: ${enhancedProfile.specializations.join(', ')}

Job Context:
${JSON.stringify(jobContext, null, 2)}

Outreach Suggestions:
${enhancedProfile.outreachSuggestions.join('; ')}`
            }
          ],
          temperature: 0.4,
          max_tokens: 300
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content || this.getFallbackOutreach(candidate);
    } catch (error) {
      console.error('AI outreach generation failed:', error);
      return this.getFallbackOutreach(candidate);
    }
  }

  private getFallbackOutreach(candidate: any): string {
    return `Hi ${candidate.name},

I came across your profile and was impressed by your technical background. We have an exciting opportunity that matches your skills in ${candidate.skills?.slice(0, 2).join(' and ') || 'software development'}.

Would you be interested in learning more about this role and how it could advance your career?

Best regards`;
  }
}
