import { DataSourcePlugin } from './DataSourcePlugin';
import { QueryParser } from './QueryParser';
import { ScoreCalculator } from './ScoreCalculator';
import { ResourceManager } from './ResourceManager';
import { ErrorHandler } from './ErrorHandler';
import { MonitoringService } from './MonitoringService';

export interface SearchRequest {
  query: string;
  location?: string;
  filters?: {
    minScore?: number;
    maxScore?: number;
    skills?: string[];
    lastActiveDays?: number;
  };
  sources?: string[];
  limit?: number;
}

export interface SearchResult {
  candidates: any[];
  metadata: {
    totalCandidates: number;
    sourcesUsed: string[];
    processingTime: number;
    queryInterpretation: string;
    confidence: number;
    errors: Array<{ source: string; error: string }>;
  };
}

export class SearchEngine {
  private plugins: Map<string, DataSourcePlugin> = new Map();
  private queryParser: QueryParser;
  private scoreCalculator: ScoreCalculator;
  private resourceManager: ResourceManager;
  private errorHandler: ErrorHandler;
  private monitoring: MonitoringService;

  constructor() {
    this.queryParser = new QueryParser();
    this.scoreCalculator = new ScoreCalculator();
    this.resourceManager = new ResourceManager();
    this.errorHandler = new ErrorHandler();
    this.monitoring = new MonitoringService();
  }

  registerPlugin(name: string, plugin: DataSourcePlugin): void {
    this.plugins.set(name, plugin);
    console.log(`🔌 Registered data source plugin: ${name}`);
  }

  async search(request: SearchRequest): Promise<SearchResult> {
    const startTime = Date.now();
    const searchId = crypto.randomUUID();
    
    console.log(`🔍 Starting search ${searchId}:`, request);
    this.monitoring.trackSearchStart(searchId, request);

    try {
      // Parse and enhance the query
      const parsedQuery = await this.queryParser.parseQuery(request.query, request.location);
      console.log(`📊 Parsed query:`, parsedQuery);

      // Determine which sources to use
      const sources = request.sources || Array.from(this.plugins.keys());
      const availablePlugins = sources.filter(source => this.plugins.has(source));

      if (availablePlugins.length === 0) {
        throw new Error('No available data source plugins');
      }

      // Execute search across all sources with resource management
      const results = await this.resourceManager.executeWithResourceLimits(
        availablePlugins.map(source => ({
          name: source,
          execute: () => this.executePluginSearch(source, request, parsedQuery)
        })),
        { timeoutMs: 60000, maxConcurrent: 4 }
      );

      // Combine and process results
      const allCandidates: any[] = [];
      const errors: Array<{ source: string; error: string }> = [];
      const sourcesUsed: string[] = [];

      for (const result of results) {
        if (result.success) {
          allCandidates.push(...result.data.candidates);
          sourcesUsed.push(result.name);
        } else {
          errors.push({ source: result.name, error: result.error });
        }
      }

      // Calculate scores and rank candidates
      const scoredCandidates = await this.scoreCalculator.calculateScores(
        allCandidates,
        parsedQuery,
        request.filters
      );

      // Apply filters and limit
      const filteredCandidates = this.applyFilters(scoredCandidates, request.filters);
      const finalCandidates = filteredCandidates.slice(0, request.limit || 50);

      const processingTime = Date.now() - startTime;
      
      const searchResult: SearchResult = {
        candidates: finalCandidates,
        metadata: {
          totalCandidates: finalCandidates.length,
          sourcesUsed,
          processingTime,
          queryInterpretation: parsedQuery.interpretation,
          confidence: parsedQuery.confidence,
          errors
        }
      };

      this.monitoring.trackSearchComplete(searchId, searchResult);
      console.log(`✅ Search ${searchId} completed in ${processingTime}ms: ${finalCandidates.length} candidates`);

      return searchResult;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Search ${searchId} failed:`, error);
      
      this.monitoring.trackSearchError(searchId, error);
      this.errorHandler.handleSearchError(error, request);
      
      throw error;
    }
  }

  private async executePluginSearch(
    sourceName: string, 
    request: SearchRequest, 
    parsedQuery: any
  ): Promise<{ candidates: any[] }> {
    const plugin = this.plugins.get(sourceName);
    if (!plugin) {
      throw new Error(`Plugin ${sourceName} not found`);
    }

    try {
      return await plugin.search({
        query: request.query,
        location: request.location,
        parsedQuery,
        limit: Math.ceil((request.limit || 50) / this.plugins.size)
      });
    } catch (error: any) {
      throw new Error(`${sourceName}: ${error.message}`);
    }
  }

  private applyFilters(candidates: any[], filters?: SearchRequest['filters']): any[] {
    if (!filters) return candidates;

    return candidates.filter(candidate => {
      if (filters.minScore && candidate.overall_score < filters.minScore) return false;
      if (filters.maxScore && candidate.overall_score > filters.maxScore) return false;
      
      if (filters.skills && filters.skills.length > 0) {
        const candidateSkills = candidate.skills || [];
        const hasMatchingSkill = filters.skills.some(filterSkill => 
          candidateSkills.some((skill: string) => 
            skill.toLowerCase().includes(filterSkill.toLowerCase())
          )
        );
        if (!hasMatchingSkill) return false;
      }

      if (filters.lastActiveDays && candidate.last_active) {
        const daysSinceActive = Math.floor(
          (Date.now() - new Date(candidate.last_active).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceActive > filters.lastActiveDays) return false;
      }

      return true;
    });
  }
}
