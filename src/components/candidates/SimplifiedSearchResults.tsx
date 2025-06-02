
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, ChevronDown, ChevronUp, Brain, BarChart3 } from 'lucide-react';

interface SimplifiedSearchResultsProps {
  searchQuery: string;
  isSearching: boolean;
  candidateCount: number;
  searchMetadata?: any;
  searchError?: any;
  onRetry?: () => void;
  onFindMore?: () => void;
  enhancedQuery?: any;
  aiStats?: any;
}

export const SimplifiedSearchResults = ({ 
  searchQuery, 
  isSearching, 
  candidateCount, 
  searchMetadata,
  searchError,
  onRetry,
  onFindMore,
  enhancedQuery,
  aiStats
}: SimplifiedSearchResultsProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const showFindMore = searchQuery && !isSearching && candidateCount < 20 && !searchError;
  const isAIEnhanced = !!enhancedQuery || !!aiStats;

  if (searchError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-red-800 font-medium">Search Error</h3>
            <p className="text-red-600 text-sm">{searchError.message}</p>
          </div>
          {searchError.retryable && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              disabled={isSearching}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-semibold text-slate-900">
              {searchQuery ? 'Search Results' : 'All Candidates'}
            </h2>
            
            {isAIEnhanced && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                AI Enhanced
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-slate-600">
            {isSearching ? (
              <span className="flex items-center">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </span>
            ) : (
              <span>{candidateCount} candidates found</span>
            )}
            
            {searchQuery && !searchError && (
              <span className="text-blue-600">for "{searchQuery}"</span>
            )}
            
            {aiStats && (
              <span className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                {aiStats.scored}/{aiStats.totalProcessed} AI scored
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showFindMore && (
            <Button
              onClick={onFindMore}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Find More
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2"
          >
            Details
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <option>Relevance</option>
            <option>AI Score</option>
            <option>Experience</option>
            <option>Recent Activity</option>
          </select>
        </div>
      </div>

      {/* Collapsible Details */}
      {showDetails && searchMetadata && (
        <div className="bg-slate-50 rounded-lg p-4 mb-4 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {searchMetadata.processingTime && (
              <div>
                <span className="font-medium">Processing Time</span>
                <p className="text-slate-600">{searchMetadata.processingTime}ms</p>
              </div>
            )}
            
            {searchMetadata.confidence && (
              <div>
                <span className="font-medium">Confidence</span>
                <p className="text-slate-600">{searchMetadata.confidence}%</p>
              </div>
            )}
            
            {searchMetadata.sourcesUsed && (
              <div>
                <span className="font-medium">Sources</span>
                <p className="text-slate-600">{searchMetadata.sourcesUsed.join(', ')}</p>
              </div>
            )}
            
            {searchMetadata.searchStrategy && (
              <div>
                <span className="font-medium">Strategy</span>
                <p className="text-slate-600 capitalize">{searchMetadata.searchStrategy}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
