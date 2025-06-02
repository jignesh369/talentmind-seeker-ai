
import { supabase } from '@/integrations/supabase/client';

export interface LinkedInProfileDiscovery {
  profileUrls: string[];
  searchQuery: string;
  totalFound: number;
}

export interface LinkedInCollectionResult {
  candidates: any[];
  discoveryPhase: LinkedInProfileDiscovery;
  scrapingPhase: {
    profilesProcessed: number;
    successfulScrapes: number;
    errors: string[];
  };
  totalProcessingTime: number;
}

export class LinkedInCollectionService {
  static async collectLinkedInProfiles(params: {
    query: string;
    location?: string;
    skills?: string[];
    maxProfiles?: number;
  }): Promise<LinkedInCollectionResult> {
    console.log('🚀 Starting enhanced LinkedIn collection workflow');
    const startTime = Date.now();
    
    try {
      // Phase 1: Discover LinkedIn profile URLs using Google Search
      console.log('📍 Phase 1: Discovering LinkedIn profiles via Google Search');
      const discovery = await this.discoverLinkedInProfiles(params);
      
      if (discovery.profileUrls.length === 0) {
        throw new Error('No LinkedIn profiles found in Google search');
      }
      
      console.log(`✅ Discovery complete: Found ${discovery.profileUrls.length} LinkedIn profile URLs`);
      
      // Phase 2: Scrape detailed profile information using Apify
      console.log('📍 Phase 2: Scraping detailed profile information');
      const scrapingResult = await this.scrapeProfileDetails(discovery.profileUrls, params.query);
      
      const totalProcessingTime = Date.now() - startTime;
      
      return {
        candidates: scrapingResult.candidates,
        discoveryPhase: discovery,
        scrapingPhase: scrapingResult.stats,
        totalProcessingTime
      };
      
    } catch (error: any) {
      console.error('❌ Enhanced LinkedIn collection failed:', error);
      throw error;
    }
  }
  
  private static async discoverLinkedInProfiles(params: {
    query: string;
    location?: string;
    skills?: string[];
    maxProfiles?: number;
  }): Promise<LinkedInProfileDiscovery> {
    // Build targeted Google search query
    const searchQuery = this.buildLinkedInSearchQuery(params);
    
    const { data, error } = await supabase.functions.invoke('discover-linkedin-profiles', {
      body: {
        searchQuery,
        maxResults: params.maxProfiles || 20
      }
    });
    
    if (error) {
      throw new Error(`LinkedIn profile discovery failed: ${error.message}`);
    }
    
    return {
      profileUrls: data?.profileUrls || [],
      searchQuery,
      totalFound: data?.totalFound || 0
    };
  }
  
  private static async scrapeProfileDetails(
    profileUrls: string[], 
    originalQuery: string
  ): Promise<{ candidates: any[]; stats: any }> {
    const { data, error } = await supabase.functions.invoke('scrape-linkedin-profiles', {
      body: {
        profileUrls,
        originalQuery
      }
    });
    
    if (error) {
      throw new Error(`LinkedIn profile scraping failed: ${error.message}`);
    }
    
    return {
      candidates: data?.candidates || [],
      stats: {
        profilesProcessed: profileUrls.length,
        successfulScrapes: data?.candidates?.length || 0,
        errors: data?.errors || []
      }
    };
  }
  
  private static buildLinkedInSearchQuery(params: {
    query: string;
    location?: string;
    skills?: string[];
  }): string {
    let query = `site:linkedin.com/in "${params.query}"`;
    
    if (params.location) {
      query += ` AND "${params.location}"`;
    }
    
    if (params.skills && params.skills.length > 0) {
      const skillsQuery = params.skills.map(skill => `"${skill}"`).join(' OR ');
      query += ` AND (${skillsQuery})`;
    }
    
    return query;
  }
}
