
import React from 'react';
import { Brain, Layers, Lightbulb, Target, Award, TrendingUp } from 'lucide-react';

interface SearchResultsMetadataProps {
  searchMetadata?: any;
  searchError?: any;
}

export const SearchResultsMetadata = ({ searchMetadata, searchError }: SearchResultsMetadataProps) => {
  const getAdvancedStrategyInfo = () => {
    if (!searchMetadata?.search_strategies) return null;
    
    const strategies = searchMetadata.search_strategies;
    const activeStrategies = Object.entries(strategies)
      .filter(([_, data]: [string, any]) => data.count > 0)
      .map(([name, data]: [string, any]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: data.count,
        error: data.error,
        confidence: data.confidence,
        intent: data.intent,
        stacks: data.stacks
      }));
    
    return (
      <div className="text-xs text-slate-600 mt-2 space-y-1">
        {activeStrategies.length > 0 && (
          <div className="flex items-center gap-2">
            <Brain className="w-3 h-3" />
            <span>
              AI Strategies: {activeStrategies.map(s => {
                let strategyInfo = `${s.name} (${s.count})`;
                if (s.confidence) strategyInfo += ` [${s.confidence}% confidence]`;
                if (s.intent) strategyInfo += ` [${s.intent}]`;
                if (s.stacks) strategyInfo += ` [${s.stacks.join(', ')} stacks]`;
                return strategyInfo;
              }).join(', ')}
            </span>
          </div>
        )}
        
        {searchMetadata.enhanced_features?.contextual_search && (
          <div className="flex items-center gap-2 text-purple-600">
            <Layers className="w-3 h-3" />
            <span>Advanced contextual understanding and technology stack analysis active</span>
          </div>
        )}
        
        {searchMetadata.enhanced_features?.intent_detection && (
          <div className="flex items-center gap-2 text-emerald-600">
            <Lightbulb className="w-3 h-3" />
            <span>Search intent detected and optimized for: {searchMetadata.parsed_criteria?.search_intent?.replace('_', ' ')}</span>
          </div>
        )}
      </div>
    );
  };

  const getEnhancedQualityMetrics = () => {
    const qualityMetrics = searchMetadata?.quality_metrics;
    if (!qualityMetrics) return null;

    return (
      <div className="text-xs text-slate-600 mt-2 space-y-1">
        <div className="flex items-center gap-2">
          <Award className="w-3 h-3 text-yellow-600" />
          <span className="font-medium">Quality Metrics:</span>
        </div>
        
        <div className="ml-5 space-y-1">
          {qualityMetrics.processing_quality > 0 && (
            <div className="flex items-center gap-2">
              <Target className="w-3 h-3" />
              <span>Processing Quality: {qualityMetrics.processing_quality}%</span>
              {qualityMetrics.processing_quality >= 80 && <span className="text-green-600">(Excellent)</span>}
              {qualityMetrics.processing_quality >= 60 && qualityMetrics.processing_quality < 80 && <span className="text-blue-600">(Good)</span>}
              {qualityMetrics.processing_quality < 60 && <span className="text-amber-600">(Fair)</span>}
            </div>
          )}
          
          {qualityMetrics.result_quality > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              <span>Result Quality: {qualityMetrics.result_quality}%</span>
              {qualityMetrics.result_quality >= 80 && <span className="text-green-600">(High)</span>}
              {qualityMetrics.result_quality >= 60 && qualityMetrics.result_quality < 80 && <span className="text-blue-600">(Medium)</span>}
              {qualityMetrics.result_quality < 60 && <span className="text-amber-600">(Low)</span>}
            </div>
          )}
          
          {qualityMetrics.search_effectiveness > 0 && (
            <div className="flex items-center gap-2">
              <Brain className="w-3 h-3" />
              <span>Search Effectiveness: {qualityMetrics.search_effectiveness}%</span>
            </div>
          )}
        </div>

        {qualityMetrics.quality_report && (
          <div className="ml-5 mt-2">
            <span className="text-slate-500">
              Quality Distribution: {Object.entries(qualityMetrics.quality_report.quality_summary || {})
                .filter(([_, count]: [string, any]) => count > 0)
                .map(([tier, count]: [string, any]) => `${count} ${tier}`)
                .join(', ')}
            </span>
          </div>
        )}
      </div>
    );
  };

  const getAdvancedValidationInfo = () => {
    if (!searchMetadata?.query_validation && !searchMetadata?.parsed_criteria) return null;
    
    const { parsed_criteria } = searchMetadata;
    
    return (
      <div className="text-xs text-slate-500 mt-2 space-y-1">
        {parsed_criteria?.confidence_score && (
          <div>
            <span className="font-medium">AI Confidence: {parsed_criteria.confidence_score}%</span>
            {parsed_criteria.confidence_score >= 70 && <span className="text-green-600 ml-1">(High)</span>}
            {parsed_criteria.confidence_score >= 40 && parsed_criteria.confidence_score < 70 && <span className="text-blue-600 ml-1">(Medium)</span>}
            {parsed_criteria.confidence_score < 40 && <span className="text-amber-600 ml-1">(Low)</span>}
          </div>
        )}
        
        <div className="flex flex-wrap gap-2">
          {parsed_criteria?.skills?.length > 0 && (
            <span>Skills: {parsed_criteria.skills.slice(0, 3).join(', ')}</span>
          )}
          {parsed_criteria?.technology_stack?.length > 0 && (
            <span>Tech Stacks: {parsed_criteria.technology_stack.join(', ')}</span>
          )}
          {parsed_criteria?.role_cluster?.length > 0 && (
            <span>Role Clusters: {parsed_criteria.role_cluster.join(', ')}</span>
          )}
          {parsed_criteria?.location && (
            <span>Location: {parsed_criteria.location}</span>
          )}
        </div>
      </div>
    );
  };

  const getSearchRecommendations = () => {
    const searchReport = searchMetadata?.search_report;
    if (!searchReport?.recommendations?.length) return null;

    return (
      <div className="text-xs text-blue-600 mt-2">
        <div className="font-medium mb-1">💡 Recommendations:</div>
        <ul className="ml-3 space-y-1">
          {searchReport.recommendations.slice(0, 2).map((rec: string, index: number) => (
            <li key={index} className="list-disc">{rec}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <>
      {getAdvancedStrategyInfo()}
      {getEnhancedQualityMetrics()}
      {getAdvancedValidationInfo()}
      
      {searchMetadata?.fallback_used && !searchError && (
        <p className="text-xs text-amber-600 mt-1">
          Showing top candidates - try more specific search terms for better AI matching
        </p>
      )}
      
      {searchMetadata?.enhanced_features?.enhanced_coordination && (
        <p className="text-xs text-green-600 mt-1">
          ✨ Enhanced search coordination and quality filtering applied
        </p>
      )}
      
      {getSearchRecommendations()}
    </>
  );
};
