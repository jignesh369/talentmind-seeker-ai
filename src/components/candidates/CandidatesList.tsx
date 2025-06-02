import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { EnhancedCandidateCard } from './EnhancedCandidateCard';
import { enhanceCandidatesBatch } from '../../utils/mockCandidateEnhancer';

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
  // Enhance candidates with additional data
  const enhancedCandidates = enhanceCandidatesBatch(candidates);

  const handleSave = (candidate: any) => {
    console.log('Save candidate:', candidate);
    // Implement save logic - could integrate with favorites/bookmarks
  };

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
    <div className="space-y-6">
      {/* Results header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {searchQuery ? 'Search Results' : 'All Candidates'}
            </h2>
            <p className="text-sm text-slate-600">
              {enhancedCandidates.length} candidate{enhancedCandidates.length !== 1 ? 's' : ''} found
            </p>
          </div>
          {searchQuery && (
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
              <span className="text-sm font-medium text-blue-700">
                Query: "{searchQuery}"
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSearch}
                className="h-6 w-6 p-0 hover:bg-blue-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced candidate cards */}
      <div className="space-y-6">
        {enhancedCandidates.map((candidate) => (
          <EnhancedCandidateCard
            key={candidate.id}
            candidate={candidate}
            searchQuery={searchQuery}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  );
};
