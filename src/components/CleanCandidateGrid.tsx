
import React from 'react';
import { Users } from 'lucide-react';
import { CleanCandidateCard } from './CleanCandidateCard';
import { Candidate } from '../hooks/useCandidates';

interface CleanCandidateGridProps {
  candidates: Candidate[];
  isLoading: boolean;
  searchQuery: string;
  onSearch: (query: string) => void;
  onContact?: (candidate: Candidate) => void;
  onSave?: (candidate: Candidate) => void;
  onView?: (candidate: Candidate) => void;
}

export const CleanCandidateGrid: React.FC<CleanCandidateGridProps> = ({
  candidates,
  isLoading,
  searchQuery,
  onSearch,
  onContact,
  onSave,
  onView
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-spin mx-auto mb-6"></div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Discovering Talent</h3>
        <p className="text-slate-600">Finding the best developers for you...</p>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          {searchQuery ? 'No developers found' : 'No developers available'}
        </h3>
        <p className="text-slate-600 mb-4">
          {searchQuery 
            ? `Try adjusting your search for "${searchQuery}" or browse all developers.`
            : 'Start by collecting data or try searching for specific skills.'
          }
        </p>
        {searchQuery && (
          <button
            onClick={() => onSearch('')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Show All Developers
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Results Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {searchQuery ? 'Search Results' : 'All Developers'}
            </h2>
            <p className="text-slate-600 mt-1">
              {candidates.length} developer{candidates.length !== 1 ? 's' : ''} found
              {searchQuery && (
                <span className="ml-2 text-blue-600 font-medium">
                  for "{searchQuery}"
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Candidate Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((candidate) => (
          <CleanCandidateCard 
            key={candidate.id} 
            candidate={candidate}
            onContact={onContact}
            onSave={onSave}
            onView={onView}
          />
        ))}
      </div>
    </div>
  );
};
