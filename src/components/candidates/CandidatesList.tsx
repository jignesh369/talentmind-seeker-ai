import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { EnhancedCandidateCard } from './EnhancedCandidateCard';

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
  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Loading candidates...</p>
      </div>
    );
  }

  if (!isSearching && candidates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">No candidates found.</p>
      </div>
    );
  }

  if (isSearching && candidates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">No candidates match your search criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {searchQuery ? 'Search Results' : 'All Candidates'}
          </h2>
          <span className="text-sm text-slate-600">
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
          </span>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearSearch}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear Search
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced candidate cards */}
      <div className="grid gap-4">
        {candidates.map((candidate) => (
          <EnhancedCandidateCard
            key={candidate.id}
            candidate={candidate}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </div>
  );
};
