
import React, { useState } from 'react';
import { SearchResultsHeader } from './SearchResultsHeader';
import { SearchResultsBadges } from './SearchResultsBadges';
import { SearchResultsMetadata } from './SearchResultsMetadata';
import { SearchResultsError } from './SearchResultsError';
import { AIInsightsDashboard } from '../ai/AIInsightsDashboard';
import { Button } from '@/components/ui/button';
import { Search, Database, Zap, Shield, Brain, BarChart3 } from 'lucide-react';
import { QueryInterpretation } from '../search/QueryInterpretation';

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
  onFindMore?: () => void;
  enhancedQuery?: any;
  aiStats?: any;
}

export const SearchResults = ({ 
  searchQuery, 
  isSearching, 
  candidateCount, 
  searchMetadata,
  searchError,
  retryCount = 0,
  onRetry,
  onFindMore,
  enhancedQuery,
  aiStats
}: SearchResultsProps) => {
  const [showAIInsights, setShowAIInsights] = useState(false);
  const showFindMore = searchQuery && !isSearching && candidateCount < 20 && !searchError;
  const isAIEnhanced = !!enhancedQuery || !!aiStats;
  
  return (
    <div className="mb-6">
      <SearchResultsError
        searchError={searchError}
        retryCount={retryCount}
        isSearching={isSearching}
        onRetry={onRetry}
      />
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center flex-wrap gap-3">
            <SearchResultsHeader
              searchQuery={searchQuery}
              isSearching={isSearching}
              candidateCount={candidateCount}
              retryCount={retryCount}
              searchError={searchError}
            />
            
            {showFindMore && (
              <Button
                onClick={onFindMore}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={isSearching}
              >
                <Search className="h-4 w-4" />
                Find More Candidates
              </Button>
            )}

            {/* AI Insights Toggle */}
            {isAIEnhanced && (
              <Button
                onClick={() => setShowAIInsights(!showAIInsights)}
                variant={showAIInsights ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                {showAIInsights ? 'Hide' : 'Show'} AI Insights
              </Button>
            )}
            
            <SearchResultsBadges searchMetadata={searchMetadata} />
          </div>
          
          {/* Enhanced Query Interpretation */}
          {searchMetadata?.queryInterpretation && (
            <div className="mt-3">
              <QueryInterpretation 
                interpretation={searchMetadata.queryInterpretation}
                parsedQuery={searchMetadata.parsedQuery}
              />
            </div>
          )}
          
          <SearchResultsMetadata
            searchMetadata={searchMetadata}
            searchError={searchError}
          />
          
          {/* Real Data Collection System Status */}
          {searchMetadata && (
            <div className="flex items-center gap-4 mt-3 text-sm">
              {/* Data Sources Used */}
              {searchMetadata.sourcesUsed && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Database className="h-4 w-4" />
                  <span>Sources: {searchMetadata.sourcesUsed.join(', ')}</span>
                </div>
              )}
              
              {/* Processing Time */}
              {searchMetadata.processingTime && (
                <div className="flex items-center gap-2 text-green-600">
                  <Zap className="h-4 w-4" />
                  <span>{searchMetadata.processingTime}ms</span>
                </div>
              )}
              
              {/* Confidence Score */}
              {searchMetadata.confidence && (
                <div className="flex items-center gap-2 text-purple-600">
                  <Shield className="h-4 w-4" />
                  <span>{searchMetadata.confidence}% confidence</span>
                </div>
              )}

              {/* AI Enhancement Indicator */}
              {searchMetadata.aiEnhanced && (
                <div className="flex items-center gap-2 text-indigo-600">
                  <Brain className="h-4 w-4" />
                  <span>AI Enhanced</span>
                </div>
              )}

              {/* AI Processing Stats */}
              {aiStats && (
                <div className="flex items-center gap-2 text-cyan-600">
                  <BarChart3 className="h-4 w-4" />
                  <span>{aiStats.scored}/{aiStats.totalProcessed} AI Scored</span>
                </div>
              )}
            </div>
          )}
          
          {/* Error Information */}
          {searchMetadata?.errors && searchMetadata.errors.length > 0 && (
            <div className="mt-2 text-sm text-orange-600">
              <span>Some sources unavailable: </span>
              {searchMetadata.errors.map((error: any, index: number) => (
                <span key={index}>
                  {error.source}{index < searchMetadata.errors.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <select className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          <option>Sort by Relevance</option>
          <option>Sort by AI Score</option>
          <option>Sort by Overall Score</option>
          <option>Sort by Experience</option>
          <option>Sort by Last Active</option>
        </select>
      </div>

      {/* AI Insights Dashboard */}
      {showAIInsights && isAIEnhanced && (
        <div className="mb-6">
          <AIInsightsDashboard
            enhancedQuery={enhancedQuery}
            aiStats={aiStats}
            searchMetadata={searchMetadata}
          />
        </div>
      )}
    </div>
  );
};
