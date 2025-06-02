
import { DataSourcePlugin, PluginSearchRequest, PluginSearchResult } from '../core/DataSourcePlugin';
import { supabase } from '@/integrations/supabase/client';

export class StackOverflowRealPlugin extends DataSourcePlugin {
  name = 'stackoverflow';
  priority = 3;

  async isAvailable(): Promise<boolean> {
    // StackOverflow API is always available (no API key required)
    return true;
  }

  async search(request: PluginSearchRequest): Promise<PluginSearchResult> {
    console.log(`🔍 StackOverflow real search: "${request.query}"`);

    try {
      const { data, error } = await supabase.functions.invoke('collect-stackoverflow-data', {
        body: {
          query: request.query,
          time_budget: 20,
          use_real_api: true
        }
      });

      if (error) {
        throw new Error(`StackOverflow search failed: ${error.message}`);
      }

      const candidates = (data?.candidates || []).map((candidate: any) => ({
        ...candidate,
        id: candidate.id || this.generateCandidateId(),
        platform: 'stackoverflow',
        data_source: 'stackoverflow_api_real',
        search_query: request.query,
        confidence_score: this.calculateConfidenceScore(candidate, request.parsedQuery)
      }));

      console.log(`✅ StackOverflow found ${candidates.length} real candidates`);

      return {
        candidates,
        metadata: {
          totalFound: candidates.length,
          searchStrategy: 'stackoverflow_api_v2.3',
          confidence: 88
        }
      };

    } catch (error: any) {
      console.error('❌ StackOverflow search failed:', error);
      throw error;
    }
  }

  validateResult(candidate: any): boolean {
    return !!(candidate.name && candidate.reputation !== undefined);
  }

  private calculateConfidenceScore(candidate: any, parsedQuery: any): number {
    let confidence = 80; // Base confidence for real StackOverflow data

    // Boost confidence based on StackOverflow reputation
    if (candidate.reputation > 1000) confidence += 10;
    if (candidate.reputation > 5000) confidence += 5;
    if (candidate.badge_counts?.gold > 0) confidence += 5;

    return Math.min(confidence, 100);
  }
}
