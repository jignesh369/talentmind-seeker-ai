
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

    try {
      const { data, error } = await supabase.functions.invoke('enhanced-data-collection', {
        body: { query, location, sources }
      });

      if (error) throw error;

      setCollectionResult(data);
      
      toast({
        title: "Enhanced data collection completed",
        description: `Found and validated ${data.total_validated} high-quality candidates`,
      });

      return data;

    } catch (error: any) {
      console.error('Enhanced data collection error:', error);
      toast({
        title: "Data collection failed",
        description: error.message || "Failed to collect and validate candidate data",
        variant: "destructive",
      });
    } finally {
      setIsCollecting(false);
    }
  };

  return {
    collectData,
    isCollecting,
    collectionResult
  };
};
