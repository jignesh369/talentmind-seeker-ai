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
      console.log('🚀 Starting enhanced collection with Phase 4.1 deduplication:', {
        query: query.trim(),
        location: location || 'Not specified',
        sources: sources.slice(0, 4),
        user: user.id
      });

      // Extended timeout: backend has 80s + 20s buffer = 100s, frontend waits 120s
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Collection timed out after 120 seconds. Please try with fewer sources or a simpler query.')), 120000);
      });
      
      // Add keepalive mechanism to prevent connection drops
      const keepAliveInterval = setInterval(() => {
        console.log('⏱️ Collection still in progress...');
      }, 15000);
      
      const collectionPromise = DataCollectionService.collectCandidates({
        query: query.trim(),
        location: location && location !== 'undefined' && location.trim() !== '' ? location.trim() : undefined,
        sources: sources.slice(0, 4), // Enforce max 4 sources
        timeBudget: 85 // Increased backend budget slightly
      }).finally(() => {
        clearInterval(keepAliveInterval);
      });
      
      const data = await Promise.race([collectionPromise, timeoutPromise]);
      
      // Enhanced data validation with better error messages
      if (!data) {
        throw new Error("No data returned from collection service. The service may be temporarily unavailable.");
      }

      if (typeof data.total_candidates !== 'number') {
        console.warn('⚠️ Invalid data structure received, attempting to fix...');
        // Calculate total candidates from results object
        const totalCandidates = Object.values(data.results || {}).reduce((sum, result: any) => {
          return sum + (result.candidates?.length || 0);
        }, 0);
        data.total_candidates = totalCandidates;
      }

      // Enhanced success detection with deduplication metrics
      const hasGoodResults = data.total_candidates >= 5;
      const deduplicationStats = data.enhancement_stats?.deduplication_metrics;
      
      if (deduplicationStats) {
        console.log('🔄 Deduplication results:', {
          original: deduplicationStats.original_count,
          deduplicated: deduplicationStats.deduplicated_count,
          duplicates_removed: deduplicationStats.duplicates_removed,
          merge_decisions: deduplicationStats.merge_decisions,
          deduplication_rate: `${deduplicationStats.deduplication_rate}%`
        });
      }

      // Early success detection - if we get good results quickly, that's success
      const processingTime = data.performance_metrics?.total_time_ms;
      
      if (hasGoodResults && processingTime && processingTime < 60000) {
        console.log('🎉 Fast collection completed successfully!');
      }

      // Handle different result scenarios with more nuanced messaging
      if (data.total_candidates === 0) {
        const allSourcesFailed = data.errors && data.errors.length === sources.length;
        
        if (allSourcesFailed) {
          const errorSummary = data.errors.slice(0, 2).map(e => e.source).join(', ');
          throw new Error(`Collection failed for all sources (${errorSummary}). This may be due to API rate limits. Please try again in a few minutes.`);
        } else {
          toast({
            title: "No candidates found",
            description: "Try adjusting your search query, adding more specific skills, or selecting different data sources.",
            variant: "destructive",
          });
          updateResult(data);
          return data;
        }
      }

      updateResult(data);
      
      // Enhanced notification with deduplication info
      const notification = NotificationService.generateSuccessNotification(data);
      if (deduplicationStats && deduplicationStats.duplicates_removed > 0) {
        notification.description += ` (${deduplicationStats.duplicates_removed} duplicates merged)`;
      }
      toast(notification);

      console.log('✅ Enhanced collection with deduplication completed:', {
        candidates: data.total_candidates,
        sources: Object.keys(data.results || {}),
        processing_time: data.performance_metrics?.total_time_ms,
        errors: data.errors?.length || 0,
        duplicates_removed: deduplicationStats?.duplicates_removed || 0,
        deduplication_rate: deduplicationStats?.deduplication_rate || 0
      });

      return data;

    } catch (error: any) {
      console.error('Enhanced data collection error:', error);
      
      let errorMessage = error.message || "Data collection failed unexpectedly";
      
      // Enhanced error categorization with more specific guidance
      if (error.message?.includes('120 seconds') || error.message?.includes('timeout')) {
        errorMessage = "Collection is taking longer than expected. This usually means the AI processing is under heavy load. Try using fewer sources or a simpler query.";
      } else if (error.message?.includes('Authentication') || error.message?.includes('auth')) {
        errorMessage = "Authentication expired. Please sign in again.";
      } else if (error.message?.includes('No data returned')) {
        errorMessage = "The collection service is temporarily overloaded. Please try again in a few minutes.";
      } else if (error.message?.includes('all sources')) {
        errorMessage = error.message; // Keep detailed message for source failures
      } else if (error.message?.includes('API key') || error.message?.includes('configuration')) {
        errorMessage = "Service configuration issue detected. The AI processing may be temporarily unavailable.";
      } else if (error.message?.includes('rate limit')) {
        errorMessage = "API rate limits exceeded. Please wait a few minutes before trying again.";
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = "Network connectivity issue. Please check your connection and try again.";
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
