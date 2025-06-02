
import { SearchEngine, SearchRequest, SearchResult } from './core/SearchEngine';
import { LinkedInApifyPlugin } from './plugins/LinkedInApifyPlugin';
import { GitHubRealPlugin } from './plugins/GitHubRealPlugin';
import { GoogleSearchRealPlugin } from './plugins/GoogleSearchRealPlugin';
import { stackOverflowEnrichmentService } from './enrichment/StackOverflowEnrichmentService';

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
    // Register data source plugins (excluding StackOverflow as it's now enrichment-only)
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
      sources: (params.sources || ['linkedin', 'github', 'google']).filter(s => s !== 'stackoverflow'), // Remove stackoverflow from primary sources
      filters: params.filters,
      limit: params.limit || 50
    };

    console.log('🚀 NewDataCollectionService: Starting search with StackOverflow enrichment');
    const searchResult = await this.searchEngine.search(searchRequest);

    // Apply StackOverflow enrichment to found candidates
    if (searchResult.candidates.length > 0) {
      console.log('🔧 Applying StackOverflow enrichment to candidates...');
      const enrichedCandidates = await this.enrichCandidatesWithStackOverflow(searchResult.candidates);
      
      // Update metadata to reflect enrichment
      const enrichmentStats = this.calculateEnrichmentStats(enrichedCandidates);
      
      return {
        ...searchResult,
        candidates: enrichedCandidates,
        metadata: {
          ...searchResult.metadata,
          stackoverflowEnrichment: {
            applied: true,
            enrichedCount: enrichmentStats.enrichedCount,
            totalProcessed: enrichmentStats.totalProcessed,
            averageConfidence: enrichmentStats.averageConfidence
          }
        }
      };
    }

    return searchResult;
  }

  private async enrichCandidatesWithStackOverflow(candidates: any[]): Promise<any[]> {
    const enrichedCandidates = [];
    const maxConcurrentEnrichments = 3; // Limit concurrent API calls
    
    for (let i = 0; i < candidates.length; i += maxConcurrentEnrichments) {
      const batch = candidates.slice(i, i + maxConcurrentEnrichments);
      
      const enrichmentPromises = batch.map(async (candidate) => {
        try {
          const enrichmentResult = await stackOverflowEnrichmentService.enrichCandidate(candidate);
          
          if (enrichmentResult.success && enrichmentResult.stackoverflowProfile) {
            const enhancedCandidate = stackOverflowEnrichmentService.calculateEnhancedScores(
              candidate,
              enrichmentResult.stackoverflowProfile
            );
            
            return {
              ...enhancedCandidate,
              stackoverflow_enrichment: {
                success: true,
                confidence: enrichmentResult.confidence,
                matchMethod: enrichmentResult.matchMethod
              }
            };
          }
          
          return {
            ...candidate,
            stackoverflow_enrichment: {
              success: false,
              confidence: enrichmentResult.confidence,
              matchMethod: enrichmentResult.matchMethod,
              error: enrichmentResult.error
            }
          };
        } catch (error) {
          console.error(`Failed to enrich candidate ${candidate.name}:`, error);
          return {
            ...candidate,
            stackoverflow_enrichment: {
              success: false,
              confidence: 0,
              matchMethod: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          };
        }
      });
      
      const batchResults = await Promise.all(enrichmentPromises);
      enrichedCandidates.push(...batchResults);
    }
    
    // Sort by enhanced scores
    return enrichedCandidates.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
  }

  private calculateEnrichmentStats(candidates: any[]): {
    enrichedCount: number;
    totalProcessed: number;
    averageConfidence: number;
  } {
    const enrichedCandidates = candidates.filter(c => c.stackoverflow_enrichment?.success);
    const totalConfidence = enrichedCandidates.reduce((sum, c) => sum + (c.stackoverflow_enrichment?.confidence || 0), 0);
    
    return {
      enrichedCount: enrichedCandidates.length,
      totalProcessed: candidates.length,
      averageConfidence: enrichedCandidates.length > 0 ? Math.round(totalConfidence / enrichedCandidates.length) : 0
    };
  }

  async getAvailableSources(): Promise<string[]> {
    // StackOverflow is no longer listed as a primary source since it's enrichment-only
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
