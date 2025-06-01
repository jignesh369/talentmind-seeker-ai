
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Info, AlertTriangle, RefreshCw } from 'lucide-react';
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
  const getSearchQualityBadge = () => {
    if (!searchMetadata) return null;
    
    const { search_strategies, fallback_used, service_status } = searchMetadata;
    
    // Service status indicator
    if (service_status === 'degraded') {
      return <Badge variant="destructive" className="ml-2">Service Degraded</Badge>;
    }
    
    if (fallback_used) {
      return <Badge variant="secondary" className="ml-2">Broad Match</Badge>;
    }
    
    if (search_strategies) {
      const activeStrategies = Object.keys(search_strategies).filter(
        key => search_strategies[key].count > 0
      );
      
      if (activeStrategies.length >= 3) {
        return <Badge variant="default" className="ml-2 bg-green-500">High Precision</Badge>;
      } else if (activeStrategies.length >= 2) {
        return <Badge variant="default" className="ml-2 bg-blue-500">Good Match</Badge>;
      } else if (activeStrategies.length === 1) {
        return <Badge variant="outline" className="ml-2">Single Strategy</Badge>;
      }
    }
    
    return null;
  };

  const getSearchStrategyInfo = () => {
    if (!searchMetadata?.search_strategies) return null;
    
    const strategies = searchMetadata.search_strategies;
    const activeStrategies = Object.entries(strategies)
      .filter(([_, data]: [string, any]) => data.count > 0)
      .map(([name, data]: [string, any]) => ({
        name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: data.count,
        error: data.error
      }));
    
    const errorStrategies = Object.entries(strategies)
      .filter(([_, data]: [string, any]) => data.error && data.count === 0)
      .map(([name, data]: [string, any]) => ({
        name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        error: data.error
      }));
    
    return (
      <div className="text-xs text-slate-600 mt-1 space-y-1">
        {activeStrategies.length > 0 && (
          <div className="flex items-center gap-2">
            <Info className="w-3 h-3" />
            <span>
              Matched via: {activeStrategies.map(s => `${s.name} (${s.count})`).join(', ')}
            </span>
          </div>
        )}
        
        {errorStrategies.length > 0 && (
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-3 h-3" />
            <span>
              {errorStrategies.length} search strategies had issues but results were still found
            </span>
          </div>
        )}
      </div>
    );
  };

  const getValidationInfo = () => {
    if (!searchMetadata?.query_validation) return null;
    
    const { original_query, sanitized_query, validation_errors } = searchMetadata.query_validation;
    
    if (validation_errors && validation_errors.length > 0) {
      return (
        <div className="text-xs text-amber-600 mt-1">
          Query was adjusted: {validation_errors.join(', ')}
        </div>
      );
    }
    
    if (original_query !== sanitized_query) {
      return (
        <div className="text-xs text-blue-600 mt-1">
          Search query was optimized for better results
        </div>
      );
    }
    
    return null;
  };

  const renderErrorState = () => {
    if (!searchError) return null;
    
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Search Error</h3>
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
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-slate-900">
              {searchQuery ? 'Search Results' : 'All Candidates'}
            </h2>
            {getSearchQualityBadge()}
          </div>
          
          <div className="mt-1">
            <p className="text-slate-600">
              {isSearching ? (
                <span className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
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
            
            {getSearchStrategyInfo()}
            {getValidationInfo()}
            
            {searchMetadata?.fallback_used && !searchError && (
              <p className="text-xs text-amber-600 mt-1">
                Showing top candidates - try more specific search terms for better matches
              </p>
            )}
          </div>
        </div>
        
        <select className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          <option>Sort by Relevance</option>
          <option>Sort by Overall Score</option>
          <option>Sort by Experience</option>
          <option>Sort by Last Active</option>
        </select>
      </div>
    </div>
  );
};
