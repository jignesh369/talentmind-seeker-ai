
import { SearchEngine, SearchRequest, SearchResult } from './core/SearchEngine';
import { LinkedInApifyPlugin } from './plugins/LinkedInApifyPlugin';
import { GitHubRealPlugin } from './plugins/GitHubRealPlugin';
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
    // Register data source plugins (StackOverflow removed)
    this.searchEngine.registerPlugin('linkedin', new LinkedInApifyPlugin());
    this.searchEngine.registerPlugin('github', new GitHubRealPlugin());
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
      sources: params.sources || ['linkedin', 'github', 'google'],
      filters: params.filters,
      limit: params.limit || 50
    };

    console.log('🚀 NewDataCollectionService: Starting search');
    const searchResult = await this.searchEngine.search(searchRequest);

    return searchResult;
  }

  async getAvailableSources(): Promise<string[]> {
    const sources = ['linkedin', 'github', 'google'];
    const availableSources: string[] = [];

    for (const source of sources) {
      try {
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
