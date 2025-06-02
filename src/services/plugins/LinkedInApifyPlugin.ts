
import { DataSourcePlugin, PluginSearchRequest, PluginSearchResult } from '../core/DataSourcePlugin';
import { LinkedInCollectionService } from '../linkedinCollectionService';

export class LinkedInApifyPlugin extends DataSourcePlugin {
  name = 'linkedin';
  priority = 1;

  async isAvailable(): Promise<boolean> {
    try {
      // Check if enhanced workflow is available (Google + Apify)
      const googleApiKey = process.env.GOOGLE_API_KEY || 'configured';
      const apifyApiKey = process.env.APIFY_API_KEY || 'configured';
      return !!(googleApiKey && apifyApiKey);
    } catch {
      return false;
    }
  }

  async search(request: PluginSearchRequest): Promise<PluginSearchResult> {
    console.log(`🔍 LinkedIn Enhanced Workflow search: "${request.query}"`);

    try {
      // Use the enhanced LinkedIn collection workflow
      const result = await LinkedInCollectionService.collectLinkedInProfiles({
        query: request.query,
        location: request.location,
        skills: request.parsedQuery?.skills || [],
        maxProfiles: request.limit || 20
      });

      const candidates = result.candidates.map(candidate => ({
        ...candidate,
        id: candidate.id || this.generateCandidateId(),
        platform: 'linkedin',
        data_source: 'enhanced_linkedin_workflow',
        search_query: request.query,
        confidence_score: this.calculateConfidenceScore(candidate, request.parsedQuery)
      }));

      console.log(`✅ LinkedIn Enhanced Workflow found ${candidates.length} candidates`);
      console.log(`📊 Workflow stats: ${result.discoveryPhase.profileUrls.length} URLs discovered, ${result.scrapingPhase.successfulScrapes} profiles scraped`);

      return {
        candidates,
        metadata: {
          totalFound: candidates.length,
          searchStrategy: 'enhanced_google_apify_workflow',
          confidence: 96,
          workflowStats: {
            discoveryPhase: result.discoveryPhase,
            scrapingPhase: result.scrapingPhase,
            totalProcessingTime: result.totalProcessingTime
          }
        }
      };

    } catch (error: any) {
      console.error('❌ LinkedIn Enhanced Workflow failed:', error);
      
      // Provide helpful error messages
      if (error.message?.includes('Google Search')) {
        throw new Error('LinkedIn search failed: Google Search API configuration issue. Please check your Google API key and Search Engine ID.');
      } else if (error.message?.includes('Apify')) {
        throw new Error('LinkedIn search failed: Apify API configuration issue. Please check your Apify API key.');
      } else if (error.message?.includes('No LinkedIn profiles found')) {
        throw new Error('LinkedIn search failed: No matching profiles found. Try adjusting your search query or location.');
      }
      
      throw new Error(`LinkedIn search failed: ${error.message}`);
    }
  }

  validateResult(candidate: any): boolean {
    return !!(candidate.name && candidate.title && candidate.linkedin_url);
  }

  private calculateConfidenceScore(candidate: any, parsedQuery: any): number {
    let confidence = 94; // High base confidence for enhanced workflow

    // Boost confidence based on enhanced workflow quality
    if (candidate.platform_data?.collection_method === 'enhanced_workflow') confidence += 4;
    if (candidate.platform_data?.discovery_method === 'google_search') confidence += 2;
    if (candidate.summary && candidate.summary.length > 50) confidence += 3;
    if (candidate.platform_data?.experience?.length > 0) confidence += 2;
    if (candidate.skills?.length > 0) confidence += 1;

    return Math.min(confidence, 100);
  }
}
