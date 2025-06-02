
import { searchGitHubUsers, getGitHubUserProfile, getGitHubUserRepos } from './api-client.ts';
import { EnhancedSearchStrategy, GitHubSearchStrategies } from './enhanced-search-strategies.ts';
import { EnhancedProfileBuilder } from './enhanced-profile-builder.ts';
import { validateGitHubUser } from './user-validator.ts';

export interface MultiQueryResult {
  candidates: any[];
  strategiesUsed: string[];
  totalQueriesExecuted: number;
  resultDistribution: Record<string, number>;
}

export class MultiQueryExecutor {
  private seenUsers = new Set<string>();
  private candidates: any[] = [];
  private strategiesUsed: string[] = [];
  private resultDistribution: Record<string, number> = {};

  async executeEnhancedSearch(
    query: string, 
    location?: string, 
    targetResults: number = 15,
    maxProcessingTime: number = 15000
  ): Promise<MultiQueryResult> {
    const startTime = Date.now();
    const strategies = GitHubSearchStrategies.generateMultiQueryStrategies(query, location);
    
    console.log(`🎯 Generated ${strategies.length} search strategies for enhanced results`);

    for (const strategy of strategies) {
      if (Date.now() - startTime > maxProcessingTime) {
        console.log('⏰ Time limit reached, stopping strategy execution');
        break;
      }

      if (this.candidates.length >= targetResults) {
        console.log(`✅ Target of ${targetResults} results reached`);
        break;
      }

      await this.executeStrategy(strategy, startTime, maxProcessingTime);
    }

    return {
      candidates: this.candidates,
      strategiesUsed: this.strategiesUsed,
      totalQueriesExecuted: this.strategiesUsed.length,
      resultDistribution: this.resultDistribution
    };
  }

  private async executeStrategy(
    strategy: EnhancedSearchStrategy, 
    startTime: number, 
    maxProcessingTime: number
  ) {
    console.log(`🔍 Executing strategy: ${strategy.name} with ${strategy.queries.length} queries`);
    this.strategiesUsed.push(strategy.name);
    this.resultDistribution[strategy.name] = 0;

    for (const searchQuery of strategy.queries) {
      if (Date.now() - startTime > maxProcessingTime) {
        console.log(`⏰ Time limit reached during ${strategy.name} execution`);
        break;
      }

      try {
        const { users } = await searchGitHubUsers(searchQuery, 'followers', 30);
        console.log(`📋 Strategy ${strategy.name} found ${users.length} users with query: "${searchQuery}"`);

        const processedInThisQuery = await this.processUsers(users, 8); // Process up to 8 per query
        this.resultDistribution[strategy.name] += processedInThisQuery;

        // Brief pause between queries to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Strategy ${strategy.name} query failed:`, error.message);
        continue;
      }
    }

    console.log(`✅ Strategy ${strategy.name} completed: ${this.resultDistribution[strategy.name]} candidates added`);
  }

  private async processUsers(users: any[], maxPerQuery: number): Promise<number> {
    let processed = 0;
    
    for (const user of users.slice(0, maxPerQuery)) {
      if (this.seenUsers.has(user.login)) continue;
      this.seenUsers.add(user.login);

      if (!validateGitHubUser(user)) {
        console.log(`❌ User ${user.login} failed validation`);
        continue;
      }

      try {
        const userProfile = await getGitHubUserProfile(user.login);
        if (!userProfile) continue;

        // Get top repositories for enhanced profile building
        const repos = await getGitHubUserRepos(user.login, 10);
        
        const enhancedProfile = EnhancedProfileBuilder.buildComprehensiveProfile(userProfile, repos);
        
        const candidate = this.buildEnhancedCandidate(enhancedProfile, userProfile);
        this.candidates.push(candidate);
        processed++;

        console.log(`💾 Enhanced candidate: ${candidate.name} (${user.login}) - ${enhancedProfile.experience.seniorityLevel}`);

      } catch (error) {
        console.log(`❌ Error processing user ${user.login}:`, error.message);
        continue;
      }
    }

    return processed;
  }

  private buildEnhancedCandidate(enhancedProfile: any, userProfile: any) {
    const totalScore = this.calculateEnhancedScore(enhancedProfile);
    
    return {
      id: `github_${userProfile.login}_${Date.now()}`,
      name: enhancedProfile.basicInfo.name,
      title: this.generateTitle(enhancedProfile),
      location: enhancedProfile.basicInfo.location || '',
      avatar_url: enhancedProfile.basicInfo.avatar_url,
      email: enhancedProfile.basicInfo.email,
      github_username: userProfile.login,
      summary: this.generateEnhancedSummary(enhancedProfile),
      skills: [
        ...enhancedProfile.skills.languages,
        ...enhancedProfile.skills.frameworks,
        ...enhancedProfile.skills.tools
      ].slice(0, 10),
      experience_years: enhancedProfile.experience.estimatedYears,
      last_active: userProfile.updated_at,
      overall_score: totalScore,
      skill_match: this.calculateSkillMatch(enhancedProfile),
      reputation: enhancedProfile.socialProof.followerScore + enhancedProfile.socialProof.contributionScore,
      experience: enhancedProfile.experience.estimatedYears * 5,
      social_proof: enhancedProfile.socialProof.repositoryScore,
      freshness: this.calculateFreshness(userProfile.updated_at),
      platform: 'github',
      enhanced_profile: enhancedProfile
    };
  }

  private generateTitle(profile: any): string {
    const { seniorityLevel } = profile.experience;
    const primarySkills = profile.skills.languages.slice(0, 2);
    const frameworks = profile.skills.frameworks.slice(0, 1);
    
    let title = seniorityLevel + ' Developer';
    
    if (primarySkills.length > 0) {
      title = `${seniorityLevel} ${primarySkills.join('/')} Developer`;
    }
    
    if (frameworks.length > 0) {
      title += ` (${frameworks[0]})`;
    }
    
    return title;
  }

  private generateEnhancedSummary(profile: any): string {
    const { basicInfo, experience, skills, socialProof } = profile;
    
    let summary = `${basicInfo.name} is a ${experience.seniorityLevel} developer`;
    
    if (basicInfo.location) {
      summary += ` based in ${basicInfo.location}`;
    }
    
    summary += ` with approximately ${experience.estimatedYears} years of experience.`;
    
    if (skills.languages.length > 0) {
      summary += ` Specializes in ${skills.languages.slice(0, 3).join(', ')}`;
    }
    
    if (skills.frameworks.length > 0) {
      summary += ` with expertise in ${skills.frameworks.slice(0, 2).join(' and ')}.`;
    }
    
    if (socialProof.contributionScore > 20) {
      summary += ` Active contributor with strong community engagement.`;
    }
    
    if (basicInfo.company) {
      summary += ` Currently associated with ${basicInfo.company}.`;
    }
    
    return summary;
  }

  private calculateEnhancedScore(profile: any): number {
    const weights = {
      experience: 0.3,
      socialProof: 0.25,
      skillDiversity: 0.2,
      activity: 0.15,
      completeness: 0.1
    };

    const experienceScore = Math.min(profile.experience.estimatedYears * 10, 100);
    const socialScore = (profile.socialProof.followerScore + profile.socialProof.contributionScore + profile.socialProof.repositoryScore) / 3;
    const skillScore = (profile.skills.languages.length + profile.skills.frameworks.length + profile.skills.tools.length) * 3;
    const activityScore = profile.activity.public_repos * 2;
    const completenessScore = this.calculateCompletenessScore(profile);

    return Math.round(
      experienceScore * weights.experience +
      socialScore * weights.socialProof +
      Math.min(skillScore, 100) * weights.skillDiversity +
      Math.min(activityScore, 100) * weights.activity +
      completenessScore * weights.completeness
    );
  }

  private calculateSkillMatch(profile: any): number {
    // This would be enhanced based on the original query
    const totalSkills = profile.skills.languages.length + profile.skills.frameworks.length + profile.skills.tools.length;
    return Math.min(totalSkills * 8, 100);
  }

  private calculateFreshness(lastActive: string): number {
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const daysSinceActive = (now.getTime() - lastActiveDate.getTime()) / (24 * 60 * 60 * 1000);
    
    if (daysSinceActive <= 7) return 100;
    if (daysSinceActive <= 30) return 80;
    if (daysSinceActive <= 90) return 60;
    if (daysSinceActive <= 180) return 40;
    return 20;
  }

  private calculateCompletenessScore(profile: any): number {
    let score = 0;
    const checks = [
      !!profile.basicInfo.name,
      !!profile.basicInfo.bio,
      !!profile.basicInfo.location,
      !!profile.basicInfo.company,
      profile.skills.languages.length > 0,
      profile.skills.frameworks.length > 0,
      profile.activity.public_repos > 0,
      profile.socialProof.followerScore > 0
    ];
    
    return (checks.filter(Boolean).length / checks.length) * 100;
  }
}
