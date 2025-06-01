
import React from 'react';

interface SearchResultsProps {
  searchQuery: string;
  isSearching: boolean;
  candidateCount: number;
}

export const SearchResults = ({ searchQuery, isSearching, candidateCount }: SearchResultsProps) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          {searchQuery ? 'Search Results' : 'All Candidates'}
        </h2>
        <p className="text-slate-600 mt-1">
          {isSearching ? 'Searching...' : `${candidateCount} candidates found`}
          {searchQuery && (
            <span className="ml-2 text-blue-600">
              for "{searchQuery}"
            </span>
          )}
        </p>
      </div>
      <select className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
        <option>Sort by Overall Score</option>
        <option>Sort by Experience</option>
        <option>Sort by Last Active</option>
      </select>
    </div>
  );
};
