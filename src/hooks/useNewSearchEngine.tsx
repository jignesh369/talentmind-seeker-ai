
import { useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useAIIntelligence } from './useAIIntelligence';
import { newDataCollectionService } from '@/services/NewDataCollectionService';

interface SearchFilters {
  minScore: number;
  maxScore: number;
  location: string;
  lastActive: string;
  skills: string[];
}

export const useNewSearchEngine = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState<any>(null);
  const [searchError, setSearchError] = useState<any>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    minScore: 0,
    maxScore: 100,
    location: '',
    lastActive: '',
    skills: []
  });
  const { user } = useAuth();
  const { toast } = useToast();
  
  // AI Intelligence Integration
  const {
    isProcessing: aiProcessing,
    enhancedQuery,
    processedCandidates,
    aiStats,
    enhanceSearchQuery,
    processCandidatesWithAI,
    clearAIData
  } = useAIIntelligence({
    enableQueryEnhancement: true,
    enableCandidateScoring: true,
    enableProfileEnhancement: true,
    enableOutreachGeneration: false
  });

  const handleSearch = async (query: string): Promise<void> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search candidates",
        variant: "destructive",
      });
      return;
    }

    if (!query || query.trim().length < 2) {
      toast({
        title: "Invalid search",
        description: "Please enter a search query with at least 2 characters",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchQuery(query);
    
    try {
      console.log('🚀 Starting AI-enhanced search for:', query);
      
      // Phase 1: AI Query Enhancement
      const openaiKey = 'dummy-key-for-demo'; // In production, get from environment
      const aiEnhancedQuery = await enhanceSearchQuery(query, openaiKey);
      
      // Phase 2: Data Collection with Enhanced Query
      const searchRequest = {
        query: query.trim(),
        location: filters.location || undefined,
        limit: 20,
        enhancedQuery: aiEnhancedQuery
      };

      console.log('🔍 Executing enhanced data collection...');
      const response = await newDataCollectionService.searchCandidates(searchRequest);
      
      if (!response || !response.candidates) {
        throw new Error('Invalid response from search service');
      }

      console.log('📊 Raw search results:', response.candidates.length);

      // Phase 3: AI Processing of Candidates
      let finalCandidates = response.candidates;
      
      if (response.candidates.length > 0) {
        console.log('🤖 Processing candidates with AI intelligence...');
        
        const aiProcessedResults = await processCandidatesWithAI(
          response.candidates,
          aiEnhancedQuery || { query },
          undefined, // job context
          openaiKey
        );
        
        // Extract enhanced candidates with AI scores
        finalCandidates = aiProcessedResults.map(result => ({
          ...result.originalCandidate,
          // Add AI scoring to candidate
          ai_overall_score: result.aiScoring?.overallScore,
          ai_tier: result.aiScoring?.tier,
          ai_technical_fit: result.aiScoring?.technicalFit,
          ai_experience_level: result.aiScoring?.experienceLevel,
          ai_risk_assessment: result.aiScoring?.riskAssessment,
          ai_reasoning: result.aiScoring?.reasoning,
          ai_strengths: result.aiScoring?.strengths,
          ai_concerns: result.aiScoring?.concerns,
          // Add enhanced profile data
          enhanced_summary: result.enhancedProfile?.summary,
          enhanced_strengths: result.enhancedProfile?.strengths,
          enhanced_specializations: result.enhancedProfile?.specializations,
          career_trajectory: result.enhancedProfile?.careerTrajectory,
          // Add processing metadata
          ai_processed: true,
          ai_confidence: result.processingMetadata.confidence,
          processing_time: result.processingMetadata.processingTime
        }));

        console.log('✅ AI processing completed:', aiStats);
      }

      // Sort by AI scores if available, otherwise by original scores
      finalCandidates.sort((a, b) => {
        const scoreA = a.ai_overall_score || a.overall_score || 0;
        const scoreB = b.ai_overall_score || b.overall_score || 0;
        return scoreB - scoreA;
      });

      setSearchResults(finalCandidates);
      
      // Enhanced metadata with AI insights
      const enhancedMetadata = {
        ...response.metadata,
        queryInterpretation: aiEnhancedQuery?.interpretation || query,
        parsedQuery: aiEnhancedQuery,
        aiEnhanced: !!aiEnhancedQuery,
        aiProcessingStats: aiStats,
        confidence: aiEnhancedQuery?.aiConfidence || response.metadata?.confidence || 50,
        searchStrategy: aiEnhancedQuery?.searchStrategy || 'standard',
        candidatesProcessed: finalCandidates.length,
        aiTierDistribution: aiStats?.tierDistribution
      };
      
      setSearchMetadata(enhancedMetadata);

      toast({
        title: "AI-Enhanced Search Complete",
        description: `Found ${finalCandidates.length} candidates with AI analysis${aiStats ? ` (${aiStats.scored} scored)` : ''}`,
      });

      console.log('🎯 AI-enhanced search completed successfully');

    } catch (error) {
      console.error('❌ AI-enhanced search failed:', error);
      setSearchError({
        type: 'service',
        message: error instanceof Error ? error.message : 'Search failed unexpectedly',
        retryable: true
      });
      
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchMetadata(null);
    setSearchError(null);
    clearAIData();
  };

  const clearFilters = () => {
    setFilters({
      minScore: 0,
      maxScore: 100,
      location: '',
      lastActive: '',
      skills: []
    });
  };

  return {
    // Search state
    searchQuery,
    searchResults,
    isSearching: isSearching || aiProcessing,
    searchMetadata,
    searchError,
    
    // AI state
    enhancedQuery,
    processedCandidates,
    aiStats,
    
    // Filter state
    filters,
    setFilters,
    
    // Actions
    handleSearch,
    clearSearch,
    clearFilters
  };
};
