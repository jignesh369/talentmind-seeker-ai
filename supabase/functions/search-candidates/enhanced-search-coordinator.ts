
import { AdvancedQueryProcessor } from '../parse-query/advanced-query-processor.ts';
import { ResultQualityFilter } from './result-quality-filter.ts';

export interface SearchConfiguration {
  enable_quality_filtering: boolean;
  quality_thresholds: {
    min_profile_completeness: number;
    min_skill_relevance: number;
    min_overall_quality: number;
  };
  search_strategy_weights: {
    semantic_search: number;
    role_based: number;
    skills_based: number;
    text_based: number;
  };
  result_limits: {
    max_per_strategy: number;
    final_result_limit: number;
  };
}

export class EnhancedSearchCoordinator {
  private static readonly DEFAULT_CONFIG: SearchConfiguration = {
    enable_quality_filtering: true,
    quality_thresholds: {
      min_profile_completeness: 50,
      min_skill_relevance: 40,
      min_overall_quality: 55
    },
    search_strategy_weights: {
      semantic_search: 1.2,
      role_based: 1.0,
      skills_based: 1.1,
      text_based: 0.8
    },
    result_limits: {
      max_per_strategy: 25,
      final_result_limit: 50
    }
  };

  static async coordinateEnhancedSearch(
    supabase: any,
    query: string,
    parsedCriteria: any,
    searchStrategies: any,
    config: Partial<SearchConfiguration> = {}
  ) {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    console.log('🚀 Starting enhanced search coordination...');
    
    // Step 1: Advanced query processing
    const queryAnalysis = AdvancedQueryProcessor.processQuery(query, parsedCriteria);
    console.log(`📊 Query analysis completed - Complexity: ${queryAnalysis.semantic_context.complexity_score}%, Confidence: ${queryAnalysis.semantic_context.confidence_level}%`);

    // Step 2: Dynamic strategy selection based on query quality
    const selectedStrategies = this.selectOptimalStrategies(queryAnalysis, searchStrategies);
    
    // Step 3: Execute search strategies with enhanced coordination
    const allResults = new Map();
    const strategyResults = {};
    
    for (const [strategyName, strategyData] of Object.entries(selectedStrategies)) {
      try {
        console.log(`🔍 Executing strategy: ${strategyName}`);
        
        const results = await this.executeStrategyWithEnhancement(
          supabase,
          strategyName,
          strategyData,
          queryAnalysis,
          finalConfig
        );
        
        strategyResults[strategyName] = {
          count: results.data.length,
          error: results.error,
          weight: finalConfig.search_strategy_weights[strategyName] || 1.0,
          quality_avg: this.calculateAverageQuality(results.data)
        };

        // Add results with weighted scoring
        results.data.forEach(candidate => {
          const weight = finalConfig.search_strategy_weights[strategyName] || 1.0;
          const weightedScore = (candidate.hybrid_score || candidate.overall_score || 0) * weight;
          
          if (!allResults.has(candidate.id)) {
            allResults.set(candidate.id, {
              ...candidate,
              hybrid_score: weightedScore,
              source_strategies: [strategyName]
            });
          } else {
            // Merge results from multiple strategies
            const existing = allResults.get(candidate.id);
            existing.hybrid_score = Math.max(existing.hybrid_score, weightedScore);
            existing.source_strategies.push(strategyName);
          }
        });
        
      } catch (error) {
        console.error(`❌ Strategy ${strategyName} failed:`, error.message);
        strategyResults[strategyName] = { count: 0, error: error.message, weight: 0 };
      }
    }

    // Step 4: Apply quality filtering and ranking
    let candidates = Array.from(allResults.values());
    let qualityReport = null;

    if (finalConfig.enable_quality_filtering && candidates.length > 0) {
      const filterResult = ResultQualityFilter.filterAndRankCandidates(
        candidates,
        queryAnalysis,
        finalConfig.quality_thresholds
      );
      
      candidates = filterResult.candidates;
      qualityReport = filterResult.qualityReport;
      
      console.log(`✅ Quality filtering applied: ${candidates.length} candidates passed quality thresholds`);
    } else {
      // Sort by hybrid score if no quality filtering
      candidates = candidates.sort((a, b) => (b.hybrid_score || 0) - (a.hybrid_score || 0));
    }

    // Step 5: Apply final result limit
    const finalCandidates = candidates.slice(0, finalConfig.result_limits.final_result_limit);

    // Step 6: Generate comprehensive search report
    const searchReport = this.generateSearchReport(
      queryAnalysis,
      strategyResults,
      qualityReport,
      finalCandidates,
      finalConfig
    );

    console.log(`🎉 Enhanced search completed: ${finalCandidates.length} high-quality candidates found`);

    return {
      candidates: finalCandidates,
      query_analysis: queryAnalysis,
      strategy_results: strategyResults,
      quality_report: qualityReport,
      search_report: searchReport,
      enhanced_metadata: {
        processing_quality: this.assessProcessingQuality(queryAnalysis, strategyResults),
        result_quality: qualityReport?.average_quality_score || 0,
        search_effectiveness: this.calculateSearchEffectiveness(strategyResults, finalCandidates.length)
      }
    };
  }

  private static selectOptimalStrategies(queryAnalysis: any, availableStrategies: any) {
    const selectedStrategies = {};
    const complexityScore = queryAnalysis.semantic_context.complexity_score;
    const confidenceLevel = queryAnalysis.semantic_context.confidence_level;

    // Always include high-confidence strategies
    if (availableStrategies.advanced_semantic && confidenceLevel > 60) {
      selectedStrategies.advanced_semantic = availableStrategies.advanced_semantic;
    }

    if (availableStrategies.semantic_search && queryAnalysis.skill_analysis.technical_skills.length > 0) {
      selectedStrategies.semantic_search = availableStrategies.semantic_search;
    }

    if (availableStrategies.role_based_search && queryAnalysis.role_analysis.primary_role !== 'general') {
      selectedStrategies.role_based_search = availableStrategies.role_based_search;
    }

    if (availableStrategies.skills_based && queryAnalysis.skill_analysis.technical_skills.length > 2) {
      selectedStrategies.skills_based = availableStrategies.skills_based;
    }

    // Include text-based as fallback for low-complexity queries
    if (complexityScore < 50 || Object.keys(selectedStrategies).length < 2) {
      if (availableStrategies.text_based) {
        selectedStrategies.text_based = availableStrategies.text_based;
      }
    }

    // Ensure we have at least one strategy
    if (Object.keys(selectedStrategies).length === 0) {
      selectedStrategies.text_based = availableStrategies.text_based || {};
    }

    console.log(`📋 Selected ${Object.keys(selectedStrategies).length} strategies based on query analysis`);
    return selectedStrategies;
  }

  private static async executeStrategyWithEnhancement(
    supabase: any,
    strategyName: string,
    strategyData: any,
    queryAnalysis: any,
    config: SearchConfiguration
  ) {
    // Apply query-specific enhancements to the strategy
    const enhancedCriteria = this.enhanceCriteriaForStrategy(
      strategyName,
      queryAnalysis,
      config
    );

    try {
      // Execute strategy with enhanced criteria (implementation would depend on existing strategy functions)
      const results = { data: strategyData.data || [], error: strategyData.error };
      
      // Apply strategy-specific result enhancement
      const enhancedResults = results.data.map(candidate => 
        this.enhanceCandidateForStrategy(candidate, strategyName, queryAnalysis)
      );

      return { data: enhancedResults, error: results.error };
      
    } catch (error) {
      return { data: [], error: error.message };
    }
  }

  private static enhanceCriteriaForStrategy(strategyName: string, queryAnalysis: any, config: any) {
    const baseCriteria = {
      skills: queryAnalysis.skill_analysis.technical_skills,
      semantic_skills: queryAnalysis.skill_analysis.technical_skills,
      role_types: [queryAnalysis.role_analysis.primary_role],
      seniority_level: queryAnalysis.role_analysis.hierarchy_level
    };

    // Strategy-specific enhancements
    switch (strategyName) {
      case 'semantic_search':
        return {
          ...baseCriteria,
          semantic_skills: [
            ...queryAnalysis.skill_analysis.technical_skills,
            ...queryAnalysis.skill_analysis.domain_expertise
          ]
        };
      
      case 'role_based_search':
        return {
          ...baseCriteria,
          role_types: queryAnalysis.role_analysis.role_variations
        };
      
      default:
        return baseCriteria;
    }
  }

  private static enhanceCandidateForStrategy(candidate: any, strategyName: string, queryAnalysis: any) {
    let enhancementBoost = 0;

    // Apply strategy-specific scoring enhancements
    switch (strategyName) {
      case 'advanced_semantic':
        enhancementBoost = 15;
        break;
      case 'semantic_search':
        enhancementBoost = 12;
        break;
      case 'role_based_search':
        enhancementBoost = 10;
        break;
      case 'skills_based':
        enhancementBoost = 8;
        break;
      default:
        enhancementBoost = 5;
    }

    return {
      ...candidate,
      hybrid_score: (candidate.hybrid_score || candidate.overall_score || 0) + enhancementBoost,
      enhancement_source: strategyName
    };
  }

  private static calculateAverageQuality(candidates: any[]): number {
    if (candidates.length === 0) return 0;
    
    const totalScore = candidates.reduce((sum, candidate) => 
      sum + (candidate.overall_score || 0), 0
    );
    
    return Math.round(totalScore / candidates.length);
  }

  private static assessProcessingQuality(queryAnalysis: any, strategyResults: any): number {
    const factors = [
      queryAnalysis.quality_indicators.query_clarity,
      queryAnalysis.quality_indicators.specificity_score,
      queryAnalysis.semantic_context.confidence_level,
      Object.keys(strategyResults).length * 20 // Strategy diversity
    ];

    return Math.min(
      factors.reduce((sum, factor) => sum + factor, 0) / factors.length,
      100
    );
  }

  private static calculateSearchEffectiveness(strategyResults: any, finalCount: number): number {
    const totalResultsFound = Object.values(strategyResults)
      .reduce((sum: number, result: any) => sum + (result.count || 0), 0);
    
    const successfulStrategies = Object.values(strategyResults)
      .filter((result: any) => !result.error && result.count > 0).length;
    
    const totalStrategies = Object.keys(strategyResults).length;
    
    const diversityScore = totalStrategies > 0 ? (successfulStrategies / totalStrategies) * 100 : 0;
    const volumeScore = Math.min(finalCount * 2, 100); // 50 candidates = 100% volume score
    
    return Math.round((diversityScore + volumeScore) / 2);
  }

  private static generateSearchReport(
    queryAnalysis: any,
    strategyResults: any,
    qualityReport: any,
    finalCandidates: any[],
    config: SearchConfiguration
  ) {
    return {
      query_processing: {
        original_query: queryAnalysis.original_query,
        complexity_score: queryAnalysis.semantic_context.complexity_score,
        confidence_level: queryAnalysis.semantic_context.confidence_level,
        primary_intent: queryAnalysis.semantic_context.primary_intent,
        quality_indicators: queryAnalysis.quality_indicators
      },
      strategy_performance: strategyResults,
      quality_metrics: qualityReport,
      final_results: {
        total_candidates: finalCandidates.length,
        quality_distribution: qualityReport?.quality_distribution || {},
        average_relevance: this.calculateAverageRelevance(finalCandidates)
      },
      recommendations: this.generateRecommendations(queryAnalysis, strategyResults, qualityReport)
    };
  }

  private static calculateAverageRelevance(candidates: any[]): number {
    if (candidates.length === 0) return 0;
    
    const totalRelevance = candidates.reduce((sum, candidate) => 
      sum + (candidate.relevance_score || candidate.hybrid_score || 0), 0
    );
    
    return Math.round(totalRelevance / candidates.length);
  }

  private static generateRecommendations(queryAnalysis: any, strategyResults: any, qualityReport: any): string[] {
    const recommendations = [];
    
    if (queryAnalysis.quality_indicators.query_clarity < 60) {
      recommendations.push('Consider adding more specific technical requirements to improve search precision');
    }
    
    if (qualityReport && qualityReport.qualification_rate < 50) {
      recommendations.push('Lower quality thresholds or expand search criteria to increase candidate volume');
    }
    
    const successfulStrategies = Object.values(strategyResults)
      .filter((result: any) => !result.error && result.count > 0).length;
    
    if (successfulStrategies < 2) {
      recommendations.push('Broaden search terms or consider alternative search approaches');
    }
    
    if (queryAnalysis.skill_analysis.missing_context.length > 0) {
      recommendations.push(`Specify ${queryAnalysis.skill_analysis.missing_context.join(', ')} for more targeted results`);
    }
    
    return recommendations;
  }
}
