
import { AIQueryProcessor, EnhancedQuery } from './AIQueryProcessor';

export interface ComplexQueryAnalysis {
  demographicInference: {
    experienceLevel: 'junior' | 'mid' | 'senior' | 'expert';
    estimatedAge: { min: number; max: number } | null;
    careerStage: 'early' | 'mid' | 'senior' | 'executive';
    availabilitySignals: string[];
  };
  companyContext: {
    companyTypes: string[];
    fundingStage: string[];
    companySize: string[];
    industryFocus: string[];
    unicornStatus: boolean;
    startupEcosystem: boolean;
  };
  technicalDepth: {
    aiSpecialization: string[];
    openSourceContribution: 'none' | 'casual' | 'regular' | 'maintainer' | 'creator';
    technicalLeadership: boolean;
    researchOrientation: boolean;
  };
  locationIntelligence: {
    primaryLocation: string;
    locationFlexibility: 'strict' | 'flexible' | 'remote';
    techHubStatus: boolean;
    timeZonePreference: string[];
  };
  searchStrategy: {
    priorityWeights: Record<string, number>;
    filteringApproach: 'strict' | 'balanced' | 'broad';
    scoringModel: 'technical' | 'cultural' | 'balanced' | 'leadership';
  };
}

export class EnhancedQueryProcessor extends AIQueryProcessor {
  async analyzeComplexQuery(query: string): Promise<ComplexQueryAnalysis> {
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
              content: `You are an expert technical recruiter AI with deep understanding of the tech industry, company ecosystems, and candidate profiles.

Analyze this hiring query and extract detailed intelligence about:
1. Demographic & Experience Inference (from terms like "young", "seasoned", "fresh")
2. Company Context (unicorn, startup, enterprise, funding stage)
3. Technical Depth (AI specialization, open source involvement)
4. Location Intelligence (tech hubs, remote preferences)
5. Search Strategy (how to prioritize and score candidates)

Return ONLY valid JSON with this structure:
{
  "demographicInference": {
    "experienceLevel": "junior|mid|senior|expert",
    "estimatedAge": {"min": 25, "max": 32} or null,
    "careerStage": "early|mid|senior|executive",
    "availabilitySignals": ["actively looking", "open to opportunities"]
  },
  "companyContext": {
    "companyTypes": ["startup", "unicorn", "enterprise"],
    "fundingStage": ["seed", "series-a", "series-b", "ipo"],
    "companySize": ["1-10", "11-50", "51-200", "200+"],
    "industryFocus": ["fintech", "healthtech", "ai"],
    "unicornStatus": true|false,
    "startupEcosystem": true|false
  },
  "technicalDepth": {
    "aiSpecialization": ["machine learning", "deep learning", "nlp"],
    "openSourceContribution": "none|casual|regular|maintainer|creator",
    "technicalLeadership": true|false,
    "researchOrientation": true|false
  },
  "locationIntelligence": {
    "primaryLocation": "Bangalore",
    "locationFlexibility": "strict|flexible|remote",
    "techHubStatus": true|false,
    "timeZonePreference": ["IST", "PST"]
  },
  "searchStrategy": {
    "priorityWeights": {"technical": 0.4, "cultural": 0.3, "experience": 0.2, "location": 0.1},
    "filteringApproach": "strict|balanced|broad",
    "scoringModel": "technical|cultural|balanced|leadership"
  }
}`
            },
            {
              role: 'user',
              content: `Analyze this hiring query: "${query}"`
            }
          ],
          temperature: 0.1,
          max_tokens: 1000
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(content);
        return this.validateComplexAnalysis(parsed);
      } catch (parseError) {
        console.error('Failed to parse complex analysis:', content);
        return this.getFallbackComplexAnalysis();
      }
    } catch (error) {
      console.error('Complex query analysis failed:', error);
      return this.getFallbackComplexAnalysis();
    }
  }

  private validateComplexAnalysis(parsed: any): ComplexQueryAnalysis {
    return {
      demographicInference: {
        experienceLevel: ['junior', 'mid', 'senior', 'expert'].includes(parsed.demographicInference?.experienceLevel) 
          ? parsed.demographicInference.experienceLevel : 'mid',
        estimatedAge: parsed.demographicInference?.estimatedAge || null,
        careerStage: ['early', 'mid', 'senior', 'executive'].includes(parsed.demographicInference?.careerStage)
          ? parsed.demographicInference.careerStage : 'mid',
        availabilitySignals: Array.isArray(parsed.demographicInference?.availabilitySignals) 
          ? parsed.demographicInference.availabilitySignals : []
      },
      companyContext: {
        companyTypes: Array.isArray(parsed.companyContext?.companyTypes) ? parsed.companyContext.companyTypes : [],
        fundingStage: Array.isArray(parsed.companyContext?.fundingStage) ? parsed.companyContext.fundingStage : [],
        companySize: Array.isArray(parsed.companyContext?.companySize) ? parsed.companyContext.companySize : [],
        industryFocus: Array.isArray(parsed.companyContext?.industryFocus) ? parsed.companyContext.industryFocus : [],
        unicornStatus: Boolean(parsed.companyContext?.unicornStatus),
        startupEcosystem: Boolean(parsed.companyContext?.startupEcosystem)
      },
      technicalDepth: {
        aiSpecialization: Array.isArray(parsed.technicalDepth?.aiSpecialization) ? parsed.technicalDepth.aiSpecialization : [],
        openSourceContribution: ['none', 'casual', 'regular', 'maintainer', 'creator'].includes(parsed.technicalDepth?.openSourceContribution)
          ? parsed.technicalDepth.openSourceContribution : 'none',
        technicalLeadership: Boolean(parsed.technicalDepth?.technicalLeadership),
        researchOrientation: Boolean(parsed.technicalDepth?.researchOrientation)
      },
      locationIntelligence: {
        primaryLocation: parsed.locationIntelligence?.primaryLocation || '',
        locationFlexibility: ['strict', 'flexible', 'remote'].includes(parsed.locationIntelligence?.locationFlexibility)
          ? parsed.locationIntelligence.locationFlexibility : 'flexible',
        techHubStatus: Boolean(parsed.locationIntelligence?.techHubStatus),
        timeZonePreference: Array.isArray(parsed.locationIntelligence?.timeZonePreference) 
          ? parsed.locationIntelligence.timeZonePreference : []
      },
      searchStrategy: {
        priorityWeights: parsed.searchStrategy?.priorityWeights || {
          technical: 0.4,
          cultural: 0.3,
          experience: 0.2,
          location: 0.1
        },
        filteringApproach: ['strict', 'balanced', 'broad'].includes(parsed.searchStrategy?.filteringApproach)
          ? parsed.searchStrategy.filteringApproach : 'balanced',
        scoringModel: ['technical', 'cultural', 'balanced', 'leadership'].includes(parsed.searchStrategy?.scoringModel)
          ? parsed.searchStrategy.scoringModel : 'balanced'
      }
    };
  }

  private getFallbackComplexAnalysis(): ComplexQueryAnalysis {
    return {
      demographicInference: {
        experienceLevel: 'mid',
        estimatedAge: null,
        careerStage: 'mid',
        availabilitySignals: []
      },
      companyContext: {
        companyTypes: [],
        fundingStage: [],
        companySize: [],
        industryFocus: [],
        unicornStatus: false,
        startupEcosystem: false
      },
      technicalDepth: {
        aiSpecialization: [],
        openSourceContribution: 'none',
        technicalLeadership: false,
        researchOrientation: false
      },
      locationIntelligence: {
        primaryLocation: '',
        locationFlexibility: 'flexible',
        techHubStatus: false,
        timeZonePreference: []
      },
      searchStrategy: {
        priorityWeights: {
          technical: 0.4,
          cultural: 0.3,
          experience: 0.2,
          location: 0.1
        },
        filteringApproach: 'balanced',
        scoringModel: 'balanced'
      }
    };
  }
}
