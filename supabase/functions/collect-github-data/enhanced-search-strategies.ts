
export interface EnhancedSearchStrategy {
  name: string;
  queries: string[];
  priority: number;
  expectedResults: number;
}

export class GitHubSearchStrategies {
  static generateMultiQueryStrategies(query: string, location?: string): EnhancedSearchStrategy[] {
    const strategies: EnhancedSearchStrategy[] = [];
    const queryLower = query.toLowerCase();
    
    // Extract skills and technologies from query
    const techKeywords = this.extractTechKeywords(queryLower);
    const roleKeywords = this.extractRoleKeywords(queryLower);
    
    // Strategy 1: Language-specific searches
    if (techKeywords.languages.length > 0) {
      const languageQueries = techKeywords.languages.map(lang => 
        `language:${lang}${location ? ` location:"${location}"` : ''} repos:>=5 followers:>=10`
      );
      strategies.push({
        name: 'language_specific',
        queries: languageQueries,
        priority: 10,
        expectedResults: 15
      });
    }

    // Strategy 2: Technology stack combinations
    if (techKeywords.frameworks.length > 0) {
      const stackQueries = techKeywords.frameworks.map(framework => 
        `${framework} in:bio,readme${location ? ` location:"${location}"` : ''} repos:>=3 followers:>=5`
      );
      strategies.push({
        name: 'tech_stack',
        queries: stackQueries,
        priority: 9,
        expectedResults: 12
      });
    }

    // Strategy 3: Role-based searches with experience indicators
    if (roleKeywords.length > 0) {
      const roleQueries = roleKeywords.map(role => 
        `"${role}" in:bio${location ? ` location:"${location}"` : ''} repos:>=5 followers:>=10`
      );
      strategies.push({
        name: 'role_based',
        queries: roleQueries,
        priority: 8,
        expectedResults: 10
      });
    }

    // Strategy 4: Company and domain searches
    const companyKeywords = this.extractCompanyKeywords(queryLower);
    if (companyKeywords.length > 0) {
      const companyQueries = companyKeywords.map(company => 
        `company:"${company}"${location ? ` location:"${location}"` : ''} repos:>=3`
      );
      strategies.push({
        name: 'company_based',
        queries: companyQueries,
        priority: 7,
        expectedResults: 8
      });
    }

    // Strategy 5: Skill combination searches
    if (techKeywords.skills.length >= 2) {
      const skillCombinations = this.generateSkillCombinations(techKeywords.skills);
      const skillQueries = skillCombinations.map(combo => 
        `${combo.join(' ')} in:bio,readme${location ? ` location:"${location}"` : ''} repos:>=3`
      );
      strategies.push({
        name: 'skill_combinations',
        queries: skillQueries.slice(0, 3), // Limit to top 3 combinations
        priority: 6,
        expectedResults: 10
      });
    }

    // Fallback strategy: Broad search
    strategies.push({
      name: 'fallback_broad',
      queries: [`${query} in:bio,name type:user repos:>=2${location ? ` location:"${location}"` : ''}`],
      priority: 1,
      expectedResults: 20
    });

    return strategies.sort((a, b) => b.priority - a.priority);
  }

  private static extractTechKeywords(query: string) {
    const languages = ['python', 'javascript', 'typescript', 'java', 'go', 'rust', 'php', 'ruby', 'c++', 'c#', 'swift', 'kotlin'];
    const frameworks = ['react', 'angular', 'vue', 'django', 'flask', 'spring', 'laravel', 'rails', 'express', 'fastapi'];
    const skills = ['api', 'rest', 'graphql', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'mongodb', 'postgresql', 'redis'];
    
    return {
      languages: languages.filter(lang => query.includes(lang)),
      frameworks: frameworks.filter(fw => query.includes(fw)),
      skills: skills.filter(skill => query.includes(skill))
    };
  }

  private static extractRoleKeywords(query: string): string[] {
    const roles = [
      'software engineer', 'developer', 'backend developer', 'frontend developer', 
      'full stack developer', 'data scientist', 'devops engineer', 'lead developer',
      'senior developer', 'principal engineer', 'staff engineer', 'architect'
    ];
    
    return roles.filter(role => query.includes(role));
  }

  private static extractCompanyKeywords(query: string): string[] {
    const companies = ['google', 'microsoft', 'amazon', 'facebook', 'apple', 'netflix', 'uber', 'airbnb'];
    return companies.filter(company => query.includes(company));
  }

  private static generateSkillCombinations(skills: string[]): string[][] {
    const combinations: string[][] = [];
    for (let i = 0; i < skills.length; i++) {
      for (let j = i + 1; j < skills.length; j++) {
        combinations.push([skills[i], skills[j]]);
      }
    }
    return combinations.slice(0, 5); // Limit combinations
  }
}
