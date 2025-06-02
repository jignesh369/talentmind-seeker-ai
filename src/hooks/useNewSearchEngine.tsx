
import { useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useAIIntelligence } from './useAIIntelligence';
import { newDataCollectionService } from '@/services/NewDataCollectionService';
import { EnhancedQueryProcessor, ComplexQueryAnalysis } from '@/services/ai/EnhancedQueryProcessor';
import { EnhancedCandidateScorer } from '@/services/ai/EnhancedCandidateScorer';

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
  const [complexAnalysis, setComplexAnalysis] = useState<ComplexQueryAnalysis | null>(null);
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
      console.log('🚀 Starting enhanced AI-powered search for:', query);
      
      const openaiKey = 'dummy-key-for-demo'; // In production, get from environment
      
      // Phase 1: Enhanced Complex Query Analysis
      const enhancedProcessor = new EnhancedQueryProcessor(openaiKey);
      const [aiEnhancedQuery, complexQueryAnalysis] = await Promise.all([
        enhanceSearchQuery(query, openaiKey),
        enhancedProcessor.analyzeComplexQuery(query)
      ]);
      
      setComplexAnalysis(complexQueryAnalysis);
      console.log('🎯 Complex query analysis:', complexQueryAnalysis);
      
      // Phase 2: Data Collection with Enhanced Query
      const searchRequest = {
        query: query.trim(),
        location: filters.location || undefined,
        limit: 20,
        enhancedQuery: aiEnhancedQuery,
        complexAnalysis: complexQueryAnalysis
      };

      console.log('🔍 Executing enhanced data collection...');
      const response = await newDataCollectionService.searchCandidates(searchRequest);
      
      if (!response || !response.candidates) {
        throw new Error('Invalid response from search service');
      }

      console.log('📊 Raw search results:', response.candidates.length);

      // Phase 3: Enhanced AI Processing of Candidates
      let finalCandidates = response.candidates;
      
      if (response.candidates.length > 0) {
        console.log('🤖 Processing candidates with enhanced AI intelligence...');
        
        const enhancedScorer = new EnhancedCandidateScorer(openaiKey);
        
        // Process candidates with enhanced scoring
        const enhancedResults = await Promise.all(
          response.candidates.map(async (candidate: any) => {
            try {
              const enhancedScore = await enhancedScorer.scoreWithComplexQuery(
                candidate,
                complexQueryAnalysis,
                aiEnhancedQuery || { query }
              );
              
              return {
                ...candidate,
                // Enhanced AI scoring
                enhanced_overall_score: enhancedScore.overallScore,
                enhanced_tier: enhancedScore.tier,
                open_source_score: enhancedScore.openSourceScore,
                ai_expertise_score: enhancedScore.aiExpertiseScore,
                startup_fit_score: enhancedScore.startupFitScore,
                demographic_fit_score: enhancedScore.demographicFitScore,
                location_match_score: enhancedScore.locationMatchScore,
                
                // Detailed analysis
                open_source_level: enhancedScore.detailedAnalysis.openSourceContributions.level,
                open_source_evidence: enhancedScore.detailedAnalysis.openSourceContributions.evidence,
                ai_specializations: enhancedScore.detailedAnalysis.aiExpertise.specializations,
                ai_experience_level: enhancedScore.detailedAnalysis.aiExpertise.experienceLevel,
                startup_indicators: enhancedScore.detailedAnalysis.startupReadiness.indicators,
                startup_risk_factors: enhancedScore.detailedAnalysis.startupReadiness.riskFactors,
                culture_work_style: enhancedScore.detailedAnalysis.cultureAlignment.workStyle,
                culture_values: enhancedScore.detailedAnalysis.cultureAlignment.values,
                
                // Enhanced metadata
                enhanced_reasoning: enhancedScore.reasoning,
                enhanced_strengths: enhancedScore.strengths,
                enhanced_concerns: enhancedScore.concerns,
                enhanced_processed: true
              };
            } catch (error) {
              console.error(`Failed to enhance candidate ${candidate.name}:`, error);
              return {
                ...candidate,
                enhanced_processed: false,
                enhanced_error: error instanceof Error ? error.message : 'Unknown error'
              };
            }
          })
        );
        
        finalCandidates = enhancedResults;
        console.log('✅ Enhanced AI processing completed');
      }

      // Sort by enhanced scores with fallback to original scores
      finalCandidates.sort((a, b) => {
        const scoreA = a.enhanced_overall_score || a.ai_overall_score || a.overall_score || 0;
        const scoreB = b.enhanced_overall_score || b.ai_overall_score || b.overall_score || 0;
        return scoreB - scoreA;
      });

      setSearchResults(finalCandidates);
      
      // Enhanced metadata with complex analysis insights
      const enhancedMetadata = {
        ...response.metadata,
        queryInterpretation: aiEnhancedQuery?.interpretation || query,
        parsedQuery: aiEnhancedQuery,
        complexAnalysis: complexQueryAnalysis,
        aiEnhanced: !!aiEnhancedQuery,
        enhancedProcessing: true,
        confidence: aiEnhancedQuery?.aiConfidence || response.metadata?.confidence || 50,
        searchStrategy: complexQueryAnalysis.searchStrategy,
        candidatesProcessed: finalCandidates.length,
        enhancedScoring: {
          openSourceCandidates: finalCandidates.filter(c => c.open_source_score > 50).length,
          aiExpertsCandidates: finalCandidates.filter(c => c.ai_expertise_score > 70).length,
          startupReadyCandidates: finalCandidates.filter(c => c.startup_fit_score > 70).length,
          tierDistribution: {
            A: finalCandidates.filter(c => c.enhanced_tier === 'A').length,
            B: finalCandidates.filter(c => c.enhanced_tier === 'B').length,
            C: finalCandidates.filter(c => c.enhanced_tier === 'C').length,
            D: finalCandidates.filter(c => c.enhanced_tier === 'D').length
          }
        }
      };
      
      setSearchMetadata(enhancedMetadata);

      const openSourceCount = finalCandidates.filter(c => c.open_source_score > 50).length;
      const aiExpertCount = finalCandidates.filter(c => c.ai_expertise_score > 70).length;
      const startupReadyCount = finalCandidates.filter(c => c.startup_fit_score > 70).length;

      toast({
        title: "Enhanced AI Search Complete",
        description: `Found ${finalCandidates.length} candidates: ${openSourceCount} open source contributors, ${aiExpertCount} AI experts, ${startupReadyCount} startup-ready`,
      });

      console.log('🎯 Enhanced AI search completed successfully');

    } catch (error) {
      console.error('❌ Enhanced AI search failed:', error);
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
    setComplexAnalysis(null);
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
    
    // Enhanced AI state
    enhancedQuery,
    complexAnalysis,
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
