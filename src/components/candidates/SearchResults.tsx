
import React from 'react';
import { SearchResultsHeader } from './SearchResultsHeader';
import { SearchResultsBadges } from './SearchResultsBadges';
import { SearchResultsMetadata } from './SearchResultsMetadata';
import { SearchResultsError } from './SearchResultsError';

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
          <div className="flex items-center flex-wrap">
            <SearchResultsHeader
              searchQuery={searchQuery}
              isSearching={isSearching}
              candidateCount={candidateCount}
              retryCount={retryCount}
              searchError={searchError}
            />
            <SearchResultsBadges searchMetadata={searchMetadata} />
          </div>
          
          <SearchResultsMetadata
            searchMetadata={searchMetadata}
            searchError={searchError}
          />
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
