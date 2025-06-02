
import React from 'react';
import { CandidateCard } from '../CandidateCard';

interface CandidatesListProps {
  candidates: any[];
  loading: boolean;
  isSearching: boolean;
  searchQuery: string;
  onClearSearch: () => void;
}

export const CandidatesList = ({ 
  candidates, 
  loading, 
  isSearching, 
  searchQuery, 
  onClearSearch
}: CandidatesListProps) => {
  // Loading State
  if (loading || isSearching) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">{isSearching ? 'Searching candidates...' : 'Loading candidates...'}</p>
      </div>
    );
  }

  // Candidate Grid
  if (candidates.length > 0) {
    return (
      <div className="space-y-6">
        {candidates.map((candidate) => (
          <CandidateCard key={candidate.id} candidate={candidate} />
        ))}
      </div>
    );
  }

  // Empty State
  return (
    <div className="text-center py-8">
      <p className="text-slate-600">
        {searchQuery ? 'No candidates found matching your search criteria.' : 'No candidates available.'}
      </p>
      {searchQuery && (
        <button
          onClick={onClearSearch}
          className="mt-2 text-blue-600 hover:text-blue-700"
        >
          Show all candidates
        </button>
      )}
      {!searchQuery && candidates.length === 0 && (
        <div className="mt-4">
          <p className="text-sm text-slate-500 mb-4">
            Get started by collecting candidate data using the "Collect New Data" tab above.
          </p>
        </div>
      )}
    </div>
  );
};
