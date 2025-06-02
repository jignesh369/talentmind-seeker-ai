
import { DataSourcePlugin, PluginSearchRequest, PluginSearchResult } from '../core/DataSourcePlugin';
import { supabase } from '@/integrations/supabase/client';

export class GitHubRealPlugin extends DataSourcePlugin {
  name = 'github';
  priority = 2;

  async isAvailable(): Promise<boolean> {
    try {
      const { data } = await supabase.functions.invoke('check-github-availability');
      return data?.available || false;
    } catch {
      return false;
    }
  }

  async search(request: PluginSearchRequest): Promise<PluginSearchResult> {
    console.log(`🔍 GitHub real search: "${request.query}"`);

    try {
      const { data, error } = await supabase.functions.invoke('collect-github-data', {
        body: {
          query: request.query,
          location: request.location,
          time_budget: 25
        }
      });

      if (error) {
        throw new Error(`GitHub search failed: ${error.message}`);
      }

      const candidates = (data?.candidates || []).map((candidate: any) => ({
        ...candidate,
        id: candidate.id || this.generateCandidateId(),
        platform: 'github',
        data_source: 'github_api_real',
        search_query: request.query,
        confidence_score: this.calculateConfidenceScore(candidate, request.parsedQuery),
        total_stars: candidate.total_stars || 0,
        total_forks: candidate.total_forks || 0
      }));

      console.log(`✅ GitHub found ${candidates.length} real candidates`);

      return {
        candidates,
        metadata: {
          totalFound: candidates.length,
          searchStrategy: 'github_api_enhanced',
          confidence: 90
        }
      };

    } catch (error: any) {
      console.error('❌ GitHub search failed:', error);
      throw error;
    }
  }

  validateResult(candidate: any): boolean {
    return !!(candidate.name && candidate.github_username);
  }

  private calculateConfidenceScore(candidate: any, parsedQuery: any): number {
    let confidence = 85; // Base confidence for real GitHub data

    // Boost confidence based on GitHub activity
    if (candidate.total_stars > 10) confidence += 5;
    if (candidate.followers > 50) confidence += 5;
    if (candidate.skills?.length > 3) confidence += 5;

    return Math.min(confidence, 100);
  }
}
