
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
    setProgress('🚀 Initializing Phase 2.5 enhanced multi-source collection...');

    try {
      setProgress('🔍 Building enhanced semantic understanding with Apollo.io email discovery...');
      
      console.log('Starting enhanced data collection with:', { query, location, sources });
      
      const { data, error } = await supabase.functions.invoke('enhanced-data-collection', {
        body: { query, location, sources }
      });

      console.log('Enhanced data collection response:', { data, error });

      if (error) {
        console.error('Phase 2.5 enhanced data collection error:', error);
        throw new Error(error.message || 'Enhanced multi-source collection failed');
      }

      if (!data) {
        throw new Error('No data returned from enhanced collection');
      }

      setCollectionResult(data);
      setProgress('');
      
      const successfulSources = Object.values(data.results).filter((result: any) => !result.error).length;
      const failedSources = sources.length - successfulSources;
      const validationRate = data.quality_metrics?.validation_rate || '0';
      
      // Enhanced success message with new features and error reporting
      const readmeEmails = data.enhancement_stats?.readme_emails_found || 0;
      const apolloEmails = data.enhancement_stats?.apollo_enriched_candidates || 0;
      const expertiseCandidates = data.enhancement_stats?.expertise_level_candidates || 0;
      const crossPlatformMatches = data.enhancement_stats?.cross_platform_correlations || 0;
      const googleDiscoveries = data.enhancement_stats?.enhanced_google_discoveries || 0;
      
      const featureHighlights = [];
      if (readmeEmails > 0) featureHighlights.push(`${readmeEmails} GitHub README emails`);
      if (apolloEmails > 0) featureHighlights.push(`${apolloEmails} Apollo.io enriched`);
      if (googleDiscoveries > 0) featureHighlights.push(`${googleDiscoveries} Google discoveries`);
      if (expertiseCandidates > 0) featureHighlights.push(`${expertiseCandidates} expertise-validated`);
      if (crossPlatformMatches > 0) featureHighlights.push(`${crossPlatformMatches} cross-platform matches`);
      
      // Check for errors and include them in the message
      const errorSources = data.errors || [];
      const errorMessage = errorSources.length > 0 
        ? ` (${errorSources.length} sources had issues: ${errorSources.map(e => e.source).join(', ')})`
        : failedSources > 0 
        ? ` (${failedSources} sources failed)`
        : '';
      
      toast({
        title: "🚀 Phase 2.5 Enhanced Collection Completed",
        description: `🎯 Found ${data.total_validated} quality candidates (${validationRate}% success rate)${data.quality_metrics?.apollo_enriched ? ' with Apollo.io email discovery' : ''}${data.quality_metrics?.enhanced_google_search ? ' + targeted Google search' : ''}${data.quality_metrics?.github_readme_crawling ? ' + README email extraction' : ''}${featureHighlights.length > 0 ? `. Features: ${featureHighlights.join(', ')}` : ''}${errorMessage}`,
        variant: data.total_validated > 0 ? "default" : "destructive",
      });

      return data;

    } catch (error: any) {
      console.error('Phase 2.5 enhanced data collection error:', error);
      setProgress('');
      
      let errorMessage = "Failed to collect candidates with Phase 2.5 enhancements";
      let debugInfo = "";
      
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = "Network error: Unable to connect to the data collection service. Please check your connection and try again.";
        debugInfo = "This might indicate an edge function deployment issue or network connectivity problem.";
      } else if (error.message?.includes('timeout')) {
        errorMessage = "Request timed out. The enhanced validation with Apollo.io enrichment takes time. Please try again.";
        debugInfo = "Consider reducing the number of sources or try again with a more specific query.";
      } else if (error.message?.includes('API')) {
        errorMessage = "AI or Apollo service temporarily unavailable. Please try again later.";
        debugInfo = "Some external services may be experiencing issues.";
      } else if (error.message?.includes('configuration')) {
        errorMessage = "Server configuration error. Please contact support.";
        debugInfo = "This indicates missing API keys or environment setup issues.";
      }
      
      console.error('Detailed error information:', {
        originalError: error,
        errorMessage,
        debugInfo,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Phase 2.5 Collection Failed",
        description: errorMessage + (debugInfo ? ` ${debugInfo}` : ''),
        variant: "destructive",
      });
      
      // Return partial result for debugging if available
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
