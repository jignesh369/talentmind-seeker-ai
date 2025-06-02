
import React from 'react';
import { RefreshCw } from 'lucide-react';

interface SearchResultsHeaderProps {
  searchQuery: string;
  isSearching: boolean;
  candidateCount: number;
  retryCount: number;
  searchError?: any;
}

export const SearchResultsHeader = ({ 
  searchQuery, 
  isSearching, 
  candidateCount, 
  retryCount,
  searchError
}: SearchResultsHeaderProps) => {
  return (
    <div className="flex-1">
      <div className="flex items-center flex-wrap">
        <h2 className="text-xl font-semibold text-slate-900">
          {searchQuery ? 'AI-Enhanced Search Results' : 'All Candidates'}
        </h2>
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
      </div>
    </div>
  );
};
