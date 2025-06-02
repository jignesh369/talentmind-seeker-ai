
import { DataSourcePlugin, PluginSearchRequest, PluginSearchResult } from '../core/DataSourcePlugin';
import { supabase } from '@/integrations/supabase/client';

export class GoogleSearchRealPlugin extends DataSourcePlugin {
  name = 'google';
  priority = 4;

  async isAvailable(): Promise<boolean> {
    try {
      const { data } = await supabase.functions.invoke('check-google-availability');
      return data?.available || false;
    } catch {
      return false;
    }
  }

  async search(request: PluginSearchRequest): Promise<PluginSearchResult> {
    console.log(`🔍 Google Search real search: "${request.query}"`);

    try {
      const { data, error } = await supabase.functions.invoke('collect-google-search-data', {
        body: {
          query: request.query,
          location: request.location,
          time_budget: 15
        }
      });

      if (error) {
        throw new Error(`Google Search failed: ${error.message}`);
      }

      const candidates = (data?.candidates || []).map((candidate: any) => ({
        ...candidate,
        id: candidate.id || this.generateCandidateId(),
        platform: 'google_search',
        data_source: 'google_custom_search_real',
        search_query: request.query,
        confidence_score: this.calculateConfidenceScore(candidate, request.parsedQuery)
      }));

      console.log(`✅ Google Search found ${candidates.length} real candidates`);

      return {
        candidates,
        metadata: {
          totalFound: candidates.length,
          searchStrategy: 'google_custom_search_api',
          confidence: 75
        }
      };

    } catch (error: any) {
      console.error('❌ Google Search failed:', error);
      throw error;
    }
  }

  validateResult(candidate: any): boolean {
    return !!(candidate.name && candidate.title);
  }

  private calculateConfidenceScore(candidate: any, parsedQuery: any): number {
    let confidence = 65; // Base confidence for Google Search results

    // Boost confidence based on result relevance
    if (candidate.summary?.length > 100) confidence += 10;
    if (candidate.skills?.length > 0) confidence += 10;
    if (candidate.experience_years > 0) confidence += 5;

    return Math.min(confidence, 100);
  }
}
