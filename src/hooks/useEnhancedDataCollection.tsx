import { useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useCollectionProgress } from './useCollectionProgress';
import { useCollectionResults } from './useCollectionResults';
import { DataCollectionService, DataCollectionResponse } from '@/services/dataCollectionService';
import { NotificationService } from '@/services/notificationService';

// Use the DataCollectionResponse as the main type
export type EnhancedDataCollectionResult = DataCollectionResponse;

export const useEnhancedDataCollection = () => {
  const [isCollecting, setIsCollecting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { progress, startProgress, resetProgress } = useCollectionProgress();
  const { result, updateResult, clearResult } = useCollectionResults();

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
    clearResult();
    
    const stopProgress = startProgress();

    try {
      console.log('🚀 Starting enhanced collection with:', {
        query,
        location: location || 'Not specified',
        sources,
        user: user.id
      });

      // Increase frontend timeout to 90 seconds to give backend more time
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Collection is taking longer than expected. This may indicate high demand - please try again in a few minutes.')), 90000);
      });
      
      // Clean location parameter - handle undefined/null cases
      const cleanLocation = location && location !== 'undefined' && location !== '' ? location : undefined;
      
      const collectionPromise = DataCollectionService.collectCandidates({
        query,
        location: cleanLocation,
        sources: sources.slice(0, 4), // Limit to max 4 sources
        timeBudget: 80 // Increased backend time budget
      });
      
      const data = await Promise.race([collectionPromise, timeoutPromise]);
      
      // Check if we got valid data
      if (!data) {
        throw new Error("No data returned - the collection service may be temporarily unavailable");
      }

      // Accept results even if some sources failed, as long as we have some candidates
      if (data.total_candidates === 0) {
        // Check if all sources failed vs just no candidates found
        const allSourcesFailed = data.errors && data.errors.length === sources.length;
        
        if (allSourcesFailed) {
          const errorSummary = data.errors.slice(0, 2).map(e => e.source).join(', ');
          throw new Error(`Collection failed for all sources (${errorSummary}). Please try again with different search terms.`);
        } else {
          // No candidates found but sources worked
          toast({
            title: "No candidates found",
            description: "Try adjusting your search query or location, or include more data sources.",
            variant: "destructive",
          });
          return data; // Return empty result but don't throw error
        }
      }

      updateResult(data);
      
      const notification = NotificationService.generateSuccessNotification(data);
      toast(notification);

      console.log('✅ Enhanced collection completed:', {
        candidates: data.total_candidates,
        sources: Object.keys(data.results),
        processing_time: data.performance_metrics?.total_time_ms
      });

      return data;

    } catch (error: any) {
      console.error('Enhanced data collection error:', error);
      
      let errorMessage = error.message || "Data collection failed unexpectedly";
      
      // Provide more specific error messages based on error type
      if (error.message?.includes('longer than expected')) {
        errorMessage = "Collection is taking longer than usual. The service may be under high demand - please try again in a few minutes.";
      } else if (error.message?.includes('Authentication')) {
        errorMessage = "Authentication expired. Please sign in again.";
      } else if (error.message?.includes('No data returned')) {
        errorMessage = "The collection service is temporarily unavailable. Please try again shortly.";
      } else if (error.message?.includes('all sources')) {
        // Keep the detailed message for all sources failing
        errorMessage = error.message;
      } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        errorMessage = "Collection timed out. Try using fewer sources or a simpler search query.";
      }
      
      const notification = NotificationService.generateErrorNotification({
        ...error,
        message: errorMessage
      });
      toast(notification);
      
      return null;
    } finally {
      stopProgress();
      setIsCollecting(false);
      resetProgress();
    }
  };

  return {
    collectData,
    isCollecting,
    collectionResult: result,
    progress: progress.message
  };
};
