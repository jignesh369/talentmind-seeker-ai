
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
    setProgress('🚀 Initializing optimized multi-source collection...');
    
    const updateProgress = (message: string) => {
      setProgress(message);
    };

    try {
      // Set up a progress update interval
      let phaseCount = 0;
      const phases = [
        '🔍 Building semantic understanding of search query...',
        '🌐 Preparing API connections for data sources...',
        '👩‍💻 Searching for developer profiles across platforms...',
        '🧠 Validating candidate relevance with AI...',
        '📊 Applying cross-platform scoring bonuses...',
        '✉️ Discovering contact information when available...',
      ];
      
      const progressInterval = setInterval(() => {
        phaseCount = (phaseCount + 1) % phases.length;
        updateProgress(phases[phaseCount]);
      }, 3000);
      
      console.log('Starting optimized data collection with:', { query, location, sources });
      
      // Create a timeout promise that rejects
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Data collection timeout')), 120000);
      });
      
      // Create the collection promise with proper typing
      const collectionPromise = supabase.functions.invoke('enhanced-data-collection', {
        body: { query, location, sources }
      });
      
      // Use Promise.race with proper error handling
      let response;
      try {
        response = await Promise.race([collectionPromise, timeoutPromise]);
      } catch (error) {
        clearInterval(progressInterval);
        if (error instanceof Error && error.message === 'Data collection timeout') {
          throw new Error('Collection timeout: Operation took too long');
        }
        throw error;
      }
      
      clearInterval(progressInterval);

      console.log('Enhanced data collection response:', response);

      if (response.error) {
        console.error('Data collection error:', response.error);
        throw new Error(response.error.message || 'Data collection failed');
      }

      if (!response.data) {
        throw new Error('No data returned from collection');
      }

      const data = response.data;
      setCollectionResult(data);
      setProgress('');
      
      // Calculate success metrics
      const successfulSources = Object.values(data.results).filter((result: any) => !result.error).length;
      const failedSources = sources.length - successfulSources;
      const validationRate = data.quality_metrics?.validation_rate || '0';
      
      // Generate feature highlights
      const readmeEmails = data.enhancement_stats?.readme_emails_found || 0;
      const apolloEmails = data.enhancement_stats?.apollo_enriched_candidates || 0;
      const expertiseCandidates = data.enhancement_stats?.expertise_level_candidates || 0;
      const crossPlatformMatches = data.enhancement_stats?.cross_platform_correlations || 0;
      const googleDiscoveries = data.enhancement_stats?.enhanced_google_discoveries || 0;
      
      const featureHighlights = [];
      if (readmeEmails > 0) featureHighlights.push(`${readmeEmails} README emails`);
      if (apolloEmails > 0) featureHighlights.push(`${apolloEmails} Apollo enriched`);
      if (googleDiscoveries > 0) featureHighlights.push(`${googleDiscoveries} Google discoveries`);
      if (expertiseCandidates > 0) featureHighlights.push(`${expertiseCandidates} expert-level`);
      if (crossPlatformMatches > 0) featureHighlights.push(`${crossPlatformMatches} cross-platform`);
      
      // Check for errors
      const errorSources = data.errors || [];
      const errorMessage = errorSources.length > 0 
        ? ` (${errorSources.length} sources had issues)`
        : failedSources > 0 
        ? ` (${failedSources} sources failed)`
        : '';
      
      toast({
        title: "✅ Collection Completed",
        description: `Found ${data.total_validated} quality candidates (${validationRate}% success rate)${featureHighlights.length > 0 ? `. Features: ${featureHighlights.join(', ')}` : ''}${errorMessage}`,
        variant: data.total_validated > 0 ? "default" : "destructive",
      });

      return data;

    } catch (error: any) {
      console.error('Data collection error:', error);
      setProgress('');
      
      let errorMessage = "Failed to collect candidates";
      let debugInfo = "";
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch failed')) {
        errorMessage = "Network issue: Unable to connect to the data collection service";
        debugInfo = "Check your connection or try again later";
      } else if (error.message?.includes('timeout')) {
        errorMessage = "Collection timeout: Operation took too long";
        debugInfo = "Try fewer sources or a more specific query";
      } else if (error.message?.includes('API')) {
        errorMessage = "External API issue";
        debugInfo = "Some services may be experiencing problems";
      }
      
      console.error('Error information:', {
        originalError: error,
        message: errorMessage,
        debugInfo
      });
      
      toast({
        title: "Collection Failed",
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
