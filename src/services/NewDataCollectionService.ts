
import { SearchEngine, SearchRequest, SearchResult } from './core/SearchEngine';
import { LinkedInApifyPlugin } from './plugins/LinkedInApifyPlugin';
import { GitHubRealPlugin } from './plugins/GitHubRealPlugin';
import { StackOverflowRealPlugin } from './plugins/StackOverflowRealPlugin';
import { GoogleSearchRealPlugin } from './plugins/GoogleSearchRealPlugin';

export class NewDataCollectionService {
  private static instance: NewDataCollectionService;
  private searchEngine: SearchEngine;

  private constructor() {
    this.searchEngine = new SearchEngine();
    this.initializePlugins();
  }

  static getInstance(): NewDataCollectionService {
    if (!NewDataCollectionService.instance) {
      NewDataCollectionService.instance = new NewDataCollectionService();
    }
    return NewDataCollectionService.instance;
  }

  private initializePlugins(): void {
    // Register all real data source plugins
    this.searchEngine.registerPlugin('linkedin', new LinkedInApifyPlugin());
    this.searchEngine.registerPlugin('github', new GitHubRealPlugin());
    this.searchEngine.registerPlugin('stackoverflow', new StackOverflowRealPlugin());
    this.searchEngine.registerPlugin('google', new GoogleSearchRealPlugin());
  }

  async searchCandidates(params: {
    query: string;
    location?: string;
    sources?: string[];
    filters?: {
      minScore?: number;
      maxScore?: number;
      skills?: string[];
      lastActiveDays?: number;
    };
    limit?: number;
  }): Promise<SearchResult> {
    const searchRequest: SearchRequest = {
      query: params.query,
      location: params.location,
      sources: params.sources || ['linkedin', 'github', 'stackoverflow', 'google'],
      filters: params.filters,
      limit: params.limit || 50
    };

    console.log('🚀 NewDataCollectionService: Starting search with real data only');
    return await this.searchEngine.search(searchRequest);
  }

  async getAvailableSources(): Promise<string[]> {
    const sources = ['linkedin', 'github', 'stackoverflow', 'google'];
    const availableSources: string[] = [];

    for (const source of sources) {
      // Check availability through the search engine
      try {
        // This would be implemented to check plugin availability
        availableSources.push(source);
      } catch {
        console.warn(`⚠️ Source ${source} not available`);
      }
    }

    return availableSources;
  }
}

// Export singleton instance
export const newDataCollectionService = NewDataCollectionService.getInstance();
