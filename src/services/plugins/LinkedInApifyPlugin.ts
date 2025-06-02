
import { DataSourcePlugin, PluginSearchRequest, PluginSearchResult } from '../core/DataSourcePlugin';
import { supabase } from '@/integrations/supabase/client';

export class LinkedInApifyPlugin extends DataSourcePlugin {
  name = 'linkedin';
  priority = 1;

  async isAvailable(): Promise<boolean> {
    try {
      // Check if Apify API key is configured
      const { data } = await supabase.functions.invoke('collect-linkedin-data', {
        body: { query: 'test', test_mode: true }
      });
      return true;
    } catch (error: any) {
      console.warn('LinkedIn Apify plugin not available:', error.message);
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
          time_budget: 300
        }
      });

      if (error) {
        throw new Error(`LinkedIn Apify search failed: ${error.message}`);
      }

      const candidates = (data?.candidates || []).map((candidate: any) => ({
        ...candidate,
        id: candidate.id || this.generateCandidateId(),
        platform: 'linkedin',
        data_source: 'apify_linkedin_scraper',
        search_query: request.query,
        confidence_score: this.calculateConfidenceScore(candidate, request.parsedQuery)
      }));

      console.log(`✅ LinkedIn Apify found ${candidates.length} candidates`);

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
      
      // Provide helpful error messages
      if (error.message?.includes('API key')) {
        throw new Error('LinkedIn search failed: Apify API key not configured. Please add your Apify API key in the settings.');
      }
      
      throw new Error(`LinkedIn search failed: ${error.message}`);
    }
  }

  validateResult(candidate: any): boolean {
    return !!(candidate.name && candidate.title && candidate.linkedin_url);
  }

  private calculateConfidenceScore(candidate: any, parsedQuery: any): number {
    let confidence = 90; // Higher base confidence for LinkedIn data

    // Boost confidence based on profile completeness
    if (candidate.summary && candidate.summary.length > 50) confidence += 5;
    if (candidate.platform_data?.experience?.length > 0) confidence += 3;
    if (candidate.skills?.length > 0) confidence += 2;

    return Math.min(confidence, 100);
  }
}
