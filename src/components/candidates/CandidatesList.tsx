
import React from 'react';
import { EnhancedCandidateCard } from './EnhancedCandidateCard';
import { enhanceCandidatesBatch } from '../../utils/mockCandidateEnhancer';
import { useSorting } from '../../hooks/useSorting';

interface CandidatesListProps {
  candidates: any[];
  loading: boolean;
  searchQuery?: string;
  currentSort?: any;
}

export const CandidatesList = ({ 
  candidates, 
  loading,
  searchQuery,
  currentSort
}: CandidatesListProps) => {
  const { sortCandidates } = useSorting();
  
  // Enhance and sort candidates
  const enhancedCandidates = enhanceCandidatesBatch(candidates);
  const sortedCandidates = currentSort ? sortCandidates(enhancedCandidates) : enhancedCandidates;

  const handleSave = (candidate: any) => {
    console.log('Save candidate:', candidate);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Loading candidates...</p>
      </div>
    );
  }

  if (sortedCandidates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">
          {searchQuery ? 'No candidates match your search criteria.' : 'No candidates found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedCandidates.map((candidate) => (
        <EnhancedCandidateCard
          key={candidate.id}
          candidate={candidate}
          searchQuery={searchQuery}
          onSave={handleSave}
        />
      ))}
    </div>
  );
};
