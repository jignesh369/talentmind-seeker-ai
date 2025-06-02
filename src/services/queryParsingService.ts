
// Centralized Query Parsing Service
export interface ParsedQuery {
  originalQuery: string;
  skills: string[];
  enhancedSkills: string[];
  location: string[];
  normalizedLocation: string[];
  roleTypes: string[];
  experienceLevel?: string;
  searchIntent: string;
  confidence: number;
}

export class QueryParsingService {
  private static readonly SKILL_MAPPINGS = {
    // Game Development
    'unity': ['Unity', 'C#', 'Game Development', '3D Graphics', 'Mobile Games'],
    'unreal': ['Unreal Engine', 'C++', 'Game Development', 'Blueprint', '3D Graphics'],
    'game developer': ['Unity', 'Unreal Engine', 'C#', 'C++', 'Game Development', 'Game Design'],
    'game development': ['Unity', 'Unreal Engine', 'C#', 'C++', 'Game Programming'],
    
    // Web Development
    'react': ['React', 'JavaScript', 'TypeScript', 'Frontend', 'Web Development'],
    'node.js': ['Node.js', 'JavaScript', 'Backend', 'Express', 'API Development'],
    'python': ['Python', 'Django', 'Flask', 'FastAPI', 'Backend Development'],
    
    // DevOps & Cloud
    'aws': ['AWS', 'Cloud Computing', 'EC2', 'S3', 'Lambda', 'DevOps'],
    'kubernetes': ['Kubernetes', 'Docker', 'DevOps', 'Container Orchestration'],
    'docker': ['Docker', 'Containerization', 'DevOps', 'Kubernetes']
  };

  private static readonly LOCATION_MAPPINGS = {
    'hyderabad': ['Hyderabad', 'Telangana', 'India'],
    'bangalore': ['Bangalore', 'Bengaluru', 'Karnataka', 'India'],
    'mumbai': ['Mumbai', 'Maharashtra', 'India'],
    'delhi': ['Delhi', 'New Delhi', 'NCR', 'India'],
    'pune': ['Pune', 'Maharashtra', 'India'],
    'san francisco': ['San Francisco', 'SF', 'Bay Area', 'California', 'USA'],
    'new york': ['New York', 'NYC', 'Manhattan', 'USA'],
    'london': ['London', 'UK', 'United Kingdom', 'England']
  };

  private static readonly ROLE_MAPPINGS = {
    'game developer': ['Game Developer', 'Game Programmer', 'Unity Developer', 'Unreal Developer'],
    'software engineer': ['Software Engineer', 'Developer', 'Programmer', 'Software Developer'],
    'frontend developer': ['Frontend Developer', 'UI Developer', 'React Developer', 'Web Developer'],
    'backend developer': ['Backend Developer', 'API Developer', 'Server Developer'],
    'devops engineer': ['DevOps Engineer', 'Site Reliability Engineer', 'Platform Engineer']
  };

  static parseQuery(query: string): ParsedQuery {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Extract skills with enhanced mappings
    const extractedSkills = this.extractSkills(normalizedQuery);
    const enhancedSkills = this.enhanceSkills(extractedSkills);
    
    // Extract and normalize locations
    const extractedLocations = this.extractLocations(normalizedQuery);
    const normalizedLocations = this.normalizeLocations(extractedLocations);
    
    // Extract role types
    const roleTypes = this.extractRoleTypes(normalizedQuery);
    
    // Determine search intent
    const searchIntent = this.determineSearchIntent(normalizedQuery, extractedSkills);
    
    // Calculate confidence based on how well we parsed the query
    const confidence = this.calculateConfidence(extractedSkills, extractedLocations, roleTypes);

    return {
      originalQuery: query,
      skills: extractedSkills,
      enhancedSkills,
      location: extractedLocations,
      normalizedLocation: normalizedLocations,
      roleTypes,
      searchIntent,
      confidence
    };
  }

  private static extractSkills(query: string): string[] {
    const skills = new Set<string>();
    
    // Check for exact skill matches
    Object.keys(this.SKILL_MAPPINGS).forEach(skill => {
      if (query.includes(skill)) {
        skills.add(skill);
      }
    });

    // Check for technology keywords
    const techKeywords = ['react', 'angular', 'vue', 'python', 'java', 'javascript', 'typescript', 
                         'unity', 'unreal', 'c#', 'c++', 'aws', 'azure', 'docker', 'kubernetes'];
    
    techKeywords.forEach(tech => {
      if (query.includes(tech)) {
        skills.add(tech);
      }
    });

    return Array.from(skills);
  }

  private static enhanceSkills(skills: string[]): string[] {
    const enhanced = new Set<string>();
    
    skills.forEach(skill => {
      enhanced.add(skill);
      const mappings = this.SKILL_MAPPINGS[skill.toLowerCase()];
      if (mappings) {
        mappings.forEach(mapped => enhanced.add(mapped));
      }
    });

    return Array.from(enhanced);
  }

  private static extractLocations(query: string): string[] {
    const locations = [];
    
    Object.keys(this.LOCATION_MAPPINGS).forEach(location => {
      if (query.includes(location)) {
        locations.push(location);
      }
    });

    // Also check for country names
    const countries = ['india', 'usa', 'uk', 'canada', 'australia'];
    countries.forEach(country => {
      if (query.includes(country)) {
        locations.push(country);
      }
    });

    return locations;
  }

  private static normalizeLocations(locations: string[]): string[] {
    const normalized = new Set<string>();
    
    locations.forEach(location => {
      const mappings = this.LOCATION_MAPPINGS[location.toLowerCase()];
      if (mappings) {
        mappings.forEach(mapped => normalized.add(mapped));
      } else {
        normalized.add(location);
      }
    });

    return Array.from(normalized);
  }

  private static extractRoleTypes(query: string): string[] {
    const roles = new Set<string>();
    
    Object.keys(this.ROLE_MAPPINGS).forEach(role => {
      if (query.includes(role)) {
        const mappings = this.ROLE_MAPPINGS[role];
        mappings.forEach(mapped => roles.add(mapped));
      }
    });

    // Fallback role extraction
    const roleKeywords = ['developer', 'engineer', 'programmer', 'architect', 'lead', 'senior'];
    roleKeywords.forEach(keyword => {
      if (query.includes(keyword)) {
        roles.add(`${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`);
      }
    });

    return Array.from(roles);
  }

  private static determineSearchIntent(query: string, skills: string[]): string {
    if (skills.some(skill => ['unity', 'unreal'].includes(skill.toLowerCase()))) {
      return 'game_development_search';
    }
    if (skills.some(skill => ['react', 'vue', 'angular'].includes(skill.toLowerCase()))) {
      return 'frontend_development_search';
    }
    if (skills.some(skill => ['aws', 'kubernetes', 'docker'].includes(skill.toLowerCase()))) {
      return 'devops_search';
    }
    return 'general_tech_search';
  }

  private static calculateConfidence(skills: string[], locations: string[], roles: string[]): number {
    let confidence = 0;
    
    // Base confidence from extracted elements
    if (skills.length > 0) confidence += 30;
    if (locations.length > 0) confidence += 25;
    if (roles.length > 0) confidence += 25;
    
    // Bonus for specific combinations
    if (skills.length > 1) confidence += 10;
    if (locations.length > 0 && skills.length > 0) confidence += 10;
    
    return Math.min(confidence, 100);
  }

  static buildGitHubSearchQuery(parsedQuery: ParsedQuery): string[] {
    const queries = [];
    const { enhancedSkills, normalizedLocation, searchIntent } = parsedQuery;

    if (searchIntent === 'game_development_search') {
      // Game development specific searches
      if (enhancedSkills.includes('Unity')) {
        const location = normalizedLocation[0] || '';
        queries.push(`language:c# unity game${location ? ` location:"${location}"` : ''} repos:>=3`);
      }
      if (enhancedSkills.includes('Unreal Engine')) {
        const location = normalizedLocation[0] || '';
        queries.push(`language:c++ unreal game${location ? ` location:"${location}"` : ''} repos:>=3`);
      }
    } else {
      // General tech searches
      const primarySkills = enhancedSkills.slice(0, 3);
      primarySkills.forEach(skill => {
        const location = normalizedLocation[0] || '';
        queries.push(`${skill.toLowerCase()}${location ? ` location:"${location}"` : ''} repos:>=5 followers:>=10`);
      });
    }

    return queries.slice(0, 5); // Limit to 5 queries
  }

  static buildDatabaseSearchFilters(parsedQuery: ParsedQuery) {
    return {
      skills: parsedQuery.enhancedSkills,
      location: parsedQuery.normalizedLocation[0],
      roleTypes: parsedQuery.roleTypes,
      searchTerms: parsedQuery.enhancedSkills.concat(parsedQuery.roleTypes)
    };
  }
}
