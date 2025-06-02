
import React from 'react';
import { Brain, Layers, Lightbulb } from 'lucide-react';

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

  return (
    <>
      {getAdvancedStrategyInfo()}
      {getAdvancedValidationInfo()}
      
      {searchMetadata?.fallback_used && !searchError && (
        <p className="text-xs text-amber-600 mt-1">
          Showing top candidates - try more specific search terms for better AI matching
        </p>
      )}
      
      {searchMetadata?.parsed_criteria && (
        <div className="text-xs text-slate-500 mt-2">
          <span>Parsed: </span>
          {searchMetadata.parsed_criteria.skills?.length > 0 && (
            <span className="mr-2">Skills: {searchMetadata.parsed_criteria.skills.slice(0, 3).join(', ')}</span>
          )}
          {searchMetadata.parsed_criteria.location && (
            <span className="mr-2">Location: {searchMetadata.parsed_criteria.location}</span>
          )}
          {searchMetadata.parsed_criteria.seniority_level && searchMetadata.parsed_criteria.seniority_level !== 'any' && (
            <span className="mr-2">Level: {searchMetadata.parsed_criteria.seniority_level}</span>
          )}
        </div>
      )}
    </>
  );
};
