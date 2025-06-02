
import { DataSourcePlugin, PluginSearchRequest, PluginSearchResult } from '../core/DataSourcePlugin';
import { supabase } from '@/integrations/supabase/client';

export class LinkedInApifyPlugin extends DataSourcePlugin {
  name = 'linkedin';
  priority = 1;

  async isAvailable(): Promise<boolean> {
    // Check if Apify API key is configured
    try {
      const { data } = await supabase.functions.invoke('check-apify-availability');
      return data?.available || false;
    } catch {
      return false;
    }
  }

  async search(request: PluginSearchRequest): Promise<PluginSearchResult> {
    console.log(`🔍 LinkedIn Apify search: "${request.query}"`);

    try {
      const { data, error } = await supabase.functions.invoke('collect-linkedin-data', {
        body: {
          query: request.query,
          location: request.location,
          limit: request.limit,
          use_apify: true
        }
      });

      if (error) {
        throw new Error(`LinkedIn Apify search failed: ${error.message}`);
      }

      const candidates = (data?.candidates || []).map((candidate: any) => ({
        ...candidate,
        id: candidate.id || this.generateCandidateId(),
        platform: 'linkedin',
        data_source: 'apify_real',
        search_query: request.query,
        confidence_score: this.calculateConfidenceScore(candidate, request.parsedQuery)
      }));

      console.log(`✅ LinkedIn Apify found ${candidates.length} real candidates`);

      return {
        candidates,
        metadata: {
          totalFound: candidates.length,
          searchStrategy: 'apify_linkedin_scraper',
          confidence: 95
        }
      };

    } catch (error: any) {
      console.error('❌ LinkedIn Apify search failed:', error);
      throw error;
    }
  }

  validateResult(candidate: any): boolean {
    return !!(candidate.name && candidate.headline && candidate.profile_url);
  }

  private calculateConfidenceScore(candidate: any, parsedQuery: any): number {
    let confidence = 70; // Base confidence for real LinkedIn data

    // Boost confidence based on profile completeness
    if (candidate.summary) confidence += 10;
    if (candidate.experience?.length > 0) confidence += 10;
    if (candidate.skills?.length > 0) confidence += 5;
    if (candidate.connections > 100) confidence += 5;

    return Math.min(confidence, 100);
  }
}
