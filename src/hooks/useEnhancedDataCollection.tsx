
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
  performance_optimizations?: {
    reduced_candidate_processing: boolean;
    faster_timeouts: boolean;
    simplified_validation: boolean;
    apollo_timeout_protection: boolean;
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
    sources: string[] = ['github', 'stackoverflow', 'google'] // Reduced default sources for better performance
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
    setProgress('🚀 Starting optimized Phase 2.5 enhanced collection...');

    try {
      setProgress('⚡ Using faster, more reliable collection process...');
      
      console.log('Starting optimized enhanced data collection with:', { query, location, sources });
      
      const { data, error } = await supabase.functions.invoke('enhanced-data-collection', {
        body: { query, location, sources }
      });

      console.log('Optimized enhanced data collection response:', { data, error });

      if (error) {
        console.error('Optimized enhanced data collection error:', error);
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
      
      // Check for performance optimizations
      const isOptimized = data.performance_optimizations?.reduced_candidate_processing;
      const optimizationNote = isOptimized ? ' (optimized for speed & reliability)' : '';
      
      // Enhanced success message with optimization info
      const readmeEmails = data.enhancement_stats?.readme_emails_found || 0;
      const apolloEmails = data.enhancement_stats?.apollo_enriched_candidates || 0;
      const expertiseCandidates = data.enhancement_stats?.expertise_level_candidates || 0;
      
      const featureHighlights = [];
      if (readmeEmails > 0) featureHighlights.push(`${readmeEmails} GitHub README emails`);
      if (apolloEmails > 0) featureHighlights.push(`${apolloEmails} Apollo.io enriched`);
      if (expertiseCandidates > 0) featureHighlights.push(`${expertiseCandidates} expertise-validated`);
      
      // Check for errors
      const errorSources = data.errors || [];
      const errorMessage = errorSources.length > 0 
        ? ` (${errorSources.length} sources had issues: ${errorSources.map(e => e.source).join(', ')})`
        : failedSources > 0 
        ? ` (${failedSources} sources failed)`
        : '';
      
      toast({
        title: `🚀 Enhanced Collection Completed${optimizationNote}`,
        description: `🎯 Found ${data.total_validated} quality candidates (${validationRate}% success rate)${data.quality_metrics?.apollo_enriched ? ' with Apollo.io enrichment' : ''}${featureHighlights.length > 0 ? `. Features: ${featureHighlights.join(', ')}` : ''}${errorMessage}`,
        variant: data.total_validated > 0 ? "default" : "destructive",
      });

      return data;

    } catch (error: any) {
      console.error('Optimized enhanced data collection error:', error);
      setProgress('');
      
      let errorMessage = "Enhanced collection failed";
      let debugInfo = "";
      
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = "Network error: Unable to connect to collection service. Please try again.";
        debugInfo = "The optimized collection service may be temporarily unavailable.";
      } else if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        errorMessage = "Collection timed out. The system has been optimized for faster processing.";
        debugInfo = "Try reducing the number of sources or use a more specific query.";
      } else if (error.message?.includes('API')) {
        errorMessage = "External service temporarily unavailable. Please try again later.";
        debugInfo = "Some third-party services may be experiencing issues.";
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
        title: "Collection Failed",
        description: errorMessage + (debugInfo ? ` ${debugInfo}` : ''),
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
