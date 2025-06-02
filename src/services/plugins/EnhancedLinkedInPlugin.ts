
import { DataSourcePlugin, PluginSearchRequest, PluginSearchResult } from '../core/DataSourcePlugin';
import { LinkedInCollectionService } from '../linkedinCollectionService';

export class EnhancedLinkedInPlugin extends DataSourcePlugin {
  name = 'linkedin';
  priority = 1;

  async isAvailable(): Promise<boolean> {
    try {
      // Check if both Google API and Apify API keys are configured
      const googleCheck = await fetch('/api/check-google-api', { method: 'HEAD' }).catch(() => false);
      const apifyCheck = await fetch('/api/check-apify-api', { method: 'HEAD' }).catch(() => false);
      return !!(googleCheck && apifyCheck);
    } catch {
      return false;
    }
  }

  async search(request: PluginSearchRequest): Promise<PluginSearchResult> {
    console.log(`🔍 Enhanced LinkedIn search: "${request.query}"`);

    try {
      const result = await LinkedInCollectionService.collectLinkedInProfiles({
        query: request.query,
        location: request.location,
        skills: request.parsedQuery?.skills || [],
        maxProfiles: request.limit || 20
      });

      const candidates = result.candidates.map(candidate => ({
        ...candidate,
        confidence_score: this.calculateConfidenceScore(candidate, request.parsedQuery),
        data_source: 'enhanced_linkedin_workflow'
      }));

      console.log(`✅ Enhanced LinkedIn found ${candidates.length} candidates via workflow`);
      console.log(`📊 Discovery: ${result.discoveryPhase.profileUrls.length} URLs found`);
      console.log(`📊 Scraping: ${result.scrapingPhase.successfulScrapes}/${result.scrapingPhase.profilesProcessed} successful`);

      return {
        candidates,
        metadata: {
          totalFound: candidates.length,
          searchStrategy: 'enhanced_google_apify_workflow',
          confidence: 95,
          discoveryPhase: result.discoveryPhase,
          scrapingPhase: result.scrapingPhase,
          processingTime: result.totalProcessingTime
        }
      };

    } catch (error: any) {
      console.error('❌ Enhanced LinkedIn search failed:', error);
      
      if (error.message?.includes('Google Search')) {
        throw new Error('Enhanced LinkedIn search failed: Google Search API issue. Please check your API configuration.');
      } else if (error.message?.includes('Apify')) {
        throw new Error('Enhanced LinkedIn search failed: Apify scraping issue. Please check your Apify API key.');
      }
      
      throw new Error(`Enhanced LinkedIn search failed: ${error.message}`);
    }
  }

  validateResult(candidate: any): boolean {
    return !!(candidate.name && candidate.title && candidate.linkedin_url);
  }

  private calculateConfidenceScore(candidate: any, parsedQuery: any): number {
    let confidence = 92; // Higher base confidence for enhanced workflow

    // Boost confidence based on workflow quality
    if (candidate.platform_data?.collection_method === 'enhanced_workflow') confidence += 5;
    if (candidate.summary && candidate.summary.length > 100) confidence += 3;
    
    return Math.min(confidence, 100);
  }
}
