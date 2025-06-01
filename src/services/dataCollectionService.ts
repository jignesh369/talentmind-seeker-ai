
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

    // Validate inputs
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (timeBudget < 30 || timeBudget > 120) {
      console.warn('⚠️ Time budget outside recommended range (30-120s), adjusting to 80s');
    }
    
    // Clean and validate location parameter
    const cleanLocation = location && location.trim() !== '' && location !== 'undefined' ? location.trim() : undefined;
    
    const response = await supabase.functions.invoke('enhanced-data-collection', {
      body: { 
        query: query.trim(), 
        location: cleanLocation,
        sources: sources.slice(0, 4), // Enforce max 4 sources
        time_budget: Math.min(Math.max(timeBudget, 30), 120) // Clamp between 30-120s
      }
    });

    if (response.error) {
      console.error('❌ DataCollectionService: Collection error:', response.error);
      
      // Enhanced error message handling
      let errorMessage = response.error.message || 'Data collection failed';
      
      if (errorMessage.includes('timeout')) {
        errorMessage = 'Collection timed out. Try using fewer sources or a simpler query.';
      } else if (errorMessage.includes('rate limit')) {
        errorMessage = 'Service temporarily rate limited. Please try again in a few minutes.';
      } else if (errorMessage.includes('API key')) {
        errorMessage = 'API configuration issue. Please check system configuration.';
      } else if (errorMessage.includes('invalid')) {
        errorMessage = 'Invalid request parameters. Please check your search query.';
      }
      
      throw new Error(errorMessage);
    }

    if (!response.data) {
      console.error('❌ DataCollectionService: No data returned');
      throw new Error('No data returned from collection service');
    }

    // Validate response structure
    if (typeof response.data.total_candidates !== 'number') {
      console.warn('⚠️ Invalid response structure, attempting to fix');
      response.data.total_candidates = response.data.total_candidates || 0;
    }

    console.log('✅ DataCollectionService: Collection completed', {
      candidates: response.data.total_candidates,
      processing_time: response.data.performance_metrics?.total_time_ms,
      errors: response.data.errors?.length || 0
    });

    return response.data;
  }
}
