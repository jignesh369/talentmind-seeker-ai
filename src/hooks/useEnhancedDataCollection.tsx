
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
    setProgress('Initializing Phase 4 intelligent data collection...');

    try {
      setProgress('Building semantic understanding and embeddings...');
      
      const { data, error } = await supabase.functions.invoke('enhanced-data-collection', {
        body: { query, location, sources }
      });

      if (error) {
        console.error('Phase 4 data collection error:', error);
        throw new Error(error.message || 'Intelligent data collection failed');
      }

      setCollectionResult(data);
      setProgress('');
      
      const successfulSources = Object.values(data.results).filter((result: any) => !result.error).length;
      const failedSources = sources.length - successfulSources;
      const validationRate = data.quality_metrics?.validation_rate || '0';
      
      // Enhanced success message with tier information
      const tierInfo = data.quality_metrics?.tier_system ? ' with Bronze/Silver/Gold tiers' : '';
      const semanticInfo = data.quality_metrics?.semantic_search ? ' + semantic matching' : '';
      
      toast({
        title: "Phase 4 Intelligent Collection Completed",
        description: `🎯 Found ${data.total_validated} quality candidates (${validationRate}% success rate)${tierInfo}${semanticInfo}${data.quality_metrics?.perplexity_enriched ? ' with real-time enrichment' : ''}${failedSources > 0 ? ` (${failedSources} sources failed)` : ''}`,
        variant: "default",
      });

      return data;

    } catch (error: any) {
      console.error('Phase 4 data collection error:', error);
      setProgress('');
      
      let errorMessage = "Failed to collect and validate candidates with Phase 4 intelligence";
      if (error.message?.includes('timeout')) {
        errorMessage = "Request timed out. The intelligent validation is thorough but takes time. Please try again with a more specific query.";
      } else if (error.message?.includes('API')) {
        errorMessage = "AI service temporarily unavailable. Please try again later.";
      }
      
      toast({
        title: "Phase 4 Collection Failed",
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
