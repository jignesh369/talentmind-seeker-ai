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
    setProgress('⚡ Initializing optimized collection...');
    
    const updateProgress = (message: string) => {
      setProgress(message);
    };

    try {
      // Optimized progress phases
      let phaseCount = 0;
      const phases = [
        '🎯 Processing query (fast mode)...',
        '🌐 Parallel source collection (60s budget)...',
        '🔄 Fast deduplication...',
        '✨ Finalizing results...',
      ];
      
      const progressInterval = setInterval(() => {
        if (phaseCount < phases.length - 1) {
          phaseCount++;
          updateProgress(phases[phaseCount]);
        }
      }, 8000); // Faster updates
      
      console.log('🚀 Starting optimized collection with:', { query, location, sources });
      
      // Reduced timeout to 65 seconds
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Collection timeout')), 65000);
      });
      
      const collectionPromise = supabase.functions.invoke('enhanced-data-collection', {
        body: { 
          query, 
          location, 
          sources: sources.slice(0, 4), // Limit to 4 sources max
          time_budget: 60 // 60 second budget
        }
      });
      
      let response;
      try {
        response = await Promise.race([collectionPromise, timeoutPromise]);
      } catch (error) {
        clearInterval(progressInterval);
        if (error instanceof Error && error.message === 'Collection timeout') {
          throw new Error('Collection timeout: Search exceeded time limit');
        }
        throw error;
      }
      
      clearInterval(progressInterval);

      console.log('🎉 Collection response:', response);

      if (response.error) {
        console.error('Collection error:', response.error);
        throw new Error(response.error.message || 'Data collection failed');
      }

      if (!response.data) {
        throw new Error('No data returned from collection');
      }

      const data = response.data;
      setCollectionResult(data);
      setProgress('');
      
      // Enhanced success metrics
      const successfulSources = Object.values(data.results).filter((result: any) => !result.error).length;
      const processingTime = data.performance_metrics?.total_time_ms || 0;
      const timeEfficiency = data.quality_metrics?.time_efficiency || 'N/A';
      const successRate = data.performance_metrics?.success_rate || 0;
      
      // Generate performance highlights
      const performanceHighlights = [];
      if (processingTime < 20000) performanceHighlights.push('⚡ Ultra-fast');
      else if (processingTime < 40000) performanceHighlights.push('🚀 Fast');
      if (data.quality_metrics?.parallel_processing) performanceHighlights.push('🔀 Parallel');
      if (successRate >= 75) performanceHighlights.push('✅ High success');
      
      const timeMessage = `${Math.round(processingTime / 1000)}s`;
      const sourcesMessage = `${successfulSources}/${Object.keys(data.results).length} sources`;
      
      const successMessage = `Found ${data.total_validated} candidates in ${timeMessage}`;
      const performanceMessage = performanceHighlights.length > 0 ? ` • ${performanceHighlights.join(' ')}` : '';
      const sourcesDisplayMessage = ` • ${sourcesMessage}`;
      
      toast({
        title: "⚡ Optimized Collection Completed",
        description: `${successMessage}${performanceMessage}${sourcesDisplayMessage}`,
        variant: data.total_validated > 0 ? "default" : "destructive",
      });

      return data;

    } catch (error: any) {
      console.error('Enhanced data collection error:', error);
      setProgress('');
      
      let errorMessage = "Failed to collect candidates";
      let debugInfo = "";
      
      if (error.message?.includes('Collection timeout')) {
        errorMessage = "Collection timeout";
        debugInfo = "Try fewer sources or a more specific query";
      } else if (error.message?.includes('timeout')) {
        errorMessage = "Request timeout";
        debugInfo = "Some sources took longer than expected";
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = "Network issue";
        debugInfo = "Check connection and try again";
      }
      
      console.error('Collection error:', {
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
