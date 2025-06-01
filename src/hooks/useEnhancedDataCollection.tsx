
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
    processing_time: string;
    time_efficiency: string;
    parallel_processing: boolean;
    smart_limiting: boolean;
    early_returns: boolean;
  };
  performance_metrics: {
    total_time_ms: number;
    average_time_per_source: number;
    timeout_rate: number;
    success_rate: number;
  };
  enhancement_stats: {
    total_processed: number;
    unique_candidates: number;
    processing_time_ms: number;
    time_budget_used: number;
    sources_successful: number;
    parallel_processing: boolean;
    ai_enhancements: number;
    apollo_enriched: number;
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
    sources: string[] = ['github', 'stackoverflow', 'linkedin', 'google']
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
    setProgress('⚡ Initializing time-budget architecture...');
    
    const updateProgress = (message: string) => {
      setProgress(message);
    };

    try {
      // Fast progress phases with time-budget awareness
      let phaseCount = 0;
      const phases = [
        '📊 Analyzing market intelligence (5s budget)...',
        '🎯 Processing enhanced query (3s budget)...',
        '🌐 Parallel source collection (60s budget)...',
        '🔄 Fast deduplication and ranking (5s budget)...',
        '✨ Selective AI enhancement (remaining time)...',
      ];
      
      const progressInterval = setInterval(() => {
        if (phaseCount < phases.length - 1) {
          phaseCount++;
          updateProgress(phases[phaseCount]);
        }
      }, 12000); // Slower updates for more accurate representation
      
      console.log('🚀 Starting time-budget enhanced collection with:', { query, location, sources });
      
      // Reduced timeout to 75 seconds (from 120)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Time budget exceeded')), 75000);
      });
      
      const collectionPromise = supabase.functions.invoke('enhanced-data-collection', {
        body: { 
          query, 
          location, 
          sources,
          enhanced_mode: true,
          time_budget: 90 // 90 second budget
        }
      });
      
      let response;
      try {
        response = await Promise.race([collectionPromise, timeoutPromise]);
      } catch (error) {
        clearInterval(progressInterval);
        if (error instanceof Error && error.message === 'Time budget exceeded') {
          throw new Error('Collection exceeded time budget: Search took too long');
        }
        throw error;
      }
      
      clearInterval(progressInterval);

      console.log('🎉 Time-budget collection response:', response);

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
      
      // Enhanced success metrics with time efficiency
      const successfulSources = Object.values(data.results).filter((result: any) => !result.error).length;
      const processingTime = data.performance_metrics?.total_time_ms || 0;
      const timeEfficiency = data.quality_metrics?.time_efficiency || 'N/A';
      const timeBudgetUsed = data.enhancement_stats?.time_budget_used || 0;
      
      // Generate performance highlights
      const performanceHighlights = [];
      if (processingTime < 30000) performanceHighlights.push('⚡ Ultra-fast');
      if (processingTime < 60000) performanceHighlights.push('🚀 Fast');
      if (data.quality_metrics?.parallel_processing) performanceHighlights.push('🔀 Parallel');
      if (data.quality_metrics?.smart_limiting) performanceHighlights.push('🎯 Smart limits');
      if (data.quality_metrics?.early_returns) performanceHighlights.push('⏰ Early return');
      
      const timeMessage = `${Math.round(processingTime / 1000)}s (${timeBudgetUsed}% budget)`;
      const efficiencyMessage = timeEfficiency !== 'N/A' ? `${timeEfficiency} efficiency` : '';
      
      const successMessage = `Found ${data.total_validated} candidates in ${timeMessage}`;
      const performanceMessage = performanceHighlights.length > 0 ? ` • ${performanceHighlights.join(' ')}` : '';
      const efficiencyDisplayMessage = efficiencyMessage ? ` • ${efficiencyMessage}` : '';
      
      toast({
        title: "⚡ Fast Collection Completed",
        description: `${successMessage}${performanceMessage}${efficiencyDisplayMessage}`,
        variant: data.total_validated > 0 ? "default" : "destructive",
      });

      return data;

    } catch (error: any) {
      console.error('Enhanced data collection error:', error);
      setProgress('');
      
      let errorMessage = "Failed to collect candidates with time-budget optimization";
      let debugInfo = "";
      
      if (error.message?.includes('Time budget exceeded')) {
        errorMessage = "Collection exceeded time budget";
        debugInfo = "Try fewer sources or a more specific query";
      } else if (error.message?.includes('timeout')) {
        errorMessage = "Time budget optimization timeout";
        debugInfo = "Some sources took longer than expected";
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = "Network issue during optimized collection";
        debugInfo = "Check connection and try again";
      }
      
      console.error('Time-budget collection error:', {
        originalError: error,
        message: errorMessage,
        debugInfo
      });
      
      toast({
        title: "Fast Collection Failed",
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
