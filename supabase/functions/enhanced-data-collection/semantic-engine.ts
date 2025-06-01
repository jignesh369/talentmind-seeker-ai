
export class SemanticSearchEngine {
  private static readonly SKILL_CLUSTERS = {
    'frontend': ['react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css', 'redux'],
    'backend': ['node.js', 'python', 'java', 'go', 'rust', 'php', 'ruby', 'express'],
    'devops': ['docker', 'kubernetes', 'aws', 'terraform', 'jenkins', 'gitlab', 'ansible'],
    'data': ['python', 'sql', 'pandas', 'numpy', 'tensorflow', 'pytorch', 'spark', 'hadoop'],
    'mobile': ['react native', 'flutter', 'swift', 'kotlin', 'xamarin', 'ionic'],
    'cloud': ['aws', 'azure', 'gcp', 'cloudformation', 'terraform', 'serverless']
  };

  private static readonly ROLE_HIERARCHIES = {
    'software engineer': ['junior software engineer', 'software engineer', 'senior software engineer', 'staff software engineer', 'principal software engineer'],
    'devops engineer': ['junior devops', 'devops engineer', 'senior devops', 'lead devops', 'principal devops', 'platform engineer'],
    'data scientist': ['junior data scientist', 'data scientist', 'senior data scientist', 'lead data scientist', 'principal data scientist'],
    'product manager': ['associate pm', 'product manager', 'senior pm', 'lead pm', 'director of product']
  };

  private static readonly INDUSTRY_CONTEXTS = {
    'fintech': ['banking', 'payments', 'cryptocurrency', 'trading', 'compliance', 'risk management'],
    'healthtech': ['healthcare', 'medical devices', 'telemedicine', 'clinical trials', 'pharma'],
    'edtech': ['education', 'learning management', 'online courses', 'student management'],
    'ecommerce': ['retail', 'marketplace', 'inventory', 'payment processing', 'logistics']
  };

  static enhanceQueryWithSemanticContext(query: string, skills: string[]): {
    enhanced_skills: string[];
    semantic_clusters: string[];
    role_variations: string[];
    industry_context: string[];
    search_intent: string;
  } {
    const enhanced_skills = this.expandSkillsWithClusters(skills);
    const semantic_clusters = this.identifySkillClusters(skills);
    const role_variations = this.generateRoleVariations(query);
    const industry_context = this.inferIndustryContext(skills);
    const search_intent = this.classifySearchIntent(query, skills);

    return {
      enhanced_skills,
      semantic_clusters,
      role_variations,
      industry_context,
      search_intent
    };
  }

  static buildContextualSearchQueries(baseQuery: string, context: any): string[] {
    const queries = [];
    
    // Intent-based query generation
    switch (context.search_intent) {
      case 'hiring_active':
        queries.push(...this.buildActiveHiringQueries(baseQuery, context));
        break;
      case 'talent_research':
        queries.push(...this.buildResearchQueries(baseQuery, context));
        break;
      case 'competitive_analysis':
        queries.push(...this.buildCompetitiveQueries(baseQuery, context));
        break;
      default:
        queries.push(...this.buildGeneralTalentQueries(baseQuery, context));
    }

    return queries;
  }

  private static expandSkillsWithClusters(skills: string[]): string[] {
    const expanded = new Set(skills);
    
    for (const skill of skills) {
      // Find which cluster this skill belongs to
      for (const [cluster, clusterSkills] of Object.entries(this.SKILL_CLUSTERS)) {
        if (clusterSkills.includes(skill.toLowerCase())) {
          // Add related skills from the same cluster
          clusterSkills.slice(0, 3).forEach(related => expanded.add(related));
        }
      }
    }

    return Array.from(expanded);
  }

  private static identifySkillClusters(skills: string[]): string[] {
    const clusters = [];
    
    for (const [cluster, clusterSkills] of Object.entries(this.SKILL_CLUSTERS)) {
      const matchCount = skills.filter(skill => 
        clusterSkills.includes(skill.toLowerCase())
      ).length;
      
      if (matchCount >= 2) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  private static generateRoleVariations(query: string): string[] {
    const variations = [];
    const queryLower = query.toLowerCase();
    
    for (const [baseRole, hierarchy] of Object.entries(this.ROLE_HIERARCHIES)) {
      if (queryLower.includes(baseRole)) {
        variations.push(...hierarchy);
      }
    }

    // Add common variations
    if (queryLower.includes('engineer')) {
      variations.push(queryLower.replace('engineer', 'developer'));
    }
    if (queryLower.includes('developer')) {
      variations.push(queryLower.replace('developer', 'engineer'));
    }

    return [...new Set(variations)];
  }

  private static inferIndustryContext(skills: string[]): string[] {
    const contexts = [];
    
    for (const [industry, keywords] of Object.entries(this.INDUSTRY_CONTEXTS)) {
      const matchCount = skills.filter(skill => 
        keywords.some(keyword => skill.toLowerCase().includes(keyword.toLowerCase()))
      ).length;
      
      if (matchCount > 0) {
        contexts.push(industry);
      }
    }

    return contexts;
  }

  private static classifySearchIntent(query: string, skills: string[]): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('hire') || queryLower.includes('recruit') || queryLower.includes('join')) {
      return 'hiring_active';
    }
    if (queryLower.includes('research') || queryLower.includes('market') || queryLower.includes('talent pool')) {
      return 'talent_research';
    }
    if (queryLower.includes('competitor') || queryLower.includes('benchmark')) {
      return 'competitive_analysis';
    }
    
    return 'general_talent_discovery';
  }

  private static buildActiveHiringQueries(baseQuery: string, context: any): string[] {
    return [
      `"open to work" ${baseQuery} ${context.enhanced_skills.slice(0, 3).join(' OR ')}`,
      `"looking for opportunities" ${context.role_variations[0]} ${context.enhanced_skills[0]}`,
      `"available for hire" ${baseQuery} ${context.semantic_clusters.join(' OR ')}`
    ];
  }

  private static buildResearchQueries(baseQuery: string, context: any): string[] {
    return [
      `${baseQuery} market research ${context.industry_context.join(' OR ')}`,
      `talent pool ${context.role_variations.join(' OR ')} ${context.enhanced_skills.slice(0, 5).join(' ')}`,
      `industry leaders ${context.semantic_clusters.join(' ')} ${baseQuery}`
    ];
  }

  private static buildCompetitiveQueries(baseQuery: string, context: any): string[] {
    const techCompanies = ['google', 'microsoft', 'amazon', 'meta', 'netflix', 'uber', 'airbnb'];
    return techCompanies.slice(0, 3).map(company => 
      `"${company}" ${baseQuery} ${context.enhanced_skills.slice(0, 2).join(' OR ')}`
    );
  }

  private static buildGeneralTalentQueries(baseQuery: string, context: any): string[] {
    return [
      `${baseQuery} ${context.enhanced_skills.slice(0, 4).join(' OR ')}`,
      `${context.role_variations.slice(0, 3).join(' OR ')} ${context.enhanced_skills[0]}`,
      `${context.semantic_clusters.join(' ')} expert ${baseQuery}`
    ];
  }
}
