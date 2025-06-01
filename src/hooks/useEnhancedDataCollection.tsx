
import { useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useCollectionProgress } from './useCollectionProgress';
import { useCollectionResults } from './useCollectionResults';
import { DataCollectionService, DataCollectionResponse } from '@/services/dataCollectionService';
import { NotificationService } from '@/services/notificationService';

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

    // Validate inputs
    if (!query || query.trim().length === 0) {
      toast({
        title: "Invalid query",
        description: "Please enter a valid search query",
        variant: "destructive",
      });
      return;
    }

    setIsCollecting(true);
    clearResult();
    
    const stopProgress = startProgress();

    try {
      console.log('🚀 Starting enhanced collection with:', {
        query: query.trim(),
        location: location || 'Not specified',
        sources: sources.slice(0, 4),
        user: user.id
      });

      // Synchronized timeout: frontend matches backend (80s + 10s buffer)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Collection timed out after 90 seconds. The service may be under high demand - please try again in a few minutes.')), 90000);
      });
      
      const collectionPromise = DataCollectionService.collectCandidates({
        query: query.trim(),
        location: location && location !== 'undefined' && location.trim() !== '' ? location.trim() : undefined,
        sources: sources.slice(0, 4), // Enforce max 4 sources
        timeBudget: 80 // Synchronized with backend
      });
      
      const data = await Promise.race([collectionPromise, timeoutPromise]);
      
      // Enhanced data validation
      if (!data) {
        throw new Error("No data returned - the collection service may be temporarily unavailable");
      }

      if (typeof data.total_candidates !== 'number') {
        console.warn('⚠️ Invalid data structure received');
        data.total_candidates = 0;
      }

      // Handle different result scenarios
      if (data.total_candidates === 0) {
        const allSourcesFailed = data.errors && data.errors.length === sources.length;
        
        if (allSourcesFailed) {
          const errorSummary = data.errors.slice(0, 2).map(e => e.source).join(', ');
          throw new Error(`Collection failed for all sources (${errorSummary}). Please try again with different search terms.`);
        } else {
          toast({
            title: "No candidates found",
            description: "Try adjusting your search query or location, or include more data sources.",
            variant: "destructive",
          });
          updateResult(data);
          return data;
        }
      }

      updateResult(data);
      
      const notification = NotificationService.generateSuccessNotification(data);
      toast(notification);

      console.log('✅ Enhanced collection completed:', {
        candidates: data.total_candidates,
        sources: Object.keys(data.results || {}),
        processing_time: data.performance_metrics?.total_time_ms,
        errors: data.errors?.length || 0
      });

      return data;

    } catch (error: any) {
      console.error('Enhanced data collection error:', error);
      
      let errorMessage = error.message || "Data collection failed unexpectedly";
      
      // Enhanced error categorization
      if (error.message?.includes('90 seconds') || error.message?.includes('timeout')) {
        errorMessage = "Collection timed out. The service may be under high demand - please try again in a few minutes.";
      } else if (error.message?.includes('Authentication') || error.message?.includes('auth')) {
        errorMessage = "Authentication expired. Please sign in again.";
      } else if (error.message?.includes('No data returned')) {
        errorMessage = "The collection service is temporarily unavailable. Please try again shortly.";
      } else if (error.message?.includes('all sources')) {
        errorMessage = error.message; // Keep detailed message for source failures
      } else if (error.message?.includes('API key') || error.message?.includes('configuration')) {
        errorMessage = "Service configuration issue. Please contact support if this persists.";
      } else if (error.message?.includes('rate limit')) {
        errorMessage = "Service temporarily rate limited. Please try again in a few minutes.";
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
