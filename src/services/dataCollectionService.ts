
import { supabase } from '@/integrations/supabase/client';

export interface DataCollectionResponse {
  results: Record<string, any>;
  total_candidates: number;
  total_validated: number;
  query: string;
  location?: string;
  enhancement_phase: string;
  quality_metrics: {
    validation_rate: string;
    processing_time: string;
    time_efficiency: string;
    parallel_processing: boolean;
    smart_limiting: boolean;
    early_returns: boolean;
    progressive_enhancement: boolean;
    ai_processing: boolean;
    completion_rate: string;
    graceful_degradation: boolean;
  };
  performance_metrics: {
    total_time_ms: number;
    average_time_per_source: number;
    timeout_rate: number;
    success_rate: number;
    candidates_per_successful_source: number;
    memory_stats?: any;
  };
  enhancement_stats: {
    total_processed: number;
    unique_candidates: number;
    processing_time_ms: number;
    time_budget_used: number;
    sources_successful: number;
    parallel_processing: boolean;
    progressive_enhancement: boolean;
    recommended_next_sources: string[];
    completion_rate: number;
    smart_timeouts: boolean;
    load_balancing: boolean;
    ai_enhancements: number;
    apollo_enriched: number;
    perplexity_enriched: number;
    ai_summaries_generated: number;
    ai_scored_candidates: number;
    graceful_degradation_used: boolean;
    deduplication_metrics?: {
      original_count: number;
      deduplicated_count: number;
      duplicates_removed: number;
      merge_decisions: number;
      deduplication_rate: number;
    };
  };
  errors?: Array<{ source: string; error: string }>;
  timestamp: string;
}

export interface CollectionParams {
  query: string;
  location?: string;
  sources: string[];
  timeBudget: number;
}

export class DataCollectionService {
  static async collectCandidates(params: CollectionParams): Promise<DataCollectionResponse> {
    console.log('🚀 DataCollectionService: Starting collection', params);
    
    const startTime = Date.now();
    
    try {
      // Add connection monitoring
      let connectionAlive = true;
      const heartbeat = setInterval(() => {
        if (!connectionAlive) {
          console.warn('⚠️ Connection may have been lost');
        }
        connectionAlive = false;
        setTimeout(() => { connectionAlive = true; }, 1000);
      }, 30000);

      const { data, error } = await supabase.functions.invoke('enhanced-data-collection', {
        body: {
          query: params.query,
          location: params.location,
          sources: params.sources,
          time_budget: params.timeBudget
        }
      });

      clearInterval(heartbeat);

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(`Collection service error: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        throw new Error('No data returned from collection service');
      }

      // Validate and sanitize response data
      const response: DataCollectionResponse = {
        results: data.results || {},
        total_candidates: Number(data.total_candidates) || 0,
        total_validated: Number(data.total_validated) || 0,
        query: data.query || params.query,
        location: data.location,
        enhancement_phase: data.enhancement_phase || 'Unknown',
        quality_metrics: {
          validation_rate: data.quality_metrics?.validation_rate || '0%',
          processing_time: data.quality_metrics?.processing_time || '0s',
          time_efficiency: data.quality_metrics?.time_efficiency || 'Unknown',
          parallel_processing: Boolean(data.quality_metrics?.parallel_processing),
          smart_limiting: Boolean(data.quality_metrics?.smart_limiting),
          early_returns: Boolean(data.quality_metrics?.early_returns),
          progressive_enhancement: Boolean(data.quality_metrics?.progressive_enhancement),
          ai_processing: Boolean(data.quality_metrics?.ai_processing),
          completion_rate: data.quality_metrics?.completion_rate || '0%',
          graceful_degradation: Boolean(data.quality_metrics?.graceful_degradation)
        },
        performance_metrics: {
          total_time_ms: Number(data.performance_metrics?.total_time_ms) || (Date.now() - startTime),
          average_time_per_source: Number(data.performance_metrics?.average_time_per_source) || 0,
          timeout_rate: Number(data.performance_metrics?.timeout_rate) || 0,
          success_rate: Number(data.performance_metrics?.success_rate) || 0,
          candidates_per_successful_source: Number(data.performance_metrics?.candidates_per_successful_source) || 0,
          memory_stats: data.performance_metrics?.memory_stats
        },
        enhancement_stats: {
          total_processed: Number(data.enhancement_stats?.total_processed) || 0,
          unique_candidates: Number(data.enhancement_stats?.unique_candidates) || 0,
          processing_time_ms: Number(data.enhancement_stats?.processing_time_ms) || 0,
          time_budget_used: Number(data.enhancement_stats?.time_budget_used) || 0,
          sources_successful: Number(data.enhancement_stats?.sources_successful) || 0,
          parallel_processing: Boolean(data.enhancement_stats?.parallel_processing),
          progressive_enhancement: Boolean(data.enhancement_stats?.progressive_enhancement),
          recommended_next_sources: Array.isArray(data.enhancement_stats?.recommended_next_sources) 
            ? data.enhancement_stats.recommended_next_sources 
            : [],
          completion_rate: Number(data.enhancement_stats?.completion_rate) || 0,
          smart_timeouts: Boolean(data.enhancement_stats?.smart_timeouts),
          load_balancing: Boolean(data.enhancement_stats?.load_balancing),
          ai_enhancements: Number(data.enhancement_stats?.ai_enhancements) || 0,
          apollo_enriched: Number(data.enhancement_stats?.apollo_enriched) || 0,
          perplexity_enriched: Number(data.enhancement_stats?.perplexity_enriched) || 0,
          ai_summaries_generated: Number(data.enhancement_stats?.ai_summaries_generated) || 0,
          ai_scored_candidates: Number(data.enhancement_stats?.ai_scored_candidates) || 0,
          graceful_degradation_used: Boolean(data.enhancement_stats?.graceful_degradation_used),
          deduplication_metrics: data.enhancement_stats?.deduplication_metrics ? {
            original_count: Number(data.enhancement_stats.deduplication_metrics.original_count) || 0,
            deduplicated_count: Number(data.enhancement_stats.deduplication_metrics.deduplicated_count) || 0,
            duplicates_removed: Number(data.enhancement_stats.deduplication_metrics.duplicates_removed) || 0,
            merge_decisions: Number(data.enhancement_stats.deduplication_metrics.merge_decisions) || 0,
            deduplication_rate: Number(data.enhancement_stats.deduplication_metrics.deduplication_rate) || 0
          } : undefined
        },
        errors: Array.isArray(data.errors) ? data.errors : undefined,
        timestamp: data.timestamp || new Date().toISOString()
      };

      const processingTime = Date.now() - startTime;
      console.log('✅ DataCollectionService: Collection completed', {
        candidates: response.total_candidates,
        processing_time: processingTime,
        errors: response.errors?.length || 0
      });

      return response;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('❌ DataCollectionService error:', error);
      
      // Return a partial response instead of throwing to provide better UX
      const fallbackResponse: DataCollectionResponse = {
        results: {},
        total_candidates: 0,
        total_validated: 0,
        query: params.query,
        location: params.location,
        enhancement_phase: 'Error Recovery',
        quality_metrics: {
          validation_rate: '0%',
          processing_time: `${Math.round(processingTime / 1000)}s`,
          time_efficiency: 'Failed',
          parallel_processing: false,
          smart_limiting: false,
          early_returns: false,
          progressive_enhancement: false,
          ai_processing: false,
          completion_rate: '0%',
          graceful_degradation: true
        },
        performance_metrics: {
          total_time_ms: processingTime,
          average_time_per_source: 0,
          timeout_rate: 100,
          success_rate: 0,
          candidates_per_successful_source: 0
        },
        enhancement_stats: {
          total_processed: 0,
          unique_candidates: 0,
          processing_time_ms: processingTime,
          time_budget_used: 100,
          sources_successful: 0,
          parallel_processing: false,
          progressive_enhancement: false,
          recommended_next_sources: [],
          completion_rate: 0,
          smart_timeouts: false,
          load_balancing: false,
          ai_enhancements: 0,
          apollo_enriched: 0,
          perplexity_enriched: 0,
          ai_summaries_generated: 0,
          ai_scored_candidates: 0,
          graceful_degradation_used: true
        },
        errors: [{ source: 'system', error: error.message || 'Unknown error' }],
        timestamp: new Date().toISOString()
      };

      throw error; // Still throw for proper error handling upstream
    }
  }
}
