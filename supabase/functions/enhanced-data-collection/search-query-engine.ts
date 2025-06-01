
export interface EnhancedSearchQuery {
  query: string;
  skills: string[];
  semantic_skills: string[];
  experience_level: string;
  experience_min: number;
  experience_max: number;
  location_preferences: string[];
  searchTerms: string[];
  semantic_terms: string[];
  role_types: string[];
  keywords: string[];
  semantic_keywords: string[];
  industries: string[];
  company_types: string[];
  salary_range?: { min: number; max: number; currency: string };
  must_have_skills: string[];
  nice_to_have_skills: string[];
  career_level_indicators: string[];
  market_trends: string[];
  skill_clusters: string[][];
}

export class AdvancedSearchQueryEngine {
  // Technology synonym mapping for semantic expansion
  private static readonly TECH_SYNONYMS = {
    'react': ['reactjs', 'react.js', 'react native', 'next.js', 'nextjs'],
    'javascript': ['js', 'typescript', 'ts', 'node.js', 'nodejs'],
    'python': ['py', 'django', 'flask', 'fastapi', 'pandas', 'numpy'],
    'kubernetes': ['k8s', 'container orchestration', 'docker swarm'],
    'aws': ['amazon web services', 'ec2', 's3', 'lambda', 'cloudformation'],
    'devops': ['site reliability', 'sre', 'platform engineering', 'infrastructure'],
    'machine learning': ['ml', 'ai', 'artificial intelligence', 'deep learning', 'data science']
  };

  // Experience level hierarchy
  private static readonly EXPERIENCE_HIERARCHY = {
    'junior': ['entry level', 'associate', '0-2 years', 'graduate'],
    'mid': ['mid level', 'intermediate', '2-5 years', 'software engineer'],
    'senior': ['senior', '5+ years', 'sr', 'lead', 'principal'],
    'lead': ['tech lead', 'team lead', 'engineering lead', 'staff'],
    'principal': ['principal', 'staff', 'distinguished', 'architect']
  };

  // Location variations for comprehensive search
  private static readonly LOCATION_VARIATIONS = {
    'hyderabad': ['hyderabad', 'hyd', 'telangana', 'andhra pradesh'],
    'bangalore': ['bangalore', 'bengaluru', 'blr', 'karnataka'],
    'mumbai': ['mumbai', 'bombay', 'maharashtra'],
    'delhi': ['delhi', 'new delhi', 'ncr', 'gurgaon', 'noida'],
    'san francisco': ['san francisco', 'sf', 'bay area', 'silicon valley'],
    'new york': ['new york', 'nyc', 'manhattan', 'brooklyn'],
    'london': ['london', 'uk', 'united kingdom', 'england'],
    'remote': ['remote', 'work from home', 'distributed', 'anywhere']
  };

  static buildLinkedInBooleanQuery(enhancedQuery: EnhancedSearchQuery): string[] {
    const queries = [];
    const locations = this.expandLocations(enhancedQuery.location_preferences);
    const skills = this.expandSkills(enhancedQuery.skills.concat(enhancedQuery.must_have_skills));
    const roles = enhancedQuery.role_types;

    // Primary Boolean search with role, location, and skills
    for (const role of roles.slice(0, 3)) {
      for (const location of locations.slice(0, 2)) {
        const skillGroup = skills.slice(0, 3).map(skill => `"${skill}"`).join(' OR ');
        const query = `site:linkedin.com/in "${role}" AND "${location}" AND (${skillGroup}) -recruiter -job -hiring`;
        queries.push(query);
      }
    }

    // Experience-based searches
    const experienceTerms = this.buildExperienceTerms(enhancedQuery.experience_level, enhancedQuery.experience_min);
    for (const expTerm of experienceTerms.slice(0, 2)) {
      const primarySkill = skills[0] || enhancedQuery.skills[0];
      const location = locations[0] || enhancedQuery.location_preferences[0];
      if (primarySkill && location) {
        const query = `site:linkedin.com/in "${expTerm}" AND "${location}" AND "${primarySkill}" -recruiter`;
        queries.push(query);
      }
    }

    // Company type targeting
    if (enhancedQuery.company_types.length > 0) {
      const companyTypes = enhancedQuery.company_types.slice(0, 2).map(type => `"${type}"`).join(' OR ');
      const primaryRole = roles[0] || 'developer';
      const query = `site:linkedin.com/in "${primaryRole}" AND (${companyTypes}) AND "${skills[0] || 'software'}"`;
      queries.push(query);
    }

    return queries.slice(0, 6); // Limit to 6 queries for performance
  }

  static buildGitHubAdvancedQuery(enhancedQuery: EnhancedSearchQuery): string[] {
    const queries = [];
    const languages = this.extractProgrammingLanguages(enhancedQuery.skills);
    const locations = this.expandLocations(enhancedQuery.location_preferences);

    // Language-based searches with activity filters
    for (const lang of languages.slice(0, 3)) {
      for (const location of locations.slice(0, 2)) {
        const query = `language:${lang} location:"${location}" followers:>50 repos:>10 contributions:>100`;
        queries.push(query);
      }
    }

    // Repository-based skill searches
    const techSkills = enhancedQuery.skills.filter(skill => 
      !this.extractProgrammingLanguages([skill]).length
    );
    for (const skill of techSkills.slice(0, 3)) {
      const query = `"${skill}" in:readme language:${languages[0] || 'javascript'} stars:>100 pushed:>2023`;
      queries.push(query);
    }

    // High-activity developer searches
    const primaryLang = languages[0] || 'javascript';
    const query = `language:${primaryLang} followers:>100 repos:>20 created:>2020`;
    queries.push(query);

    return queries.slice(0, 5);
  }

  static buildGoogleBooleanQuery(enhancedQuery: EnhancedSearchQuery): string[] {
    const queries = [];
    const roles = enhancedQuery.role_types;
    const skills = enhancedQuery.skills.concat(enhancedQuery.must_have_skills);
    const locations = this.expandLocations(enhancedQuery.location_preferences);

    // LinkedIn profile discovery
    for (const role of roles.slice(0, 2)) {
      for (const location of locations.slice(0, 2)) {
        const skillGroup = skills.slice(0, 2).map(skill => `"${skill}"`).join(' OR ');
        const query = `site:linkedin.com/in ("${role}" OR "Senior ${role}") AND "${location}" AND (${skillGroup}) -job -jobs -hiring`;
        queries.push(query);
      }
    }

    // Portfolio and resume discovery
    const primaryRole = roles[0] || 'developer';
    const primarySkill = skills[0] || 'software';
    const portfolioQuery = `("portfolio" OR "resume" OR "CV") "${primaryRole}" "${primarySkill}" filetype:pdf OR site:github.io`;
    queries.push(portfolioQuery);

    // Company-specific searches
    const techCompanies = ['google', 'microsoft', 'amazon', 'meta', 'netflix', 'uber', 'airbnb'];
    for (const company of techCompanies.slice(0, 3)) {
      const query = `site:linkedin.com/in "${primaryRole}" "${company}" "${skills[0] || 'engineer'}"`;
      queries.push(query);
    }

    // Alternative platform searches
    const altSites = ['stackoverflow.com/users', 'github.com', 'medium.com/@'];
    for (const site of altSites) {
      const query = `site:${site} "${primaryRole}" "${skills[0] || 'developer'}" "${locations[0] || 'software'}"`;
      queries.push(query);
    }

    return queries.slice(0, 8);
  }

  static buildStackOverflowExpertQuery(enhancedQuery: EnhancedSearchQuery): string[] {
    const queries = [];
    const techSkills = this.extractTechnicalTags(enhancedQuery.skills);
    
    // High-reputation expert searches
    for (const skill of techSkills.slice(0, 4)) {
      queries.push(`[${skill}] reputation:>5000 answers:>10`);
      queries.push(`[${skill}] score:>50 bronze:>5`);
    }

    // Multi-tag expertise searches
    if (techSkills.length >= 2) {
      const tagPairs = this.createTagPairs(techSkills);
      for (const pair of tagPairs.slice(0, 3)) {
        queries.push(`[${pair[0]}] [${pair[1]}] reputation:>2000`);
      }
    }

    return queries.slice(0, 6);
  }

  static buildSemanticSearchTerms(enhancedQuery: EnhancedSearchQuery): string[] {
    const semanticTerms = [];
    
    // Expand each skill with synonyms
    for (const skill of enhancedQuery.skills.slice(0, 5)) {
      const synonyms = this.TECH_SYNONYMS[skill.toLowerCase()] || [];
      semanticTerms.push(...synonyms);
    }

    // Add role variations
    for (const role of enhancedQuery.role_types.slice(0, 3)) {
      const roleVariations = this.generateRoleVariations(role);
      semanticTerms.push(...roleVariations);
    }

    // Add experience level synonyms
    const expSynonyms = this.EXPERIENCE_HIERARCHY[enhancedQuery.experience_level] || [];
    semanticTerms.push(...expSynonyms);

    return [...new Set(semanticTerms)].slice(0, 20); // Remove duplicates and limit
  }

  private static expandLocations(locations: string[]): string[] {
    const expanded = [];
    for (const location of locations) {
      const variations = this.LOCATION_VARIATIONS[location.toLowerCase()] || [location];
      expanded.push(...variations);
    }
    return [...new Set(expanded)];
  }

  private static expandSkills(skills: string[]): string[] {
    const expanded = [];
    for (const skill of skills) {
      expanded.push(skill);
      const synonyms = this.TECH_SYNONYMS[skill.toLowerCase()] || [];
      expanded.push(...synonyms.slice(0, 2)); // Limit synonyms per skill
    }
    return [...new Set(expanded)];
  }

  private static extractProgrammingLanguages(skills: string[]): string[] {
    const languages = ['python', 'javascript', 'typescript', 'java', 'go', 'rust', 'php', 'ruby', 'cpp', 'csharp'];
    return skills.filter(skill => 
      languages.includes(skill.toLowerCase()) || 
      skill.toLowerCase().includes('script') ||
      skill.toLowerCase().includes('java')
    );
  }

  private static extractTechnicalTags(skills: string[]): string[] {
    return skills.map(skill => 
      skill.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    ).filter(tag => tag.length > 1);
  }

  private static buildExperienceTerms(level: string, minYears: number): string[] {
    const terms = [];
    
    if (minYears > 0) {
      terms.push(`${minYears}+ years`);
      terms.push(`${minYears} years experience`);
    }

    const levelTerms = this.EXPERIENCE_HIERARCHY[level] || [];
    terms.push(...levelTerms);

    return terms;
  }

  private static generateRoleVariations(role: string): string[] {
    const base = role.toLowerCase();
    const variations = [
      role,
      `Senior ${role}`,
      `Lead ${role}`,
      `Principal ${role}`,
      `Staff ${role}`
    ];

    // Add common variations
    if (base.includes('engineer')) {
      variations.push(base.replace('engineer', 'developer'));
    }
    if (base.includes('developer')) {
      variations.push(base.replace('developer', 'engineer'));
    }

    return variations;
  }

  private static createTagPairs(tags: string[]): string[][] {
    const pairs = [];
    for (let i = 0; i < tags.length - 1; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        pairs.push([tags[i], tags[j]]);
      }
    }
    return pairs;
  }
}
