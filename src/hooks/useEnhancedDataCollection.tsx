
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
      // Increase timeout to 75 seconds to match backend improvements
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Collection timeout - please try with fewer sources or a simpler query')), 75000);
      });
      
      const collectionPromise = DataCollectionService.collectCandidates({
        query,
        location,
        sources,
        timeBudget: 70 // Increased time budget
      });
      
      const data = await Promise.race([collectionPromise, timeoutPromise]);
      
      // Check if we got valid data
      if (!data) {
        throw new Error("No data returned - all sources may have failed");
      }

      // Accept partial results if we have some candidates
      if (data.total_candidates === 0 && data.errors && data.errors.length > 0) {
        const errorMessages = data.errors.map(e => `${e.source}: ${e.error}`).join(', ');
        throw new Error(`All sources failed: ${errorMessages}`);
      }

      updateResult(data);
      
      const notification = NotificationService.generateSuccessNotification(data);
      toast(notification);

      return data;

    } catch (error: any) {
      console.error('Enhanced data collection error:', error);
      
      let errorMessage = error.message || "Data collection failed";
      
      // Provide more specific error messages
      if (error.message?.includes('timeout')) {
        errorMessage = "Collection timed out. Try using fewer sources or a simpler search query.";
      } else if (error.message?.includes('Authentication')) {
        errorMessage = "Authentication failed. Please sign in again.";
      } else if (error.message?.includes('No data returned')) {
        errorMessage = "No candidates found. Try adjusting your search criteria.";
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
