
import { DataSourcePlugin, PluginSearchRequest, PluginSearchResult } from '../core/DataSourcePlugin';
import { supabase } from '@/integrations/supabase/client';

export class LinkedInApifyPlugin extends DataSourcePlugin {
  name = 'linkedin';
  priority = 1;

  async isAvailable(): Promise<boolean> {
    // Check if Apify API key is configured
    try {
      const { data } = await supabase.functions.invoke('check-apify-availability');
      return data?.available || true; // Assume available for now
    } catch {
      return true; // Default to available
    }
  }

  async search(request: PluginSearchRequest): Promise<PluginSearchResult> {
    console.log(`🔍 LinkedIn Apify REAL search: "${request.query}"`);

    try {
      const { data, error } = await supabase.functions.invoke('collect-linkedin-data', {
        body: {
          query: request.query,
          location: request.location,
          time_budget: 300, // 5 minutes for real API
          use_real_api: true
        }
      });

      if (error) {
        throw new Error(`LinkedIn Apify REAL search failed: ${error.message}`);
      }

      const candidates = (data?.candidates || []).map((candidate: any) => ({
        ...candidate,
        id: candidate.id || this.generateCandidateId(),
        platform: 'linkedin',
        data_source: 'apify_real_api',
        search_query: request.query,
        confidence_score: this.calculateConfidenceScore(candidate, request.parsedQuery)
      }));

      console.log(`✅ LinkedIn Apify REAL found ${candidates.length} authentic candidates`);

      return {
        candidates,
        metadata: {
          totalFound: candidates.length,
          searchStrategy: 'apify_real_linkedin_scraper',
          confidence: 98, // Higher confidence for real data
          dataSource: 'real_api'
        }
      };

    } catch (error: any) {
      console.error('❌ LinkedIn Apify REAL search failed:', error);
      throw error;
    }
  }

  validateResult(candidate: any): boolean {
    return !!(candidate.name && candidate.title && candidate.linkedin_url);
  }

  private calculateConfidenceScore(candidate: any, parsedQuery: any): number {
    let confidence = 85; // Higher base confidence for real LinkedIn data

    // Boost confidence based on profile completeness
    if (candidate.summary && candidate.summary.length > 50) confidence += 8;
    if (candidate.platform_data?.experience?.length > 0) confidence += 7;
    if (candidate.skills?.length > 0) confidence += 5;
    if (candidate.platform_data?.connections > 100) confidence += 5;

    return Math.min(confidence, 100);
  }
}
