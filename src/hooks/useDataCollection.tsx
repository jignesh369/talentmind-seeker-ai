
import { useState } from 'react';
import { useEnhancedDataCollection, EnhancedDataCollectionResult } from './useEnhancedDataCollection';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export type DataCollectionResult = EnhancedDataCollectionResult;

// Simplified wrapper hook for backward compatibility
export const useDataCollection = () => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionResult, setCollectionResult] = useState<DataCollectionResult | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { collectData: enhancedCollectData, progress } = useEnhancedDataCollection();

  const collectData = async (
    query: string, 
    location?: string, 
    sources: string[] = ['github', 'stackoverflow', 'google', 'linkedin']
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

    try {
      const data = await enhancedCollectData(query, location, sources);
      
      if (!data) {
        throw new Error("No data returned from collection");
      }

      setCollectionResult(data);
      return data;
    } catch (error: any) {
      console.error('Data collection error:', error);
      toast({
        title: "Data collection failed", 
        description: error.message || "Failed to collect candidate data",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCollecting(false);
    }
  };

  return {
    collectData,
    isCollecting,
    collectionResult,
    progress
  };
};
