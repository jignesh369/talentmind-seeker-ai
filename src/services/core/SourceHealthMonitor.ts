
export interface SourceHealth {
  name: string;
  isAvailable: boolean;
  latency: number;
  successRate: number;
  lastChecked: Date;
  rateLimitStatus: {
    remaining: number;
    resetTime?: Date;
  };
  error?: string;
}

export class SourceHealthMonitor {
  private static healthCache = new Map<string, SourceHealth>();
  private static checkInterval = 5 * 60 * 1000; // 5 minutes

  static async checkSourceHealth(sourceName: string): Promise<SourceHealth> {
    const cached = this.healthCache.get(sourceName);
    if (cached && (Date.now() - cached.lastChecked.getTime()) < this.checkInterval) {
      return cached;
    }

    const health = await this.performHealthCheck(sourceName);
    this.healthCache.set(sourceName, health);
    return health;
  }

  private static async performHealthCheck(sourceName: string): Promise<SourceHealth> {
    const startTime = Date.now();
    
    try {
      let isAvailable = false;
      let error: string | undefined;

      switch (sourceName) {
        case 'github':
          isAvailable = await this.checkGitHubHealth();
          break;
        case 'google':
          isAvailable = await this.checkGoogleHealth();
          break;
        case 'linkedin':
          isAvailable = await this.checkLinkedInHealth();
          break;
        default:
          error = 'Unknown source';
      }

      const latency = Date.now() - startTime;

      return {
        name: sourceName,
        isAvailable,
        latency,
        successRate: isAvailable ? 100 : 0,
        lastChecked: new Date(),
        rateLimitStatus: {
          remaining: 100 // This would be updated with real API responses
        },
        error
      };
    } catch (error: any) {
      return {
        name: sourceName,
        isAvailable: false,
        latency: Date.now() - startTime,
        successRate: 0,
        lastChecked: new Date(),
        rateLimitStatus: { remaining: 0 },
        error: error.message
      };
    }
  }

  private static async checkGitHubHealth(): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/rate_limit');
      return response.ok;
    } catch {
      return false;
    }
  }

  private static async checkGoogleHealth(): Promise<boolean> {
    // For Google Custom Search, we'll assume it's available
    // Real implementation would check API quota
    return true;
  }

  private static async checkLinkedInHealth(): Promise<boolean> {
    // For Apify LinkedIn scraper, we'll assume it's available
    // Real implementation would check Apify API status
    return true;
  }

  static async getAvailableSources(): Promise<string[]> {
    const sources = ['github', 'google', 'linkedin'];
    const healthResults = await Promise.all(
      sources.map(source => this.checkSourceHealth(source))
    );
    
    return healthResults
      .filter(health => health.isAvailable)
      .map(health => health.name);
  }

  static async getSourceRecommendations(query: string): Promise<string[]> {
    const availableSources = await this.getAvailableSources();
    const recommendations: string[] = [];

    // AI/ML related queries work well with GitHub
    if (query.toLowerCase().includes('ai') || query.toLowerCase().includes('machine learning')) {
      if (availableSources.includes('github')) recommendations.push('github');
    }

    // Professional role queries work well with LinkedIn
    if (query.toLowerCase().includes('senior') || query.toLowerCase().includes('manager')) {
      if (availableSources.includes('linkedin')) recommendations.push('linkedin');
    }

    // Fallback to all available sources
    if (recommendations.length === 0) {
      return availableSources;
    }

    // Add remaining sources
    availableSources.forEach(source => {
      if (!recommendations.includes(source)) {
        recommendations.push(source);
      }
    });

    return recommendations;
  }
}
