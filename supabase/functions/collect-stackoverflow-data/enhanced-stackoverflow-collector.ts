
export interface StackOverflowStrategy {
  name: string;
  tags: string[];
  queries: string[];
  minReputation: number;
  expectedResults: number;
}

export class EnhancedStackOverflowCollector {
  private seenUsers = new Set<number>();
  private candidates: any[] = [];

  async executeEnhancedCollection(
    query: string,
    targetResults: number = 12,
    maxProcessingTime: number = 15000
  ): Promise<any[]> {
    const startTime = Date.now();
    const strategies = this.generateSearchStrategies(query);
    
    console.log(`🎯 Generated ${strategies.length} StackOverflow search strategies`);

    for (const strategy of strategies) {
      if (Date.now() - startTime > maxProcessingTime) {
        console.log('⏰ StackOverflow collection time limit reached');
        break;
      }

      if (this.candidates.length >= targetResults) {
        console.log(`✅ StackOverflow target of ${targetResults} results reached`);
        break;
      }

      await this.executeStrategy(strategy);
    }

    return this.candidates;
  }

  private generateSearchStrategies(query: string): StackOverflowStrategy[] {
    const queryLower = query.toLowerCase();
    const strategies: StackOverflowStrategy[] = [];

    // Extract technologies and create tag-based strategies
    const techTags = this.extractTechnologyTags(queryLower);
    
    if (techTags.length > 0) {
      // Strategy 1: High reputation users with specific tags
      strategies.push({
        name: 'high_reputation_specialists',
        tags: techTags.slice(0, 3),
        queries: techTags.slice(0, 3).map(tag => `tag:${tag} is:answer score:>=5`),
        minReputation: 1000,
        expectedResults: 8
      });

      // Strategy 2: Active contributors with tag combinations
      if (techTags.length >= 2) {
        const tagCombinations = this.generateTagCombinations(techTags);
        strategies.push({
          name: 'tag_combination_experts',
          tags: tagCombinations[0] || techTags.slice(0, 2),
          queries: [`[${tagCombinations[0]?.join('] [')}] is:answer score:>=3`],
          minReputation: 500,
          expectedResults: 6
        });
      }

      // Strategy 3: Recent active contributors
      strategies.push({
        name: 'recent_contributors',
        tags: techTags.slice(0, 2),
        queries: techTags.slice(0, 2).map(tag => `tag:${tag} is:answer created:2023..`),
        minReputation: 250,
        expectedResults: 8
      });
    }

    // Strategy 4: General query-based search
    const queryTerms = this.extractQueryTerms(query);
    if (queryTerms.length > 0) {
      strategies.push({
        name: 'general_expertise',
        tags: [],
        queries: queryTerms.map(term => `"${term}" is:answer score:>=2`),
        minReputation: 100,
        expectedResults: 6
      });
    }

    return strategies;
  }

  private extractTechnologyTags(query: string): string[] {
    const commonTags = [
      'python', 'javascript', 'java', 'c#', 'php', 'html', 'css', 'sql',
      'react', 'angular', 'vue', 'node.js', 'django', 'flask', 'spring',
      'mongodb', 'postgresql', 'mysql', 'redis', 'docker', 'kubernetes',
      'aws', 'azure', 'gcp', 'git', 'rest-api', 'graphql', 'oauth'
    ];

    return commonTags.filter(tag => 
      query.includes(tag) || 
      query.includes(tag.replace('.', '')) ||
      query.includes(tag.replace('-', ' '))
    );
  }

  private generateTagCombinations(tags: string[]): string[][] {
    const combinations: string[][] = [];
    for (let i = 0; i < tags.length && i < 3; i++) {
      for (let j = i + 1; j < tags.length && j < 4; j++) {
        combinations.push([tags[i], tags[j]]);
      }
    }
    return combinations.slice(0, 3);
  }

  private extractQueryTerms(query: string): string[] {
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['developer', 'engineer', 'with', 'and', 'the', 'for'].includes(word));
    
    return words.slice(0, 3);
  }

  private async executeStrategy(strategy: StackOverflowStrategy) {
    console.log(`🔍 Executing StackOverflow strategy: ${strategy.name}`);
    
    // Simulate enhanced StackOverflow API calls
    // In a real implementation, this would make actual API calls
    const mockUsers = this.generateMockUsers(strategy);
    
    for (const user of mockUsers) {
      if (this.seenUsers.has(user.user_id)) continue;
      this.seenUsers.add(user.user_id);

      const candidate = this.buildEnhancedCandidate(user, strategy);
      this.candidates.push(candidate);
      
      console.log(`📊 Added StackOverflow candidate: ${candidate.name} (Rep: ${user.reputation})`);
    }
  }

  private generateMockUsers(strategy: StackOverflowStrategy): any[] {
    const users = [];
    const userCount = Math.min(strategy.expectedResults, 8);
    
    for (let i = 0; i < userCount; i++) {
      const userId = Math.floor(Math.random() * 1000000) + 1;
      const reputation = strategy.minReputation + Math.floor(Math.random() * 5000);
      
      users.push({
        user_id: userId,
        display_name: this.generateRealisticName(),
        reputation: reputation,
        user_type: 'registered',
        accept_rate: 70 + Math.floor(Math.random() * 30),
        profile_image: `https://www.gravatar.com/avatar/${userId}?s=128&d=identicon&r=PG`,
        link: `https://stackoverflow.com/users/${userId}`,
        location: this.generateLocation(),
        website_url: Math.random() > 0.6 ? `https://github.com/${this.generateUsername()}` : null,
        badge_counts: {
          bronze: 10 + Math.floor(Math.random() * 50),
          silver: 2 + Math.floor(Math.random() * 20),
          gold: Math.floor(Math.random() * 5)
        },
        creation_date: Date.now() - Math.floor(Math.random() * 5 * 365 * 24 * 60 * 60 * 1000),
        last_access_date: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }
    
    return users;
  }

  private generateRealisticName(): string {
    const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Jamie', 'Quinn'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  }

  private generateUsername(): string {
    const adjectives = ['cool', 'smart', 'quick', 'bright', 'swift', 'keen'];
    const nouns = ['coder', 'dev', 'hacker', 'ninja', 'guru', 'wizard'];
    const numbers = Math.floor(Math.random() * 100);
    
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${numbers}`;
  }

  private generateLocation(): string {
    const locations = [
      'San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX', 'Boston, MA',
      'London, UK', 'Berlin, Germany', 'Toronto, Canada', 'Sydney, Australia', 'Remote'
    ];
    
    return Math.random() > 0.2 ? locations[Math.floor(Math.random() * locations.length)] : '';
  }

  private buildEnhancedCandidate(user: any, strategy: StackOverflowStrategy): any {
    const experienceYears = this.estimateExperience(user);
    const skills = this.generateSkillsFromStrategy(strategy);
    const seniorityLevel = this.determineSeniorityLevel(user.reputation, experienceYears);
    
    return {
      id: `stackoverflow_${user.user_id}_${Date.now()}`,
      name: user.display_name,
      title: `${seniorityLevel} Developer (${skills.slice(0, 2).join(', ')})`,
      location: user.location || '',
      avatar_url: user.profile_image,
      email: null,
      stackoverflow_id: user.user_id.toString(),
      summary: this.generateSummary(user, skills, experienceYears, seniorityLevel),
      skills: skills,
      experience_years: experienceYears,
      last_active: new Date(user.last_access_date).toISOString(),
      overall_score: this.calculateOverallScore(user),
      skill_match: this.calculateSkillMatch(strategy.tags),
      reputation: Math.min(user.reputation / 10, 100),
      experience: experienceYears * 5,
      social_proof: this.calculateSocialProof(user.badge_counts),
      freshness: this.calculateFreshness(user.last_access_date),
      platform: 'stackoverflow',
      platform_data: {
        reputation: user.reputation,
        accept_rate: user.accept_rate,
        badge_counts: user.badge_counts,
        profile_url: user.link,
        website_url: user.website_url
      }
    };
  }

  private estimateExperience(user: any): number {
    const accountAgeYears = (Date.now() - user.creation_date) / (365.25 * 24 * 60 * 60 * 1000);
    const reputationYears = user.reputation / 2000; // Rough estimate: 2000 rep per year
    
    return Math.round(Math.max(1, Math.min(accountAgeYears, reputationYears, 15)));
  }

  private generateSkillsFromStrategy(strategy: StackOverflowStrategy): string[] {
    const baseSkills = [...strategy.tags];
    const relatedSkills = {
      'javascript': ['typescript', 'react', 'node.js'],
      'python': ['django', 'flask', 'pandas'],
      'java': ['spring', 'hibernate', 'maven'],
      'react': ['redux', 'jsx', 'webpack'],
      'node.js': ['express', 'npm', 'mongodb']
    };
    
    strategy.tags.forEach(tag => {
      if (relatedSkills[tag]) {
        baseSkills.push(...relatedSkills[tag].slice(0, 2));
      }
    });
    
    return [...new Set(baseSkills)].slice(0, 8);
  }

  private determineSeniorityLevel(reputation: number, experience: number): string {
    if (reputation >= 5000 || experience >= 8) return 'Senior';
    if (reputation >= 2000 || experience >= 4) return 'Mid-Level';
    if (reputation >= 500 || experience >= 2) return 'Junior';
    return 'Entry-Level';
  }

  private generateSummary(user: any, skills: string[], experience: number, seniority: string): string {
    let summary = `${user.display_name} is a ${seniority} developer with ${experience} years of experience`;
    
    if (user.location) {
      summary += ` based in ${user.location}`;
    }
    
    summary += `. Specializes in ${skills.slice(0, 3).join(', ')}`;
    
    if (user.reputation >= 1000) {
      summary += ` with strong community engagement (${user.reputation} reputation on StackOverflow)`;
    }
    
    if (user.badge_counts.gold > 0) {
      summary += ` and recognized expertise (${user.badge_counts.gold} gold badges)`;
    }
    
    summary += '.';
    
    return summary;
  }

  private calculateOverallScore(user: any): number {
    const reputationScore = Math.min(user.reputation / 50, 100);
    const badgeScore = (user.badge_counts.gold * 10 + user.badge_counts.silver * 3 + user.badge_counts.bronze) / 2;
    const acceptRateScore = user.accept_rate || 50;
    
    return Math.round((reputationScore + Math.min(badgeScore, 50) + acceptRateScore) / 3);
  }

  private calculateSkillMatch(tags: string[]): number {
    return Math.min(tags.length * 20, 100);
  }

  private calculateSocialProof(badges: any): number {
    return Math.min(badges.gold * 15 + badges.silver * 5 + badges.bronze, 100);
  }

  private calculateFreshness(lastAccess: number): number {
    const daysSinceAccess = (Date.now() - lastAccess) / (24 * 60 * 60 * 1000);
    
    if (daysSinceAccess <= 1) return 100;
    if (daysSinceAccess <= 7) return 90;
    if (daysSinceAccess <= 30) return 70;
    if (daysSinceAccess <= 90) return 50;
    return 30;
  }
}
