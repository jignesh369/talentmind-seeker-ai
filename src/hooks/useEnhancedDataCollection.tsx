
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
      // Set up timeout race
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Collection timeout')), 65000);
      });
      
      const collectionPromise = DataCollectionService.collectCandidates({
        query,
        location,
        sources,
        timeBudget: 60
      });
      
      const data = await Promise.race([collectionPromise, timeoutPromise]);
      
      updateResult(data);
      
      const notification = NotificationService.generateSuccessNotification(data);
      toast(notification);

      return data;

    } catch (error: any) {
      console.error('Enhanced data collection error:', error);
      
      const notification = NotificationService.generateErrorNotification(error);
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
