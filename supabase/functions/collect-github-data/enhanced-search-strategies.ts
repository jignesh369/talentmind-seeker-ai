
// Enhanced search strategies for GitHub data collection
// Independent of src directory to work in edge function environment

export interface ParsedQuery {
  searchIntent: string;
  enhancedSkills: string[];
  normalizedLocation: string[];
  confidence: number;
}

export interface GitHubSearchStrategy {
  name: string;
  query: string;
  priority: number;
  expectedResults: number;
}

export class EnhancedGitHubSearchStrategies {
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
    
    // General Tech Strategies
    else {
      strategies.push(...this.buildGeneralTechStrategies(parsedQuery, location));
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
    if (parsedQuery.enhancedSkills.includes('Unity')) {
      strategies.push({
        name: 'unity_csharp_game',
        query: `language:c# unity game${locationQuery} repos:>=3 followers:>=5`,
        priority: 10,
        expectedResults: 15
      });
      
      strategies.push({
        name: 'unity_developer',
        query: `"unity developer" in:bio${locationQuery} repos:>=5`,
        priority: 9,
        expectedResults: 12
      });
    }

    // Unreal Engine specific searches
    if (parsedQuery.enhancedSkills.includes('Unreal Engine')) {
      strategies.push({
        name: 'unreal_cpp_game',
        query: `language:c++ unreal engine${locationQuery} repos:>=3 followers:>=5`,
        priority: 10,
        expectedResults: 15
      });
      
      strategies.push({
        name: 'unreal_developer',
        query: `"unreal developer" in:bio${locationQuery} repos:>=5`,
        priority: 9,
        expectedResults: 12
      });
    }

    // General game development
    strategies.push({
      name: 'game_developer_general',
      query: `"game developer" in:bio${locationQuery} repos:>=3 followers:>=10`,
      priority: 8,
      expectedResults: 20
    });

    return strategies;
  }

  private static buildFrontendStrategies(parsedQuery: ParsedQuery, location?: string): GitHubSearchStrategy[] {
    const strategies: GitHubSearchStrategy[] = [];
    const locationQuery = location ? ` location:"${location}"` : '';

    // React specific
    if (parsedQuery.enhancedSkills.includes('React')) {
      strategies.push({
        name: 'react_developer',
        query: `language:javascript react${locationQuery} repos:>=5 followers:>=10`,
        priority: 10,
        expectedResults: 20
      });
    }

    // TypeScript specific
    if (parsedQuery.enhancedSkills.includes('TypeScript')) {
      strategies.push({
        name: 'typescript_developer',
        query: `language:typescript${locationQuery} repos:>=5 followers:>=10`,
        priority: 9,
        expectedResults: 18
      });
    }

    return strategies;
  }

  private static buildDevOpsStrategies(parsedQuery: ParsedQuery, location?: string): GitHubSearchStrategy[] {
    const strategies: GitHubSearchStrategy[] = [];
    const locationQuery = location ? ` location:"${location}"` : '';

    // Kubernetes/Docker
    if (parsedQuery.enhancedSkills.includes('Kubernetes')) {
      strategies.push({
        name: 'kubernetes_devops',
        query: `kubernetes docker${locationQuery} repos:>=5 followers:>=10`,
        priority: 10,
        expectedResults: 15
      });
    }

    // AWS
    if (parsedQuery.enhancedSkills.includes('AWS')) {
      strategies.push({
        name: 'aws_devops',
        query: `aws cloud${locationQuery} repos:>=5 followers:>=10`,
        priority: 9,
        expectedResults: 18
      });
    }

    return strategies;
  }

  private static buildGeneralTechStrategies(parsedQuery: ParsedQuery, location?: string): GitHubSearchStrategy[] {
    const strategies: GitHubSearchStrategy[] = [];
    const locationQuery = location ? ` location:"${location}"` : '';

    // Use enhanced skills for better targeting
    parsedQuery.enhancedSkills.slice(0, 3).forEach((skill, index) => {
      strategies.push({
        name: `general_${skill.toLowerCase().replace(/\s+/g, '_')}`,
        query: `${skill.toLowerCase()}${locationQuery} repos:>=5 followers:>=10`,
        priority: 8 - index,
        expectedResults: 15
      });
    });

    return strategies;
  }
}
