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
    github_readme_crawling: boolean;
    stackoverflow_expertise_focus: boolean;
    linkedin_cross_platform: boolean;
  };
  enhancement_stats: {
    platform_specific_bonuses_applied: number;
    cross_platform_correlations: number;
    readme_emails_found: number;
    expertise_level_candidates: number;
  };
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
    setProgress('Initializing Phase 2.5 enhanced multi-source collection...');

    try {
      setProgress('Building enhanced semantic understanding with language-specific strategies...');
      
      const { data, error } = await supabase.functions.invoke('enhanced-data-collection', {
        body: { query, location, sources }
      });

      if (error) {
        console.error('Phase 2.5 enhanced data collection error:', error);
        throw new Error(error.message || 'Enhanced multi-source collection failed');
      }

      setCollectionResult(data);
      setProgress('');
      
      const successfulSources = Object.values(data.results).filter((result: any) => !result.error).length;
      const failedSources = sources.length - successfulSources;
      const validationRate = data.quality_metrics?.validation_rate || '0';
      
      // Enhanced success message with new features
      const readmeEmails = data.enhancement_stats?.readme_emails_found || 0;
      const expertiseCandidates = data.enhancement_stats?.expertise_level_candidates || 0;
      const crossPlatformMatches = data.enhancement_stats?.cross_platform_correlations || 0;
      
      const featureHighlights = [];
      if (readmeEmails > 0) featureHighlights.push(`${readmeEmails} emails from GitHub READMEs`);
      if (expertiseCandidates > 0) featureHighlights.push(`${expertiseCandidates} expertise-validated candidates`);
      if (crossPlatformMatches > 0) featureHighlights.push(`${crossPlatformMatches} cross-platform discoveries`);
      
      toast({
        title: "Phase 2.5 Enhanced Collection Completed",
        description: `🎯 Found ${data.total_validated} quality candidates (${validationRate}% success rate)${data.quality_metrics?.github_readme_crawling ? ' with README email discovery' : ''}${data.quality_metrics?.stackoverflow_expertise_focus ? ' + expertise targeting' : ''}${data.quality_metrics?.linkedin_cross_platform ? ' + LinkedIn cross-platform matching' : ''}${featureHighlights.length > 0 ? `. Features: ${featureHighlights.join(', ')}` : ''}${failedSources > 0 ? ` (${failedSources} sources failed)` : ''}`,
        variant: "default",
      });

      return data;

    } catch (error: any) {
      console.error('Phase 2.5 enhanced data collection error:', error);
      setProgress('');
      
      let errorMessage = "Failed to collect candidates with Phase 2.5 enhancements";
      if (error.message?.includes('timeout')) {
        errorMessage = "Request timed out. The enhanced validation with README crawling and cross-platform discovery takes time. Please try again.";
      } else if (error.message?.includes('API')) {
        errorMessage = "AI service temporarily unavailable. Please try again later.";
      }
      
      toast({
        title: "Phase 2.5 Collection Failed",
        description: errorMessage,
        variant: "destructive",
      });
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
