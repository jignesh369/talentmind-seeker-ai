
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
    const { query, location, sources = ['github', 'stackoverflow', 'linkedin', 'google'], timeBudget = 60 } = options;

    console.log('🚀 Starting optimized collection with:', { query, location, sources });
    
    const response = await supabase.functions.invoke('enhanced-data-collection', {
      body: { 
        query, 
        location, 
        sources: sources.slice(0, 4), // Limit to 4 sources max
        time_budget: timeBudget
      }
    });

    if (response.error) {
      console.error('Collection error:', response.error);
      throw new Error(response.error.message || 'Data collection failed');
    }

    if (!response.data) {
      throw new Error('No data returned from collection');
    }

    return response.data;
  }
}
