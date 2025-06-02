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
    // Programming Languages
    'python': ['Python', 'Django', 'Flask', 'FastAPI', 'Backend Development'],
    'java': ['Java', 'Spring', 'Spring Boot', 'Backend Development'],
    'javascript': ['JavaScript', 'TypeScript', 'Node.js', 'Frontend', 'Web Development'],
    'typescript': ['TypeScript', 'JavaScript', 'Frontend', 'Web Development'],
    'c#': ['C#', '.NET', 'ASP.NET', 'Backend Development'],
    'cpp': ['C++', 'Systems Programming', 'Game Development'],
    'go': ['Go', 'Backend Development', 'Systems Programming'],
    'rust': ['Rust', 'Systems Programming', 'Backend Development'],
    'php': ['PHP', 'Laravel', 'Web Development', 'Backend Development'],
    'ruby': ['Ruby', 'Rails', 'Web Development', 'Backend Development'],
    'swift': ['Swift', 'iOS Development', 'Mobile Development'],
    'kotlin': ['Kotlin', 'Android Development', 'Mobile Development'],
    
    // Frameworks & Libraries
    'react': ['React', 'JavaScript', 'TypeScript', 'Frontend', 'Web Development'],
    'angular': ['Angular', 'TypeScript', 'Frontend', 'Web Development'],
    'vue': ['Vue.js', 'JavaScript', 'Frontend', 'Web Development'],
    'node.js': ['Node.js', 'JavaScript', 'Backend', 'Express', 'API Development'],
    'django': ['Django', 'Python', 'Backend', 'Web Development'],
    'flask': ['Flask', 'Python', 'Backend', 'Web Development'],
    'spring': ['Spring', 'Java', 'Backend', 'Web Development'],
    
    // Game Development
    'unity': ['Unity', 'C#', 'Game Development', '3D Graphics', 'Mobile Games'],
    'unreal': ['Unreal Engine', 'C++', 'Game Development', 'Blueprint', '3D Graphics'],
    'game developer': ['Unity', 'Unreal Engine', 'C#', 'C++', 'Game Development', 'Game Design'],
    'game development': ['Unity', 'Unreal Engine', 'C#', 'C++', 'Game Programming'],
    
    // DevOps & Cloud
    'aws': ['AWS', 'Cloud Computing', 'EC2', 'S3', 'Lambda', 'DevOps'],
    'azure': ['Azure', 'Cloud Computing', 'DevOps'],
    'kubernetes': ['Kubernetes', 'Docker', 'DevOps', 'Container Orchestration'],
    'docker': ['Docker', 'Containerization', 'DevOps', 'Kubernetes'],
    'terraform': ['Terraform', 'Infrastructure as Code', 'DevOps'],
    
    // Data & AI
    'machine learning': ['Machine Learning', 'Python', 'TensorFlow', 'PyTorch', 'Data Science'],
    'data science': ['Data Science', 'Python', 'Machine Learning', 'Analytics'],
    'tensorflow': ['TensorFlow', 'Machine Learning', 'Python', 'AI'],
    'pytorch': ['PyTorch', 'Machine Learning', 'Python', 'AI']
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
    'developer': ['Developer', 'Software Developer', 'Programmer', 'Software Engineer'],
    'engineer': ['Engineer', 'Software Engineer', 'Developer', 'Programmer'],
    'game developer': ['Game Developer', 'Game Programmer', 'Unity Developer', 'Unreal Developer'],
    'software engineer': ['Software Engineer', 'Developer', 'Programmer', 'Software Developer'],
    'frontend developer': ['Frontend Developer', 'UI Developer', 'React Developer', 'Web Developer'],
    'backend developer': ['Backend Developer', 'API Developer', 'Server Developer'],
    'devops engineer': ['DevOps Engineer', 'Site Reliability Engineer', 'Platform Engineer'],
    'data scientist': ['Data Scientist', 'ML Engineer', 'Data Analyst', 'AI Engineer']
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

    // Check for technology keywords - extended list
    const techKeywords = [
      'react', 'angular', 'vue', 'python', 'java', 'javascript', 'typescript', 
      'unity', 'unreal', 'c#', 'c++', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin',
      'aws', 'azure', 'docker', 'kubernetes', 'terraform', 'node.js', 'django', 'flask',
      'spring', 'machine learning', 'data science', 'tensorflow', 'pytorch'
    ];
    
    techKeywords.forEach(tech => {
      if (query.includes(tech)) {
        skills.add(tech);
      }
    });

    // Extract individual words and check if they match common tech terms
    const words = query.split(/\s+/);
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (Object.keys(this.SKILL_MAPPINGS).includes(cleanWord)) {
        skills.add(cleanWord);
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
    
    Object.entries(this.ROLE_MAPPINGS).forEach(([primaryRole, variations]) => {
      if (query.includes(primaryRole)) {
        variations.forEach(mapped => roles.add(mapped));
      }
      
      variations.forEach(variation => {
        if (query.includes(variation.toLowerCase())) {
          roles.add(primaryRole);
        }
      });
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
    if (skills.some(skill => ['python', 'java', 'javascript'].includes(skill.toLowerCase()))) {
      return 'backend_development_search';
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
    const { enhancedSkills, normalizedLocation, searchIntent, skills } = parsedQuery;

    // Always ensure we have some search terms
    const searchSkills = enhancedSkills.length > 0 ? enhancedSkills : skills;
    const location = normalizedLocation[0] || '';

    if (searchIntent === 'game_development_search') {
      // Game development specific searches
      if (searchSkills.includes('Unity') || skills.includes('unity')) {
        queries.push(`language:c# unity game${location ? ` location:"${location}"` : ''} repos:>=3`);
      }
      if (searchSkills.includes('Unreal Engine') || skills.includes('unreal')) {
        queries.push(`language:c++ unreal game${location ? ` location:"${location}"` : ''} repos:>=3`);
      }
    } else {
      // Programming language based searches
      const languageMap = {
        'Python': 'python',
        'JavaScript': 'javascript', 
        'TypeScript': 'typescript',
        'Java': 'java',
        'C#': 'csharp',
        'C++': 'cpp',
        'Go': 'go',
        'Rust': 'rust',
        'PHP': 'php',
        'Ruby': 'ruby'
      };

      // Create language-based queries
      searchSkills.slice(0, 3).forEach(skill => {
        const language = languageMap[skill];
        if (language) {
          queries.push(`language:${language}${location ? ` location:"${location}"` : ''} repos:>=5 followers:>=10`);
        } else {
          // Generic skill search
          queries.push(`${skill.toLowerCase()}${location ? ` location:"${location}"` : ''} repos:>=5 followers:>=10`);
        }
      });
    }

    // Fallback strategy if no specific queries generated
    if (queries.length === 0) {
      const queryTerms = parsedQuery.originalQuery.split(' ').slice(0, 2).join(' ');
      queries.push(`${queryTerms} developer${location ? ` location:"${location}"` : ''} repos:>=2`);
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
