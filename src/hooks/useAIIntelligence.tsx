
import { useState } from 'react';
import { AIIntelligenceService, AIIntelligenceConfig, AIProcessedCandidate } from '../services/ai/AIIntelligenceService';
import { EnhancedQuery } from '../services/ai/AIQueryProcessor';

interface UseAIIntelligenceProps {
  openaiApiKey?: string;
  enableQueryEnhancement?: boolean;
  enableCandidateScoring?: boolean;
  enableProfileEnhancement?: boolean;
  enableOutreachGeneration?: boolean;
}

export const useAIIntelligence = (props: UseAIIntelligenceProps = {}) => {
  const [aiService, setAiService] = useState<AIIntelligenceService | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enhancedQuery, setEnhancedQuery] = useState<EnhancedQuery | null>(null);
  const [processedCandidates, setProcessedCandidates] = useState<AIProcessedCandidate[]>([]);
  const [aiStats, setAiStats] = useState<any>(null);

  const initializeAI = (openaiApiKey: string) => {
    const config: AIIntelligenceConfig = {
      openaiApiKey,
      enableQueryEnhancement: props.enableQueryEnhancement ?? true,
      enableCandidateScoring: props.enableCandidateScoring ?? true,
      enableProfileEnhancement: props.enableProfileEnhancement ?? true,
      enableOutreachGeneration: props.enableOutreachGeneration ?? false
    };

    const service = new AIIntelligenceService(config);
    setAiService(service);
    return service;
  };

  const enhanceSearchQuery = async (query: string, openaiApiKey?: string): Promise<EnhancedQuery | null> => {
    const service = aiService || (openaiApiKey ? initializeAI(openaiApiKey) : null);
    
    if (!service) {
      console.warn('AI Intelligence Service not initialized - OpenAI API key required');
      return null;
    }

    try {
      setIsProcessing(true);
      const enhanced = await service.enhanceSearchQuery(query);
      setEnhancedQuery(enhanced);
      return enhanced;
    } catch (error) {
      console.error('Failed to enhance query:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processCandidatesWithAI = async (
    candidates: any[], 
    searchQuery: any, 
    jobContext?: any,
    openaiApiKey?: string
  ): Promise<AIProcessedCandidate[]> => {
    const service = aiService || (openaiApiKey ? initializeAI(openaiApiKey) : null);
    
    if (!service) {
      console.warn('AI Intelligence Service not initialized - returning original candidates');
      return candidates.map(candidate => ({
        originalCandidate: candidate,
        processingMetadata: {
          queryEnhanced: false,
          scored: false,
          profileEnhanced: false,
          outreachGenerated: false,
          processingTime: 0,
          confidence: 0
        }
      }));
    }

    try {
      setIsProcessing(true);
      const results = await service.processCandidateBatch(candidates, searchQuery, jobContext);
      setProcessedCandidates(results);
      
      // Generate stats
      const stats = service.getProcessingStats(results);
      setAiStats(stats);
      
      return results;
    } catch (error) {
      console.error('Failed to process candidates with AI:', error);
      return candidates.map(candidate => ({
        originalCandidate: candidate,
        processingMetadata: {
          queryEnhanced: false,
          scored: false,
          profileEnhanced: false,
          outreachGenerated: false,
          processingTime: 0,
          confidence: 0
        }
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const generateOutreach = async (
    candidate: any, 
    jobContext: any,
    openaiApiKey?: string
  ): Promise<string | null> => {
    const service = aiService || (openaiApiKey ? initializeAI(openaiApiKey) : null);
    
    if (!service) {
      console.warn('AI Intelligence Service not initialized');
      return null;
    }

    try {
      setIsProcessing(true);
      const processed = await service.processCandidate(candidate, {}, jobContext);
      return processed.personalizedOutreach || null;
    } catch (error) {
      console.error('Failed to generate outreach:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAIData = () => {
    setEnhancedQuery(null);
    setProcessedCandidates([]);
    setAiStats(null);
  };

  return {
    // State
    isProcessing,
    enhancedQuery,
    processedCandidates,
    aiStats,
    aiService,

    // Actions
    initializeAI,
    enhanceSearchQuery,
    processCandidatesWithAI,
    generateOutreach,
    clearAIData
  };
};
