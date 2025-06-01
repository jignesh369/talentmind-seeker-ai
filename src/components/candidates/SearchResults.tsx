import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Info, AlertTriangle, RefreshCw, Brain, Target, Award, Building, Zap, Layers, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchResultsProps {
  searchQuery: string;
  isSearching: boolean;
  candidateCount: number;
  searchMetadata?: any;
  searchError?: {
    type: 'validation' | 'network' | 'service' | 'unknown';
    message: string;
    retryable: boolean;
  };
  retryCount?: number;
  onRetry?: () => void;
}

export const SearchResults = ({ 
  searchQuery, 
  isSearching, 
  candidateCount, 
  searchMetadata,
  searchError,
  retryCount = 0,
  onRetry
}: SearchResultsProps) => {
  const getAdvancedSearchBadges = () => {
    if (!searchMetadata?.enhanced_features) return null;
    
    const badges = [];
    const features = searchMetadata.enhanced_features;
    
    if (features.contextual_search) {
      badges.push(
        <Badge key="contextual" variant="default" className="ml-2 bg-purple-600">
          <Brain className="w-3 h-3 mr-1" />
          Contextual AI
        </Badge>
      );
    }
    
    if (features.technology_stack) {
      badges.push(
        <Badge key="stack" variant="default" className="ml-2 bg-cyan-500">
          <Layers className="w-3 h-3 mr-1" />
          Stack Match
        </Badge>
      );
    }
    
    if (features.intent_detection) {
      badges.push(
        <Badge key="intent" variant="default" className="ml-2 bg-emerald-500">
          <Lightbulb className="w-3 h-3 mr-1" />
          Intent Detection
        </Badge>
      );
    }
    
    if (features.semantic_search) {
      badges.push(
        <Badge key="semantic" variant="default" className="ml-2 bg-purple-500">
          <Brain className="w-3 h-3 mr-1" />
          Semantic
        </Badge>
      );
    }
    
    if (features.role_matching) {
      badges.push(
        <Badge key="role" variant="default" className="ml-2 bg-blue-500">
          <Target className="w-3 h-3 mr-1" />
          Role Match
        </Badge>
      );
    }
    
    if (features.confidence_scoring && features.confidence_scoring > 70) {
      badges.push(
        <Badge key="confidence" variant="default" className="ml-2 bg-green-600">
          <Zap className="w-3 h-3 mr-1" />
          High Confidence
        </Badge>
      );
    }
    
    return badges;
  };

  const getAdvancedSearchQualityBadge = () => {
    if (!searchMetadata) return null;
    
    const { search_strategies, fallback_used, service_status, enhanced_features } = searchMetadata;
    
    // Service status indicator
    if (service_status === 'degraded') {
      return <Badge variant="destructive" className="ml-2">Service Degraded</Badge>;
    }
    
    if (fallback_used) {
      return <Badge variant="secondary" className="ml-2">Broad Match</Badge>;
    }
    
    // Enhanced quality indicators
    if (enhanced_features?.confidence_scoring) {
      const confidence = enhanced_features.confidence_scoring;
      if (confidence >= 80) {
        return <Badge variant="default" className="ml-2 bg-green-600">AI Precision+</Badge>;
      } else if (confidence >= 60) {
        return <Badge variant="default" className="ml-2 bg-blue-600">AI Enhanced</Badge>;
      } else if (confidence >= 40) {
        return <Badge variant="default" className="ml-2 bg-indigo-500">AI Assisted</Badge>;
      }
    }
    
    if (search_strategies) {
      const activeStrategies = Object.keys(search_strategies).filter(
        key => search_strategies[key].count > 0
      );
      
      if (activeStrategies.length >= 5) {
        return <Badge variant="default" className="ml-2 bg-green-500">Maximum Precision</Badge>;
      } else if (activeStrategies.length >= 4) {
        return <Badge variant="default" className="ml-2 bg-blue-500">High Precision</Badge>;
      } else if (activeStrategies.length >= 3) {
        return <Badge variant="default" className="ml-2 bg-indigo-500">Enhanced Match</Badge>;
      }
    }
    
    return <Badge variant="outline" className="ml-2">Standard Search</Badge>;
  };

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

  const renderErrorState = () => {
    if (!searchError) return null;
    
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Enhanced Search Error</h3>
              <p className="text-sm text-red-700 mt-1">{searchError.message}</p>
              {retryCount > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Retry attempt {retryCount} of 3
                </p>
              )}
            </div>
          </div>
          
          {searchError.retryable && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              disabled={isSearching}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isSearching ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mb-6">
      {renderErrorState()}
      
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center flex-wrap">
            <h2 className="text-xl font-semibold text-slate-900">
              {searchQuery ? 'AI-Enhanced Search Results' : 'All Candidates'}
            </h2>
            {getAdvancedSearchQualityBadge()}
            {getAdvancedSearchBadges()}
          </div>
          
          <div className="mt-1">
            <p className="text-slate-600">
              {isSearching ? (
                <span className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running AI-enhanced search...
                  {retryCount > 0 && ` (retry ${retryCount})`}
                </span>
              ) : (
                `${candidateCount} candidates found`
              )}
              {searchQuery && !searchError && (
                <span className="ml-2 text-blue-600">
                  for "{searchQuery}"
                </span>
              )}
            </p>
            
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
          </div>
        </div>
        
        <select className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          <option>Sort by AI Relevance</option>
          <option>Sort by Overall Score</option>
          <option>Sort by Context Match</option>
          <option>Sort by Experience</option>
          <option>Sort by Last Active</option>
        </select>
      </div>
    </div>
  );
};
