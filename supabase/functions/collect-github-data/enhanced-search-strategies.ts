
// Enhanced search strategies for GitHub data collection
// Independent of src directory to work in edge function environment

export interface ParsedQuery {
  searchIntent: string;
  enhancedSkills: string[];
  normalizedLocation: string[];
  confidence: number;
  skills: string[];
  originalQuery: string;
}

export interface GitHubSearchStrategy {
  name: string;
  query: string;
  priority: number;
  expectedResults: number;
}

export class EnhancedGitHubSearchStrategies {
  private static readonly SKILL_MAPPINGS = {
    'python': ['Python', 'Django', 'Flask', 'FastAPI'],
    'javascript': ['JavaScript', 'TypeScript', 'Node.js', 'React'],
    'java': ['Java', 'Spring', 'Spring Boot'],
    'c#': ['C#', '.NET', 'ASP.NET'],
    'unity': ['Unity', 'C#', 'Game Development'],
    'unreal': ['Unreal Engine', 'C++', 'Game Development'],
    'react': ['React', 'JavaScript', 'Frontend'],
    'angular': ['Angular', 'TypeScript', 'Frontend'],
    'vue': ['Vue.js', 'JavaScript', 'Frontend'],
    'aws': ['AWS', 'Cloud', 'DevOps'],
    'kubernetes': ['Kubernetes', 'Docker', 'DevOps']
  };

  static parseQueryForGitHub(query: string, location?: string): ParsedQuery {
    const normalizedQuery = query.toLowerCase().trim();
    const skills = new Set<string>();
    const enhancedSkills = new Set<string>();
    
    // Extract skills from query
    Object.entries(this.SKILL_MAPPINGS).forEach(([skill, variants]) => {
      if (normalizedQuery.includes(skill)) {
        skills.add(skill);
        variants.forEach(variant => enhancedSkills.add(variant));
      }
    });

    // Extract common programming languages even if not in mappings
    const commonLangs = ['python', 'java', 'javascript', 'typescript', 'go', 'rust', 'php', 'ruby', 'swift'];
    commonLangs.forEach(lang => {
      if (normalizedQuery.includes(lang)) {
        skills.add(lang);
        enhancedSkills.add(lang.charAt(0).toUpperCase() + lang.slice(1));
      }
    });

    // Determine search intent
    let searchIntent = 'general_tech_search';
    if (Array.from(skills).some(skill => ['unity', 'unreal'].includes(skill))) {
      searchIntent = 'game_development_search';
    } else if (Array.from(skills).some(skill => ['react', 'angular', 'vue'].includes(skill))) {
      searchIntent = 'frontend_development_search';
    } else if (Array.from(skills).some(skill => ['aws', 'kubernetes', 'docker'].includes(skill))) {
      searchIntent = 'devops_search';
    }

    return {
      originalQuery: query,
      searchIntent,
      skills: Array.from(skills),
      enhancedSkills: Array.from(enhancedSkills),
      normalizedLocation: location ? [location] : [],
      confidence: skills.size > 0 ? 80 : 50
    };
  }

  static generateStrategiesFromParsedQuery(parsedQuery: ParsedQuery, location?: string): GitHubSearchStrategy[] {
    const strategies: GitHubSearchStrategy[] = [];
    
    // Game Development Strategies
    if (parsedQuery.searchIntent === 'game_development_search') {
      strategies.push(...this.buildGameDevStrategies(parsedQuery, location));
    }
    
    // Frontend Development Strategies
    else if (parsedQuery.searchIntent === 'frontend_development_search') {
      strategies.push(...this.buildFrontendStrategies(parsedQuery, location));
    }
    
    // DevOps Strategies
    else if (parsedQuery.searchIntent === 'devops_search') {
      strategies.push(...this.buildDevOpsStrategies(parsedQuery, location));
    }
    
    // General Tech Strategies - Always add these as fallback
    strategies.push(...this.buildGeneralTechStrategies(parsedQuery, location));

    // Ensure we always have at least one strategy
    if (strategies.length === 0) {
      strategies.push(this.buildFallbackStrategy(parsedQuery, location));
    }

    // Sort by priority and return top strategies
    return strategies
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);
  }

  private static buildGameDevStrategies(parsedQuery: ParsedQuery, location?: string): GitHubSearchStrategy[] {
    const strategies: GitHubSearchStrategy[] = [];
    const locationQuery = location ? ` location:"${location}"` : '';

    // Unity specific searches
    if (parsedQuery.skills.includes('unity') || parsedQuery.enhancedSkills.includes('Unity')) {
      strategies.push({
        name: 'unity_csharp_game',
        query: `language:csharp unity game${locationQuery} repos:>=3 followers:>=5`,
        priority: 10,
        expectedResults: 15
      });
    }

    // Unreal Engine specific searches
    if (parsedQuery.skills.includes('unreal') || parsedQuery.enhancedSkills.includes('Unreal Engine')) {
      strategies.push({
        name: 'unreal_cpp_game',
        query: `language:cpp unreal engine${locationQuery} repos:>=3 followers:>=5`,
        priority: 10,
        expectedResults: 15
      });
    }

    return strategies;
  }

  private static buildFrontendStrategies(parsedQuery: ParsedQuery, location?: string): GitHubSearchStrategy[] {
    const strategies: GitHubSearchStrategy[] = [];
    const locationQuery = location ? ` location:"${location}"` : '';

    // React specific
    if (parsedQuery.skills.includes('react') || parsedQuery.enhancedSkills.includes('React')) {
      strategies.push({
        name: 'react_developer',
        query: `language:javascript react${locationQuery} repos:>=5 followers:>=10`,
        priority: 10,
        expectedResults: 20
      });
    }

    return strategies;
  }

  private static buildDevOpsStrategies(parsedQuery: ParsedQuery, location?: string): GitHubSearchStrategy[] {
    const strategies: GitHubSearchStrategy[] = [];
    const locationQuery = location ? ` location:"${location}"` : '';

    // Kubernetes/Docker
    if (parsedQuery.skills.includes('kubernetes')) {
      strategies.push({
        name: 'kubernetes_devops',
        query: `kubernetes docker${locationQuery} repos:>=5 followers:>=10`,
        priority: 10,
        expectedResults: 15
      });
    }

    return strategies;
  }

  private static buildGeneralTechStrategies(parsedQuery: ParsedQuery, location?: string): GitHubSearchStrategy[] {
    const strategies: GitHubSearchStrategy[] = [];
    const locationQuery = location ? ` location:"${location}"` : '';

    // Language-based searches
    const languageMap = {
      'python': 'python',
      'java': 'java',
      'javascript': 'javascript',
      'typescript': 'typescript',
      'go': 'go',
      'rust': 'rust',
      'php': 'php',
      'ruby': 'ruby',
      'c#': 'csharp',
      'c++': 'cpp'
    };

    // Use detected skills for targeted searches
    parsedQuery.skills.slice(0, 3).forEach((skill, index) => {
      const language = languageMap[skill.toLowerCase()];
      if (language) {
        strategies.push({
          name: `language_${language}`,
          query: `language:${language}${locationQuery} repos:>=5 followers:>=10`,
          priority: 8 - index,
          expectedResults: 15
        });
      } else {
        // General skill search
        strategies.push({
          name: `skill_${skill.toLowerCase()}`,
          query: `${skill.toLowerCase()}${locationQuery} repos:>=5 followers:>=10`,
          priority: 7 - index,
          expectedResults: 12
        });
      }
    });

    return strategies;
  }

  private static buildFallbackStrategy(parsedQuery: ParsedQuery, location?: string): GitHubSearchStrategy {
    const locationQuery = location ? ` location:"${location}"` : '';
    const queryTerms = parsedQuery.originalQuery.split(' ').slice(0, 2).join(' ');
    
    return {
      name: 'fallback_search',
      query: `${queryTerms} developer${locationQuery} repos:>=2`,
      priority: 5,
      expectedResults: 10
    };
  }
}
