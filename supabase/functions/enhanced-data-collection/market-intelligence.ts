
export interface MarketIntelligence {
  salary_ranges: { [role: string]: { min: number; max: number; currency: string } };
  trending_skills: string[];
  location_demand: { [location: string]: number };
  competition_analysis: {
    hiring_companies: string[];
    skill_demand: { [skill: string]: number };
    role_saturation: { [role: string]: number };
  };
  availability_indicators: {
    market_supply: number;
    demand_ratio: number;
    best_sourcing_platforms: string[];
  };
}

export class MarketIntelligenceEngine {
  private static readonly SALARY_RANGES = {
    'software engineer': { junior: { min: 60000, max: 90000 }, senior: { min: 120000, max: 180000 } },
    'devops engineer': { junior: { min: 70000, max: 100000 }, senior: { min: 130000, max: 200000 } },
    'data scientist': { junior: { min: 80000, max: 110000 }, senior: { min: 140000, max: 220000 } },
    'frontend developer': { junior: { min: 55000, max: 85000 }, senior: { min: 110000, max: 170000 } },
    'backend developer': { junior: { min: 65000, max: 95000 }, senior: { min: 125000, max: 185000 } }
  };

  private static readonly TRENDING_TECHNOLOGIES = {
    'high_demand': ['rust', 'go', 'kubernetes', 'terraform', 'react', 'typescript'],
    'emerging': ['webassembly', 'deno', 'svelte', 'solid.js', 'qwik'],
    'ai_ml': ['pytorch', 'transformers', 'langchain', 'vector-databases', 'mlops']
  };

  private static readonly LOCATION_MULTIPLIERS = {
    'san francisco': 1.4,
    'new york': 1.3,
    'seattle': 1.25,
    'boston': 1.2,
    'austin': 1.1,
    'remote': 1.0,
    'bangalore': 0.3,
    'hyderabad': 0.25,
    'pune': 0.28
  };

  static analyzeMarketConditions(
    query: string, 
    skills: string[], 
    location: string,
    role: string
  ): MarketIntelligence {
    return {
      salary_ranges: this.calculateSalaryRanges(role, location),
      trending_skills: this.identifyTrendingSkills(skills),
      location_demand: this.assessLocationDemand(location),
      competition_analysis: this.analyzeCompetition(skills, role),
      availability_indicators: this.assessMarketAvailability(skills, role, location)
    };
  }

  static optimizeSearchStrategy(marketIntel: MarketIntelligence): {
    recommended_platforms: string[];
    search_timing: string;
    competition_level: 'low' | 'medium' | 'high';
    sourcing_difficulty: number;
    success_probability: number;
  } {
    const competition_level = this.assessCompetitionLevel(marketIntel);
    const sourcing_difficulty = this.calculateSourcingDifficulty(marketIntel);
    
    return {
      recommended_platforms: marketIntel.availability_indicators.best_sourcing_platforms,
      search_timing: this.getOptimalSearchTiming(marketIntel),
      competition_level,
      sourcing_difficulty,
      success_probability: this.calculateSuccessProbability(marketIntel)
    };
  }

  static generateSearchPriorities(
    skills: string[], 
    marketIntel: MarketIntelligence
  ): {
    must_have_skills: string[];
    nice_to_have_skills: string[];
    emerging_skills: string[];
    market_premium_skills: string[];
  } {
    const skillDemand = marketIntel.competition_analysis.skill_demand;
    const trending = marketIntel.trending_skills;

    const sortedSkills = skills.sort((a, b) => (skillDemand[b] || 0) - (skillDemand[a] || 0));

    return {
      must_have_skills: sortedSkills.slice(0, 3),
      nice_to_have_skills: sortedSkills.slice(3, 6),
      emerging_skills: skills.filter(skill => trending.includes(skill)),
      market_premium_skills: this.identifyPremiumSkills(skills, skillDemand)
    };
  }

  private static calculateSalaryRanges(
    role: string, 
    location: string
  ): { [role: string]: { min: number; max: number; currency: string } } {
    const baseRanges = this.SALARY_RANGES[role.toLowerCase()] || 
                      this.SALARY_RANGES['software engineer'];
    
    const multiplier = this.LOCATION_MULTIPLIERS[location.toLowerCase()] || 1.0;
    const currency = location.toLowerCase().includes('india') ? 'INR' : 'USD';
    const conversionRate = currency === 'INR' ? 83 : 1;

    return {
      [role]: {
        min: Math.round(baseRanges.junior.min * multiplier * conversionRate),
        max: Math.round(baseRanges.senior.max * multiplier * conversionRate),
        currency
      }
    };
  }

  private static identifyTrendingSkills(skills: string[]): string[] {
    const trending = [];
    
    for (const [category, techs] of Object.entries(this.TRENDING_TECHNOLOGIES)) {
      const matchingSkills = skills.filter(skill => 
        techs.includes(skill.toLowerCase())
      );
      trending.push(...matchingSkills);
    }

    return trending;
  }

  private static assessLocationDemand(location: string): { [location: string]: number } {
    // Simulate demand based on tech hub activity
    const demandMap = {
      'san francisco': 95,
      'seattle': 85,
      'new york': 80,
      'austin': 75,
      'remote': 90,
      'bangalore': 70,
      'hyderabad': 65,
      'pune': 60
    };

    return { [location]: demandMap[location.toLowerCase()] || 50 };
  }

  private static analyzeCompetition(
    skills: string[], 
    role: string
  ): {
    hiring_companies: string[];
    skill_demand: { [skill: string]: number };
    role_saturation: { [role: string]: number };
  } {
    // Simulate competition analysis
    const techCompanies = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix', 'Uber', 'Airbnb'];
    const skillDemand: { [skill: string]: number } = {};
    
    // Assign demand scores to skills
    skills.forEach(skill => {
      skillDemand[skill] = Math.floor(Math.random() * 100) + 50; // 50-150 demand score
    });

    return {
      hiring_companies: techCompanies.slice(0, 5),
      skill_demand: skillDemand,
      role_saturation: { [role]: Math.floor(Math.random() * 50) + 30 } // 30-80% saturation
    };
  }

  private static assessMarketAvailability(
    skills: string[], 
    role: string, 
    location: string
  ): {
    market_supply: number;
    demand_ratio: number;
    best_sourcing_platforms: string[];
  } {
    // Simulate market availability assessment
    const supply = Math.floor(Math.random() * 1000) + 500; // 500-1500 candidates
    const demand = Math.floor(Math.random() * 200) + 100; // 100-300 open positions
    
    const platforms = this.recommendPlatforms(skills, role);
    
    return {
      market_supply: supply,
      demand_ratio: demand / supply,
      best_sourcing_platforms: platforms
    };
  }

  private static recommendPlatforms(skills: string[], role: string): string[] {
    const platforms = [];
    
    // Platform recommendations based on role and skills
    if (role.includes('engineer') || role.includes('developer')) {
      platforms.push('github', 'stackoverflow');
    }
    
    if (skills.some(skill => ['react', 'vue', 'angular'].includes(skill.toLowerCase()))) {
      platforms.push('github', 'codepen', 'dribbble');
    }
    
    if (skills.some(skill => ['python', 'data science', 'ml'].includes(skill.toLowerCase()))) {
      platforms.push('kaggle', 'github', 'papers-with-code');
    }
    
    platforms.push('linkedin'); // Always include LinkedIn
    
    return [...new Set(platforms)];
  }

  private static getOptimalSearchTiming(marketIntel: MarketIntelligence): string {
    const demandRatio = marketIntel.availability_indicators.demand_ratio;
    
    if (demandRatio > 0.3) return 'urgent'; // High competition
    if (demandRatio > 0.15) return 'normal'; // Moderate competition
    return 'flexible'; // Low competition
  }

  private static assessCompetitionLevel(marketIntel: MarketIntelligence): 'low' | 'medium' | 'high' {
    const demandRatio = marketIntel.availability_indicators.demand_ratio;
    
    if (demandRatio > 0.25) return 'high';
    if (demandRatio > 0.1) return 'medium';
    return 'low';
  }

  private static calculateSourcingDifficulty(marketIntel: MarketIntelligence): number {
    const demandRatio = marketIntel.availability_indicators.demand_ratio;
    const supply = marketIntel.availability_indicators.market_supply;
    
    let difficulty = demandRatio * 100; // Base difficulty from demand ratio
    
    // Adjust for supply
    if (supply < 100) difficulty += 20;
    else if (supply > 1000) difficulty -= 10;
    
    return Math.min(Math.max(difficulty, 0), 100);
  }

  private static calculateSuccessProbability(marketIntel: MarketIntelligence): number {
    const difficulty = this.calculateSourcingDifficulty(marketIntel);
    const platformCount = marketIntel.availability_indicators.best_sourcing_platforms.length;
    
    let probability = 100 - difficulty;
    probability += platformCount * 5; // More platforms = higher success
    
    return Math.min(Math.max(probability, 10), 95);
  }

  private static identifyPremiumSkills(
    skills: string[], 
    skillDemand: { [skill: string]: number }
  ): string[] {
    const threshold = 80; // Skills with demand > 80 are premium
    
    return skills.filter(skill => (skillDemand[skill] || 0) > threshold);
  }
}
