
import { supabase } from '@/integrations/supabase/client';

export interface DataCollectionOptions {
  query: string;
  location?: string;
  sources?: string[];
  timeBudget?: number;
}

export interface SourceResult {
  candidates: any[];
  total: number;
  validated: number;
  error: string | null;
}

export interface DataCollectionResponse {
  results: {
    github: SourceResult;
    stackoverflow: SourceResult;
    google: SourceResult;
    linkedin: SourceResult;
    'linkedin-cross-platform': SourceResult;
    kaggle: SourceResult;
    devto: SourceResult;
  };
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
  };
  performance_metrics: {
    total_time_ms: number;
    average_time_per_source: number;
    timeout_rate: number;
    success_rate: number;
  };
  enhancement_stats: {
    total_processed: number;
    unique_candidates: number;
    processing_time_ms: number;
    time_budget_used: number;
    sources_successful: number;
    parallel_processing: boolean;
    ai_enhancements: number;
    apollo_enriched: number;
  };
  errors?: Array<{ source: string; error: string }>;
  timestamp: string;
}

export class DataCollectionService {
  static async collectCandidates(options: DataCollectionOptions): Promise<DataCollectionResponse> {
    const { query, location, sources = ['github', 'stackoverflow', 'linkedin', 'google'], timeBudget = 80 } = options;

    console.log('🚀 DataCollectionService: Starting collection', { 
      query, 
      location: location || 'Not specified', 
      sources: sources.slice(0, 4),
      timeBudget 
    });
    
    const response = await supabase.functions.invoke('enhanced-data-collection', {
      body: { 
        query, 
        location: location || undefined, // Ensure clean location parameter
        sources: sources.slice(0, 4), // Enforce max 4 sources
        time_budget: timeBudget
      }
    });

    if (response.error) {
      console.error('❌ DataCollectionService: Collection error:', response.error);
      // Provide more context in error messages
      let errorMessage = response.error.message || 'Data collection failed';
      
      if (errorMessage.includes('timeout')) {
        errorMessage = 'Collection timed out on the server. Try using fewer sources or a simpler query.';
      } else if (errorMessage.includes('rate limit')) {
        errorMessage = 'Service is temporarily rate limited. Please try again in a few minutes.';
      }
      
      throw new Error(errorMessage);
    }

    if (!response.data) {
      console.error('❌ DataCollectionService: No data returned');
      throw new Error('No data returned from collection service');
    }

    console.log('✅ DataCollectionService: Collection completed', {
      candidates: response.data.total_candidates,
      processing_time: response.data.performance_metrics?.total_time_ms
    });

    return response.data;
  }
}
