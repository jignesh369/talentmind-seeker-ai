
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface EnhancedDataCollectionResult {
  results: {
    github: { candidates: any[], total: number, validated: number, error: string | null };
    stackoverflow: { candidates: any[], total: number, validated: number, error: string | null };
    google: { candidates: any[], total: number, validated: number, error: string | null };
  };
  total_candidates: number;
  total_validated: number;
  query: string;
  location?: string;
  timestamp: string;
}

export const useEnhancedDataCollection = () => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionResult, setCollectionResult] = useState<EnhancedDataCollectionResult | null>(null);
  const [progress, setProgress] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();

  const collectData = async (query: string, location?: string, sources: string[] = ['github', 'stackoverflow', 'google']) => {
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
    setProgress('Initializing enhanced data collection...');

    try {
      setProgress('Processing query with AI...');
      
      const { data, error } = await supabase.functions.invoke('enhanced-data-collection', {
        body: { query, location, sources }
      });

      if (error) {
        console.error('Enhanced data collection error:', error);
        throw new Error(error.message || 'Data collection failed');
      }

      setCollectionResult(data);
      setProgress('');
      
      const successfulSources = Object.values(data.results).filter((result: any) => !result.error).length;
      const failedSources = sources.length - successfulSources;
      
      toast({
        title: "Enhanced data collection completed",
        description: `Found and validated ${data.total_validated} high-quality candidates from ${successfulSources} sources${failedSources > 0 ? ` (${failedSources} sources failed)` : ''}`,
        variant: failedSources > 0 ? "default" : "default",
      });

      return data;

    } catch (error: any) {
      console.error('Enhanced data collection error:', error);
      setProgress('');
      
      let errorMessage = "Failed to collect and validate candidate data";
      if (error.message?.includes('timeout')) {
        errorMessage = "Request timed out. Please try again with a more specific query.";
      } else if (error.message?.includes('API')) {
        errorMessage = "API service unavailable. Please try again later.";
      }
      
      toast({
        title: "Data collection failed",
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
