
import { supabase } from '@/integrations/supabase/client';

export interface DataCollectionOptions {
  query: string;
  location?: string;
  sources?: string[];
  timeBudget?: number;
}

export interface DataCollectionResponse {
  results: Record<string, any>;
  total_candidates: number;
  total_validated: number;
  query: string;
  location?: string;
  enhancement_phase: string;
  quality_metrics: any;
  performance_metrics: any;
  enhancement_stats: any;
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
