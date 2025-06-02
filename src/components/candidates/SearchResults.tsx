
import React from 'react';
import { SearchResultsHeader } from './SearchResultsHeader';
import { SearchResultsBadges } from './SearchResultsBadges';
import { SearchResultsMetadata } from './SearchResultsMetadata';
import { SearchResultsError } from './SearchResultsError';
import { Button } from '@/components/ui/button';
import { Search, Database } from 'lucide-react';

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
}

export const SearchResults = ({ 
  searchQuery, 
  isSearching, 
  candidateCount, 
  searchMetadata,
  searchError,
  retryCount = 0,
  onRetry,
  onFindMore
}: SearchResultsProps) => {
  const showFindMore = searchQuery && !isSearching && candidateCount < 20 && !searchError;
  
  return (
    <div className="mb-6">
      <SearchResultsError
        searchError={searchError}
        retryCount={retryCount}
        isSearching={isSearching}
        onRetry={onRetry}
      />
      
      <div className="flex justify-between items-start">
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
            
            <SearchResultsBadges searchMetadata={searchMetadata} />
          </div>
          
          <SearchResultsMetadata
            searchMetadata={searchMetadata}
            searchError={searchError}
          />
          
          {searchMetadata?.searchType === 'database' && (
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
              <Database className="h-4 w-4" />
              <span>Fast search from existing candidates</span>
              {searchMetadata.processingTime && (
                <span className="text-slate-400">
                  • {searchMetadata.processingTime}ms
                </span>
              )}
            </div>
          )}
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
