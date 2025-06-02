
export interface EnhancedGitHubProfile {
  basicInfo: {
    name: string;
    login: string;
    bio?: string;
    location?: string;
    email?: string;
    company?: string;
    blog?: string;
    avatar_url: string;
  };
  activity: {
    public_repos: number;
    followers: number;
    following: number;
    created_at: string;
    updated_at: string;
  };
  skills: {
    languages: string[];
    frameworks: string[];
    tools: string[];
    domains: string[];
  };
  experience: {
    estimatedYears: number;
    seniorityLevel: string;
    projectComplexity: string;
  };
  socialProof: {
    followerScore: number;
    contributionScore: number;
    repositoryScore: number;
  };
}

export class EnhancedProfileBuilder {
  static buildComprehensiveProfile(userProfile: any, repositories: any[] = []): EnhancedGitHubProfile {
    const basicInfo = this.extractBasicInfo(userProfile);
    const activity = this.extractActivity(userProfile);
    const skills = this.extractSkills(userProfile, repositories);
    const experience = this.calculateExperience(userProfile, repositories);
    const socialProof = this.calculateSocialProof(userProfile, repositories);

    return {
      basicInfo,
      activity,
      skills,
      experience,
      socialProof
    };
  }

  private static extractBasicInfo(profile: any) {
    return {
      name: profile.name || profile.login,
      login: profile.login,
      bio: profile.bio,
      location: profile.location,
      email: profile.email,
      company: profile.company,
      blog: profile.blog,
      avatar_url: profile.avatar_url
    };
  }

  private static extractActivity(profile: any) {
    return {
      public_repos: profile.public_repos || 0,
      followers: profile.followers || 0,
      following: profile.following || 0,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };
  }

  private static extractSkills(profile: any, repositories: any[]) {
    const languages = new Set<string>();
    const frameworks = new Set<string>();
    const tools = new Set<string>();
    const domains = new Set<string>();

    // Extract from bio
    if (profile.bio) {
      this.extractSkillsFromText(profile.bio, { languages, frameworks, tools, domains });
    }

    // Extract from repositories (if available)
    repositories.forEach(repo => {
      if (repo.language) {
        languages.add(repo.language);
      }
      if (repo.description) {
        this.extractSkillsFromText(repo.description, { languages, frameworks, tools, domains });
      }
      if (repo.topics) {
        repo.topics.forEach((topic: string) => {
          this.categorizeSkill(topic, { languages, frameworks, tools, domains });
        });
      }
    });

    return {
      languages: Array.from(languages),
      frameworks: Array.from(frameworks),
      tools: Array.from(tools),
      domains: Array.from(domains)
    };
  }

  private static extractSkillsFromText(text: string, skillSets: any) {
    const textLower = text.toLowerCase();
    
    const skillMappings = {
      languages: ['python', 'javascript', 'typescript', 'java', 'go', 'rust', 'php', 'ruby', 'c++', 'c#', 'swift', 'kotlin'],
      frameworks: ['react', 'angular', 'vue', 'django', 'flask', 'spring', 'laravel', 'rails', 'express', 'fastapi', 'nextjs'],
      tools: ['docker', 'kubernetes', 'git', 'jenkins', 'terraform', 'ansible', 'webpack', 'babel'],
      domains: ['machine learning', 'ai', 'blockchain', 'fintech', 'healthcare', 'e-commerce', 'gaming']
    };

    Object.entries(skillMappings).forEach(([category, skills]) => {
      skills.forEach(skill => {
        if (textLower.includes(skill)) {
          skillSets[category].add(skill);
        }
      });
    });
  }

  private static categorizeSkill(skill: string, skillSets: any) {
    const categories = {
      languages: ['python', 'javascript', 'typescript', 'java', 'go', 'rust'],
      frameworks: ['react', 'angular', 'vue', 'django', 'flask', 'spring'],
      tools: ['docker', 'kubernetes', 'git', 'ci-cd'],
      domains: ['ml', 'ai', 'web', 'mobile', 'data']
    };

    Object.entries(categories).forEach(([category, keywords]) => {
      if (keywords.some(keyword => skill.includes(keyword))) {
        skillSets[category].add(skill);
      }
    });
  }

  private static calculateExperience(profile: any, repositories: any[]) {
    const accountAge = this.calculateAccountAge(profile.created_at);
    const repoCount = profile.public_repos || 0;
    const avgRepoAge = this.calculateAverageRepoAge(repositories);
    
    const estimatedYears = Math.min(
      Math.max(
        accountAge,
        repoCount * 0.1, // Each repo represents ~1.2 months experience
        avgRepoAge * 0.8
      ),
      15 // Cap at 15 years
    );

    const seniorityLevel = this.determineSeniorityLevel(estimatedYears, repoCount, profile.followers);
    const projectComplexity = this.assessProjectComplexity(repositories);

    return {
      estimatedYears: Math.round(estimatedYears),
      seniorityLevel,
      projectComplexity
    };
  }

  private static calculateAccountAge(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    return (now.getTime() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  }

  private static calculateAverageRepoAge(repositories: any[]): number {
    if (repositories.length === 0) return 0;
    
    const ages = repositories.map(repo => this.calculateAccountAge(repo.created_at));
    return ages.reduce((sum, age) => sum + age, 0) / ages.length;
  }

  private static determineSeniorityLevel(years: number, repoCount: number, followers: number): string {
    const score = years * 2 + (repoCount / 10) + (followers / 50);
    
    if (score >= 15) return 'Senior/Lead';
    if (score >= 8) return 'Mid-Level';
    if (score >= 3) return 'Junior';
    return 'Entry-Level';
  }

  private static assessProjectComplexity(repositories: any[]): string {
    if (repositories.length === 0) return 'Unknown';
    
    const complexityIndicators = repositories.reduce((acc, repo) => {
      if (repo.stargazers_count > 50) acc.highImpact++;
      if (repo.forks_count > 10) acc.collaborative++;
      if (repo.size > 1000) acc.substantial++;
      return acc;
    }, { highImpact: 0, collaborative: 0, substantial: 0 });

    const total = Object.values(complexityIndicators).reduce((sum, val) => sum + val, 0);
    
    if (total >= 10) return 'High Complexity';
    if (total >= 5) return 'Medium Complexity';
    if (total >= 2) return 'Basic Projects';
    return 'Simple Projects';
  }

  private static calculateSocialProof(profile: any, repositories: any[]) {
    const followerScore = Math.min(profile.followers || 0, 1000) / 10;
    
    const totalStars = repositories.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
    const contributionScore = Math.min(totalStars, 500) / 5;
    
    const repositoryScore = Math.min(profile.public_repos || 0, 100);

    return {
      followerScore: Math.round(followerScore),
      contributionScore: Math.round(contributionScore),
      repositoryScore
    };
  }
}
