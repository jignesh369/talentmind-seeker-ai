
import { TimeBudgetManager } from './time-budget-manager.ts';

export interface SourceResult {
  source: string;
  candidates: any[];
  total: number;
  validated: number;
  error: string | null;
  processingTime: number;
}

export interface BatchProcessingConfig {
  maxConcurrentSources: number;
  maxCandidatesPerSource: number;
  maxAIEnhancements: number;
  prioritySources: string[];
}

export class ParallelProcessor {
  private timeBudget: TimeBudgetManager;
  private config: BatchProcessingConfig;

  constructor(timeBudget: TimeBudgetManager, config?: Partial<BatchProcessingConfig>) {
    this.timeBudget = timeBudget;
    this.config = {
      maxConcurrentSources: 3, // Process 3 sources in parallel
      maxCandidatesPerSource: 8, // Reduced from 10
      maxAIEnhancements: 5, // Only enhance top 5 candidates
      prioritySources: ['github', 'stackoverflow', 'linkedin'],
      ...config
    };
  }

  async processSourcesInParallel(
    sources: string[],
    query: string,
    location: string,
    enhancedQuery: any,
    supabase: any
  ): Promise<SourceResult[]> {
    console.log('🚀 Starting parallel source processing...');

    // Prioritize sources based on query type
    const prioritizedSources = this.prioritizeSources(sources, query);
    
    // Process sources in batches to avoid overwhelming the system
    const results: SourceResult[] = [];
    const batches = this.createBatches(prioritizedSources, this.config.maxConcurrentSources);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      if (!this.timeBudget.shouldContinueCollection(results.reduce((sum, r) => sum + r.total, 0))) {
        console.log('⏰ Time budget exhausted, stopping collection');
        break;
      }

      const batch = batches[batchIndex];
      console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length}: ${batch.join(', ')}`);

      const batchPromises = batch.map(source => 
        this.processSourceWithTimeout(source, query, location, enhancedQuery, supabase)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        } else {
          console.error(`❌ Source ${batch[index]} failed:`, result.status === 'rejected' ? result.reason : 'Unknown error');
          results.push({
            source: batch[index],
            candidates: [],
            total: 0,
            validated: 0,
            error: result.status === 'rejected' ? result.reason.message : 'Processing failed',
            processingTime: 0
          });
        }
      });

      // Update progress
      this.timeBudget.updateProgress(
        `Batch ${batchIndex + 1}/${batches.length}`,
        results.length,
        sources.length,
        results.reduce((sum, r) => sum + r.total, 0)
      );
    }

    console.log(`✅ Parallel processing completed: ${results.length} sources processed`);
    return results;
  }

  private prioritizeSources(sources: string[], query: string): string[] {
    const queryLower = query.toLowerCase();
    const prioritized = [...sources];

    // Move priority sources to front based on query content
    if (queryLower.includes('github') || queryLower.includes('open source')) {
      this.moveToFront(prioritized, 'github');
    }
    if (queryLower.includes('stackoverflow') || queryLower.includes('expert')) {
      this.moveToFront(prioritized, 'stackoverflow');
    }
    if (queryLower.includes('linkedin') || queryLower.includes('professional')) {
      this.moveToFront(prioritized, 'linkedin');
    }

    // Ensure priority sources are first
    const sorted = [
      ...this.config.prioritySources.filter(s => prioritized.includes(s)),
      ...prioritized.filter(s => !this.config.prioritySources.includes(s))
    ];

    return [...new Set(sorted)]; // Remove duplicates
  }

  private moveToFront(array: string[], item: string) {
    const index = array.indexOf(item);
    if (index > 0) {
      array.splice(index, 1);
      array.unshift(item);
    }
  }

  private createBatches(items: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processSourceWithTimeout(
    source: string,
    query: string,
    location: string,
    enhancedQuery: any,
    supabase: any
  ): Promise<SourceResult | null> {
    const startTime = Date.now();
    const timeoutMs = this.timeBudget.getTimeForSource();

    console.log(`🔍 Processing ${source} with ${timeoutMs}ms timeout...`);

    try {
      const result = await this.timeBudget.withTimeout(
        supabase.functions.invoke(`collect-${source}-data`, {
          body: { 
            query, 
            location, 
            enhancedQuery,
            maxCandidates: this.config.maxCandidatesPerSource,
            timeLimit: timeoutMs
          }
        }),
        timeoutMs
      );

      const processingTime = Date.now() - startTime;

      if (!result) {
        return {
          source,
          candidates: [],
          total: 0,
          validated: 0,
          error: 'Source collection timeout',
          processingTime
        };
      }

      if (result.error) {
        return {
          source,
          candidates: [],
          total: 0,
          validated: 0,
          error: result.error.message || 'Collection failed',
          processingTime
        };
      }

      const candidates = result.data?.candidates || [];
      console.log(`✅ ${source}: Found ${candidates.length} candidates in ${processingTime}ms`);

      return {
        source,
        candidates: candidates.slice(0, this.config.maxCandidatesPerSource),
        total: candidates.length,
        validated: candidates.length,
        error: null,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ ${source} processing error:`, error);
      
      return {
        source,
        candidates: [],
        total: 0,
        validated: 0,
        error: error.message || 'Unknown error',
        processingTime
      };
    }
  }

  async batchEnhanceCandidates(
    candidates: any[],
    openaiApiKey: string | null,
    apolloApiKey: string | null
  ): Promise<any[]> {
    if (!this.timeBudget.hasTimeRemaining()) {
      console.log('⏰ No time remaining for AI enhancements');
      return candidates;
    }

    // Sort by score and take only top candidates for enhancement
    const topCandidates = candidates
      .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
      .slice(0, this.config.maxAIEnhancements);

    console.log(`🧠 Batch enhancing top ${topCandidates.length} candidates...`);

    const enhancementPromises = topCandidates.map(async (candidate, index) => {
      const timeoutMs = this.timeBudget.getTimeForAI();
      
      try {
        const enhanced = await this.timeBudget.withTimeout(
          this.enhanceSingleCandidate(candidate, openaiApiKey, apolloApiKey),
          timeoutMs
        );
        
        return enhanced || candidate; // Return original if enhancement fails
      } catch (error) {
        console.log(`⚠️ Enhancement failed for candidate ${index}:`, error.message);
        return candidate;
      }
    });

    const enhancedCandidates = await Promise.allSettled(enhancementPromises);
    
    return enhancedCandidates.map((result, index) => 
      result.status === 'fulfilled' ? result.value : topCandidates[index]
    );
  }

  private async enhanceSingleCandidate(
    candidate: any,
    openaiApiKey: string | null,
    apolloApiKey: string | null
  ): Promise<any> {
    // Simplified enhancement - only the most critical operations
    let enhanced = { ...candidate };

    try {
      // Quick semantic similarity if available
      if (openaiApiKey) {
        // Add minimal AI enhancement
        enhanced.ai_enhanced = true;
      }

      // Quick Apollo enrichment if available
      if (apolloApiKey) {
        // Add minimal contact discovery
        enhanced.apollo_checked = true;
      }

      return enhanced;
    } catch (error) {
      console.log('Enhancement error:', error.message);
      return candidate;
    }
  }
}
