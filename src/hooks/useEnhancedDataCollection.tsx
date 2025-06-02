
import { useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { DataCollectionService, DataCollectionResponse } from '@/services/dataCollectionService';

export type EnhancedDataCollectionResult = DataCollectionResponse;

interface CollectionProgress {
  message: string;
  phase: string;
  percentage: number;
}

export const useEnhancedDataCollection = () => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [result, setResult] = useState<DataCollectionResponse | null>(null);
  const [progress, setProgress] = useState<CollectionProgress>({ message: '', phase: '', percentage: 0 });
  const { user } = useAuth();
  const { toast } = useToast();

  const validateInputs = (query: string, sources: string[]) => {
    if (!query || query.trim().length === 0) {
      throw new Error('Please enter a valid search query');
    }
    
    if (query.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }
    
    if (query.trim().length > 200) {
      throw new Error('Search query is too long (max 200 characters)');
    }
    
    if (sources.length === 0) {
      throw new Error('Please select at least one data source');
    }

    if (sources.length > 4) {
      throw new Error('Maximum 4 sources allowed for optimal performance');
    }
  };

  const startProgress = () => {
    let step = 0;
    const steps = [
      { message: 'Initializing collection...', phase: 'Initialization', percentage: 10 },
      { message: 'Connecting to data sources...', phase: 'Connection', percentage: 25 },
      { message: 'Processing candidate data...', phase: 'Processing', percentage: 50 },
      { message: 'Validating and saving results...', phase: 'Validation', percentage: 75 },
      { message: 'Finalizing collection...', phase: 'Finalization', percentage: 90 }
    ];

    const progressInterval = setInterval(() => {
      if (step < steps.length) {
        setProgress(steps[step]);
        step++;
      }
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      setProgress({ message: '', phase: '', percentage: 0 });
    };
  };

  const collectData = async (
    query: string, 
    location?: string, 
    sources: string[] = ['github', 'linkedin', 'google']
  ): Promise<DataCollectionResponse | null> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to collect candidate data",
        variant: "destructive",
      });
      return null;
    }

    try {
      // Validate inputs
      validateInputs(query, sources);
      
      setIsCollecting(true);
      setResult(null);
      
      const stopProgress = startProgress();

      console.log('🚀 Starting enhanced collection:', {
        query: query.trim(),
        location: location || 'Not specified',
        sources: sources.slice(0, 4),
        user: user.id
      });

      // Call the enhanced data collection service
      const data = await DataCollectionService.collectCandidates({
        query: query.trim(),
        location: location?.trim(),
        sources: sources.slice(0, 4),
        timeBudget: 70 // 70 second timeout
      });
      
      stopProgress();
      
      // Validate response
      if (!data) {
        throw new Error("No data returned from collection service");
      }

      setResult(data);
      
      // Generate success notification
      const successCount = data.total_candidates;
      const sourceCount = data.enhancement_stats.sources_successful;
      const totalSources = sources.length;
      
      let description = '';
      if (successCount === 0) {
        description = "No candidates found. Try adjusting your search query or selecting different sources.";
      } else if (successCount < 5) {
        description = `Found ${successCount} candidates from ${sourceCount}/${totalSources} sources. Consider broadening your search.`;
      } else {
        description = `Successfully collected ${successCount} candidates from ${sourceCount}/${totalSources} sources.`;
      }

      toast({
        title: successCount > 0 ? "Collection completed" : "Collection completed with no results",
        description,
        variant: successCount > 0 ? "default" : "destructive",
      });

      console.log('✅ Enhanced collection completed:', {
        candidates: data.total_candidates,
        sources_successful: data.enhancement_stats.sources_successful,
        processing_time: data.performance_metrics.total_time_ms,
        errors: data.errors?.length || 0
      });

      return data;

    } catch (error: any) {
      console.error('Enhanced data collection error:', error);
      
      // Enhanced error handling with user-friendly messages
      let errorMessage = 'Data collection failed unexpectedly';
      
      if (error.message?.includes('Authentication') || error.message?.includes('sign in')) {
        errorMessage = 'Please sign in again to collect data';
      } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        errorMessage = 'Collection is taking longer than expected. Try using fewer sources or a simpler query.';
      } else if (error.message?.includes('network') || error.message?.includes('connection')) {
        errorMessage = 'Network connection issue. Please check your internet connection.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'API rate limits exceeded. Please wait a few minutes before trying again.';
      } else if (error.message?.includes('query') || error.message?.includes('source')) {
        errorMessage = error.message;
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: "Data collection failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsCollecting(false);
      setProgress({ message: '', phase: '', percentage: 0 });
    }
  };

  return {
    collectData,
    isCollecting,
    collectionResult: result,
    progress: progress.message
  };
};
