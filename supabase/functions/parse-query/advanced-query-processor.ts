
export interface EnhancedQueryAnalysis {
  original_query: string;
  processed_query: string;
  semantic_context: {
    primary_intent: string;
    search_depth: 'surface' | 'moderate' | 'deep';
    complexity_score: number;
    confidence_level: number;
  };
  skill_analysis: {
    technical_skills: string[];
    soft_skills: string[];
    domain_expertise: string[];
    seniority_indicators: string[];
    skill_clusters: string[];
    missing_context: string[];
  };
  role_analysis: {
    primary_role: string;
    role_variations: string[];
    hierarchy_level: string;
    role_cluster: string;
    industry_context: string[];
  };
  location_analysis: {
    primary_location: string;
    location_variations: string[];
    remote_preference: boolean;
    geo_flexibility: number;
  };
  quality_indicators: {
    query_clarity: number;
    specificity_score: number;
    ambiguity_flags: string[];
    enhancement_suggestions: string[];
  };
}

export class AdvancedQueryProcessor {
  private static readonly QUALITY_THRESHOLDS = {
    MIN_CLARITY: 60,
    MIN_SPECIFICITY: 50,
    HIGH_CONFIDENCE: 80,
    DEEP_SEARCH_TRIGGER: 70
  };

  private static readonly SKILL_WEIGHT_MATRIX = {
    'technical': { weight: 1.0, boost: 25 },
    'soft': { weight: 0.6, boost: 10 },
    'domain': { weight: 0.8, boost: 15 },
    'seniority': { weight: 0.9, boost: 20 }
  };

  static processQuery(query: string, parsedCriteria: any): EnhancedQueryAnalysis {
    console.log('🔍 Starting advanced query processing...');
    
    const semanticContext = this.analyzeSemanticContext(query, parsedCriteria);
    const skillAnalysis = this.performAdvancedSkillAnalysis(query, parsedCriteria);
    const roleAnalysis = this.analyzeRoleContext(query, parsedCriteria);
    const locationAnalysis = this.analyzeLocationContext(query, parsedCriteria);
    const qualityIndicators = this.assessQueryQuality(query, semanticContext, skillAnalysis);

    return {
      original_query: query,
      processed_query: this.optimizeQuery(query, semanticContext),
      semantic_context: semanticContext,
      skill_analysis: skillAnalysis,
      role_analysis: roleAnalysis,
      location_analysis: locationAnalysis,
      quality_indicators: qualityIndicators
    };
  }

  private static analyzeSemanticContext(query: string, criteria: any) {
    const intentKeywords = {
      'active_hiring': ['hiring', 'recruiting', 'position', 'urgent', 'immediate'],
      'talent_research': ['research', 'analysis', 'market', 'benchmark'],
      'skill_assessment': ['expert', 'proficient', 'advanced', 'certification'],
      'team_building': ['team', 'collaborate', 'culture', 'fit']
    };

    let primaryIntent = 'general_search';
    let intentScore = 0;

    Object.entries(intentKeywords).forEach(([intent, keywords]) => {
      const score = keywords.filter(keyword => 
        query.toLowerCase().includes(keyword)
      ).length;
      
      if (score > intentScore) {
        intentScore = score;
        primaryIntent = intent;
      }
    });

    const complexityFactors = [
      query.split(' ').length > 10,
      /\band\b|\bor\b|\bwith\b|\bhaving\b/i.test(query),
      criteria?.skills?.length > 5,
      criteria?.location && criteria?.seniority_level && criteria?.industries?.length
    ].filter(Boolean).length;

    const complexityScore = Math.min(complexityFactors * 25, 100);
    const searchDepth = complexityScore > 75 ? 'deep' : complexityScore > 50 ? 'moderate' : 'surface';
    
    return {
      primary_intent: primaryIntent,
      search_depth: searchDepth,
      complexity_score: complexityScore,
      confidence_level: Math.min((intentScore * 20) + (criteria?.confidence_score || 0), 100)
    };
  }

  private static performAdvancedSkillAnalysis(query: string, criteria: any) {
    const technicalSkills = criteria?.skills || [];
    const semanticSkills = criteria?.semantic_skills || [];
    const contextualSkills = criteria?.contextual_skills || [];

    // Enhanced skill categorization
    const techKeywords = ['programming', 'development', 'framework', 'language', 'database', 'cloud'];
    const softKeywords = ['leadership', 'communication', 'management', 'collaboration', 'problem-solving'];
    const domainKeywords = ['fintech', 'healthcare', 'e-commerce', 'ai', 'machine learning', 'devops'];

    const softSkills = this.extractSkillsByCategory(query, softKeywords);
    const domainExpertise = this.extractSkillsByCategory(query, domainKeywords);
    
    // Identify missing context for better suggestions
    const missingContext = [];
    if (technicalSkills.length === 0) missingContext.push('technical_skills');
    if (!criteria?.seniority_level || criteria.seniority_level === 'any') missingContext.push('experience_level');
    if (!criteria?.location) missingContext.push('location_preference');

    return {
      technical_skills: technicalSkills,
      soft_skills: softSkills,
      domain_expertise: domainExpertise,
      seniority_indicators: this.extractSeniorityIndicators(query),
      skill_clusters: criteria?.technology_stack || [],
      missing_context: missingContext
    };
  }

  private static analyzeRoleContext(query: string, criteria: any) {
    const roleTypes = criteria?.role_types || [];
    const primaryRole = roleTypes[0] || this.extractPrimaryRole(query);
    
    return {
      primary_role: primaryRole,
      role_variations: roleTypes,
      hierarchy_level: criteria?.seniority_level || 'any',
      role_cluster: criteria?.role_cluster?.[0] || 'general',
      industry_context: criteria?.industries || []
    };
  }

  private static analyzeLocationContext(query: string, criteria: any) {
    const location = criteria?.location;
    const remoteKeywords = ['remote', 'distributed', 'work from home', 'anywhere'];
    const remotePreference = remoteKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );

    return {
      primary_location: location || '',
      location_variations: location ? [location] : [],
      remote_preference: remotePreference,
      geo_flexibility: remotePreference ? 100 : location ? 50 : 0
    };
  }

  private static assessQueryQuality(query: string, semantic: any, skills: any) {
    const words = query.split(' ').filter(word => word.length > 2);
    const clarity = Math.min((words.length / 8) * 100, 100);
    
    const specificityFactors = [
      skills.technical_skills.length > 0,
      skills.soft_skills.length > 0,
      semantic.primary_intent !== 'general_search',
      words.length > 5
    ].filter(Boolean).length;
    
    const specificity = (specificityFactors / 4) * 100;
    
    const ambiguityFlags = [];
    if (words.length < 3) ambiguityFlags.push('too_short');
    if (words.length > 20) ambiguityFlags.push('too_complex');
    if (skills.missing_context.length > 2) ambiguityFlags.push('missing_context');

    const enhancementSuggestions = [];
    if (clarity < this.QUALITY_THRESHOLDS.MIN_CLARITY) {
      enhancementSuggestions.push('add_more_specific_terms');
    }
    if (skills.technical_skills.length === 0) {
      enhancementSuggestions.push('specify_technical_requirements');
    }

    return {
      query_clarity: clarity,
      specificity_score: specificity,
      ambiguity_flags: ambiguityFlags,
      enhancement_suggestions: enhancementSuggestions
    };
  }

  private static extractSkillsByCategory(query: string, keywords: string[]): string[] {
    return keywords.filter(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private static extractSeniorityIndicators(query: string): string[] {
    const indicators = ['junior', 'senior', 'lead', 'principal', 'staff', 'director', 'manager'];
    return indicators.filter(indicator => 
      query.toLowerCase().includes(indicator)
    );
  }

  private static extractPrimaryRole(query: string): string {
    const commonRoles = [
      'software engineer', 'developer', 'data scientist', 'product manager',
      'designer', 'devops engineer', 'analyst', 'consultant'
    ];
    
    for (const role of commonRoles) {
      if (query.toLowerCase().includes(role)) {
        return role;
      }
    }
    return 'software engineer';
  }

  private static optimizeQuery(query: string, semantic: any): string {
    let optimized = query.trim();
    
    // Add context based on intent
    if (semantic.primary_intent === 'active_hiring') {
      optimized += ' actively seeking opportunities';
    } else if (semantic.primary_intent === 'skill_assessment') {
      optimized += ' expert level proficiency';
    }
    
    return optimized;
  }
}
