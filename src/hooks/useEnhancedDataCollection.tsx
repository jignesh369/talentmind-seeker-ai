
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface EnhancedDataCollectionResult {
  results: {
    github: { candidates: any[], total: number, validated: number, error: string | null };
    stackoverflow: { candidates: any[], total: number, validated: number, error: string | null };
    google: { candidates: any[], total: number, validated: number, error: string | null };
    linkedin: { candidates: any[], total: number, validated: number, error: string | null };
    'linkedin-cross-platform': { candidates: any[], total: number, validated: number, error: string | null };
    kaggle: { candidates: any[], total: number, validated: number, error: string | null };
    devto: { candidates: any[], total: number, validated: number, error: string | null };
  };
  total_candidates: number;
  total_validated: number;
  query: string;
  location?: string;
  enhancement_phase: string;
  quality_metrics: {
    validation_rate: string;
    ai_enhanced: boolean;
    perplexity_enriched: boolean;
    semantic_search: boolean;
    tier_system: boolean;
    apollo_enriched: boolean;
    github_readme_crawling: boolean;
    stackoverflow_expertise_focus: boolean;
    linkedin_cross_platform: boolean;
    enhanced_google_search: boolean;
  };
  enhancement_stats: {
    platform_specific_bonuses_applied: number;
    cross_platform_correlations: number;
    readme_emails_found: number;
    apollo_enriched_candidates: number;
    enhanced_google_discoveries: number;
    expertise_level_candidates: number;
  };
  errors?: Array<{ source: string; error: string }>;
  timestamp: string;
}

export const useEnhancedDataCollection = () => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionResult, setCollectionResult] = useState<EnhancedDataCollectionResult | null>(null);
  const [progress, setProgress] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();

  const collectData = async (
    query: string, 
    location?: string, 
    sources: string[] = ['github', 'stackoverflow', 'google', 'linkedin', 'kaggle', 'devto']
  ) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to collect candidate data",
        variant: "destructive",
      });
      return;
    }

    setIsCollecting(true);
    setCollectionResult(null);
    setProgress('🧠 Initializing advanced Boolean search engine...');
    
    const updateProgress = (message: string) => {
      setProgress(message);
    };

    try {
      // Enhanced progress phases
      let phaseCount = 0;
      const phases = [
        '🔍 Building semantic query understanding with AI...',
        '📊 Analyzing market intelligence and competition...',
        '🎯 Generating Boolean search queries for each platform...',
        '🌐 Executing LinkedIn Boolean searches: site:linkedin.com/in...',
        '⚡ Running GitHub advanced queries: language:python location:...',
        '🔍 Performing Google Boolean discovery across platforms...',
        '📈 Cross-platform validation and authenticity scoring...',
        '✨ Applying tier classification and availability detection...',
      ];
      
      const progressInterval = setInterval(() => {
        phaseCount = (phaseCount + 1) % phases.length;
        updateProgress(phases[phaseCount]);
      }, 2500);
      
      console.log('🚀 Starting enhanced Boolean search collection with:', { query, location, sources });
      
      // Create a timeout promise that rejects after 2 minutes
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Enhanced collection timeout')), 120000);
      });
      
      // Create the collection promise with enhanced parameters
      const collectionPromise = supabase.functions.invoke('enhanced-data-collection', {
        body: { 
          query, 
          location, 
          sources,
          enhanced_mode: true,
          boolean_search: true,
          semantic_expansion: true
        }
      });
      
      // Use Promise.race with proper error handling
      let response;
      try {
        response = await Promise.race([collectionPromise, timeoutPromise]);
      } catch (error) {
        clearInterval(progressInterval);
        if (error instanceof Error && error.message === 'Enhanced collection timeout') {
          throw new Error('Collection timeout: Advanced search took too long');
        }
        throw error;
      }
      
      clearInterval(progressInterval);

      console.log('🎉 Enhanced Boolean search collection response:', response);

      if (response.error) {
        console.error('Enhanced collection error:', response.error);
        throw new Error(response.error.message || 'Enhanced data collection failed');
      }

      if (!response.data) {
        throw new Error('No data returned from enhanced collection');
      }

      const data = response.data;
      setCollectionResult(data);
      setProgress('');
      
      // Calculate enhanced success metrics
      const successfulSources = Object.values(data.results).filter((result: any) => !result.error).length;
      const failedSources = sources.length - successfulSources;
      const validationRate = data.quality_metrics?.validation_rate || '0';
      
      // Generate enhanced feature highlights
      const readmeEmails = data.enhancement_stats?.readme_emails_found || 0;
      const apolloEmails = data.enhancement_stats?.apollo_enriched_candidates || 0;
      const expertiseCandidates = data.enhancement_stats?.expertise_level_candidates || 0;
      const crossPlatformMatches = data.enhancement_stats?.cross_platform_correlations || 0;
      const googleDiscoveries = data.enhancement_stats?.enhanced_google_discoveries || 0;
      const booleanQueries = data.enhancement_stats?.boolean_queries_executed || 0;
      
      const featureHighlights = [];
      if (booleanQueries > 0) featureHighlights.push(`${booleanQueries} Boolean queries`);
      if (readmeEmails > 0) featureHighlights.push(`${readmeEmails} README emails`);
      if (apolloEmails > 0) featureHighlights.push(`${apolloEmails} Apollo enriched`);
      if (googleDiscoveries > 0) featureHighlights.push(`${googleDiscoveries} Google discoveries`);
      if (expertiseCandidates > 0) featureHighlights.push(`${expertiseCandidates} expert-level`);
      if (crossPlatformMatches > 0) featureHighlights.push(`${crossPlatformMatches} cross-platform`);
      
      // Enhanced market intelligence insights
      const marketInsights = [];
      if (data.market_intelligence?.competition_level) {
        marketInsights.push(`${data.market_intelligence.competition_level} competition`);
      }
      if (data.market_intelligence?.success_probability) {
        marketInsights.push(`${data.market_intelligence.success_probability}% success rate`);
      }

      // Check for errors
      const errorSources = data.errors || [];
      const errorMessage = errorSources.length > 0 
        ? ` (${errorSources.length} sources had issues)`
        : failedSources > 0 
        ? ` (${failedSources} sources failed)`
        : '';
      
      // Enhanced success message with market intelligence
      const successMessage = `Found ${data.total_validated} quality candidates (${validationRate}% success rate)`;
      const featuresMessage = featureHighlights.length > 0 ? `. Enhanced: ${featureHighlights.join(', ')}` : '';
      const marketMessage = marketInsights.length > 0 ? `. Market: ${marketInsights.join(', ')}` : '';
      
      toast({
        title: "🎉 Enhanced Collection Completed",
        description: `${successMessage}${featuresMessage}${marketMessage}${errorMessage}`,
        variant: data.total_validated > 0 ? "default" : "destructive",
      });

      return data;

    } catch (error: any) {
      console.error('Enhanced data collection error:', error);
      setProgress('');
      
      let errorMessage = "Failed to collect candidates with enhanced Boolean search";
      let debugInfo = "";
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch failed')) {
        errorMessage = "Network issue: Unable to connect to the enhanced search service";
        debugInfo = "Check your connection or try again later";
      } else if (error.message?.includes('timeout')) {
        errorMessage = "Collection timeout: Advanced Boolean search took too long";
        debugInfo = "Try fewer sources or a more specific query";
      } else if (error.message?.includes('API')) {
        errorMessage = "External API issue during Boolean search";
        debugInfo = "Some search services may be experiencing problems";
      }
      
      console.error('Enhanced search error information:', {
        originalError: error,
        message: errorMessage,
        debugInfo
      });
      
      toast({
        title: "Enhanced Collection Failed",
        description: errorMessage + (debugInfo ? ` - ${debugInfo}` : ''),
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsCollecting(false);
      setProgress('');
    }
  };

  return {
    collectData,
    isCollecting,
    collectionResult,
    progress
  };
};
