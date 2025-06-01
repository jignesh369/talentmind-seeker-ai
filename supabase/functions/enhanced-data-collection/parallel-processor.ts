
import { TimeBudgetManager } from './time-budget-manager.ts'

export interface ProcessorConfig {
  maxCandidatesPerSource: number;
  maxAIEnhancements: number;
  maxConcurrentSources: number;
}

export interface SourceResult {
  source: string;
  candidates: any[];
  total: number;
  validated: number;
  error: string | null;
  processingTime: number;
  fromCache?: boolean;
}

export class ParallelProcessor {
  private timeBudget: TimeBudgetManager;
  private config: ProcessorConfig;
  private sourceCache = new Map<string, { result: SourceResult; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for source cache

  constructor(timeBudget: TimeBudgetManager, config: ProcessorConfig) {
    this.timeBudget = timeBudget;
    this.config = config;
  }

  async processSourcesInParallel(
    sources: string[],
    query: string,
    location: string | undefined,
    enhancedQuery: any,
    supabase: any
  ): Promise<SourceResult[]> {
    console.log(`🔄 Processing ${sources.length} sources in parallel with smart limiting...`);

    // Create batches for parallel processing
    const batches = this.createSourceBatches(sources);
    const allResults: SourceResult[] = [];

    for (const batch of batches) {
      if (!this.timeBudget.hasTimeRemaining()) {
        console.log('⏰ Time budget exhausted, stopping source processing');
        break;
      }

      const batchPromises = batch.map(source => 
        this.processSourceWithMonitoring(source, query, location, enhancedQuery, supabase)
      );

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value) {
            allResults.push(result.value);
            
            // Update progress
            this.timeBudget.updateProgress(
              'Parallel collection',
              allResults.length,
              sources.length,
              allResults.reduce((sum, r) => sum + r.validated, 0)
            );
            
            // Early return if we have enough quality candidates
            const totalValidated = allResults.reduce((sum, r) => sum + r.validated, 0);
            if (totalValidated >= 20 && this.hasGoodQualityResults(allResults)) {
              console.log(`🎯 Early return: Found ${totalValidated} quality candidates`);
              break;
            }
          }
        }
      } catch (error) {
        console.error('❌ Batch processing error:', error);
      }
    }

    console.log(`✅ Parallel processing completed: ${allResults.length} sources processed`);
    return allResults;
  }

  private async processSourceWithMonitoring(
    source: string,
    query: string,
    location: string | undefined,
    enhancedQuery: any,
    supabase: any
  ): Promise<SourceResult | null> {
    const startTime = Date.now();
    const cacheKey = `${source}:${query}:${location || ''}`;

    // Check source cache
    const cached = this.sourceCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`📋 Using cached result for ${source}`);
      return { ...cached.result, fromCache: true };
    }

    try {
      console.log(`🚀 Processing source: ${source} with time budget ${this.timeBudget.getTimeForSource()}ms`);

      const timeoutMs = Math.min(this.timeBudget.getTimeForSource(), 20000); // Max 20 seconds per source
      
      let result = null;
      
      switch (source) {
        case 'github':
          result = await this.timeBudget.withTimeout(
            supabase.functions.invoke('collect-github-data', {
              body: { query, location, enhancedQuery }
            }),
            timeoutMs
          );
          break;
          
        case 'stackoverflow':
          result = await this.timeBudget.withTimeout(
            supabase.functions.invoke('collect-stackoverflow-data', {
              body: { query, location, enhancedQuery }
            }),
            timeoutMs
          );
          break;
          
        case 'google':
          result = await this.timeBudget.withTimeout(
            supabase.functions.invoke('collect-google-search-data', {
              body: { query, location, enhancedQuery }
            }),
            timeoutMs
          );
          break;
          
        case 'linkedin':
          result = await this.timeBudget.withTimeout(
            supabase.functions.invoke('collect-linkedin-data', {
              body: { query, location, enhancedQuery }
            }),
            timeoutMs
          );
          break;
          
        case 'kaggle':
          result = await this.timeBudget.withTimeout(
            supabase.functions.invoke('collect-kaggle-data', {
              body: { query, location, enhancedQuery }
            }),
            timeoutMs
          );
          break;
          
        case 'devto':
          result = await this.timeBudget.withTimeout(
            supabase.functions.invoke('collect-devto-data', {
              body: { query, location, enhancedQuery }
            }),
            timeoutMs
          );
          break;
          
        default:
          console.log(`⚠️ Unknown source: ${source}`);
          return null;
      }

      const processingTime = Date.now() - startTime;

      if (result?.data) {
        const sourceResult: SourceResult = {
          source,
          candidates: result.data.candidates || [],
          total: result.data.total || 0,
          validated: result.data.candidates?.length || 0,
          error: null,
          processingTime,
          fromCache: false
        };

        // Limit candidates per source for performance
        if (sourceResult.candidates.length > this.config.maxCandidatesPerSource) {
          sourceResult.candidates = sourceResult.candidates
            .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
            .slice(0, this.config.maxCandidatesPerSource);
          sourceResult.validated = sourceResult.candidates.length;
        }

        // Cache successful results
        this.sourceCache.set(cacheKey, {
          result: sourceResult,
          timestamp: Date.now()
        });

        console.log(`✅ ${source}: ${sourceResult.validated} candidates in ${processingTime}ms`);
        return sourceResult;
      } else {
        const errorResult: SourceResult = {
          source,
          candidates: [],
          total: 0,
          validated: 0,
          error: result?.error?.message || 'No data returned',
          processingTime,
          fromCache: false
        };
        
        console.log(`❌ ${source}: Failed - ${errorResult.error}`);
        return errorResult;
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorResult: SourceResult = {
        source,
        candidates: [],
        total: 0,
        validated: 0,
        error: error.message || 'Processing failed',
        processingTime,
        fromCache: false
      };
      
      console.log(`❌ ${source}: Error - ${error.message} (${processingTime}ms)`);
      return errorResult;
    }
  }

  async batchEnhanceCandidates(
    candidates: any[],
    openaiApiKey?: string,
    apolloApiKey?: string
  ): Promise<any[]> {
    if (!this.timeBudget.hasTimeRemaining()) {
      console.log('⏰ No time remaining for AI enhancement');
      return candidates;
    }

    // Only enhance top candidates within limits
    const topCandidates = candidates
      .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
      .slice(0, this.config.maxAIEnhancements);

    console.log(`✨ Enhancing top ${topCandidates.length} candidates with AI...`);

    const enhancementPromises = topCandidates.map(async (candidate, index) => {
      if (!this.timeBudget.hasTimeRemaining()) {
        return candidate;
      }

      try {
        const timeoutMs = this.timeBudget.getTimeForAI();
        
        // Use AI enhancement with timeout
        const enhanced = await this.timeBudget.withTimeout(
          this.enhanceSingleCandidate(candidate, openaiApiKey, apolloApiKey),
          timeoutMs
        );

        return enhanced || candidate;
      } catch (error) {
        console.log(`⚠️ Enhancement failed for candidate ${index + 1}:`, error.message);
        return candidate;
      }
    });

    const enhancedResults = await Promise.allSettled(enhancementPromises);
    const enhancedCandidates = enhancedResults.map((result, index) => 
      result.status === 'fulfilled' ? result.value : topCandidates[index]
    );

    // Return enhanced candidates + remaining candidates
    const remainingCandidates = candidates.slice(this.config.maxAIEnhancements);
    return [...enhancedCandidates, ...remainingCandidates];
  }

  private async enhanceSingleCandidate(
    candidate: any,
    openaiApiKey?: string,
    apolloApiKey?: string
  ): Promise<any> {
    // Simplified enhancement - just add AI flag for now
    // Real implementation would call AI services
    return {
      ...candidate,
      ai_enhanced: true,
      apollo_checked: !!apolloApiKey,
      enhancement_timestamp: new Date().toISOString()
    };
  }

  private createSourceBatches(sources: string[]): string[][] {
    const batches: string[][] = [];
    const batchSize = this.config.maxConcurrentSources;

    for (let i = 0; i < sources.length; i += batchSize) {
      batches.push(sources.slice(i, i + batchSize));
    }

    return batches;
  }

  private hasGoodQualityResults(results: SourceResult[]): boolean {
    const totalCandidates = results.reduce((sum, r) => sum + r.validated, 0);
    const successfulSources = results.filter(r => !r.error).length;
    const avgScore = results.reduce((sum, r) => {
      const candidates = r.candidates || [];
      const avgCandidateScore = candidates.reduce((s, c) => s + (c.overall_score || 0), 0) / Math.max(candidates.length, 1);
      return sum + avgCandidateScore;
    }, 0) / Math.max(results.length, 1);

    return totalCandidates >= 15 && successfulSources >= 2 && avgScore >= 60;
  }
}
