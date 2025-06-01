
import React from 'react';
import { Users } from 'lucide-react';
import { ModernCandidateCard } from './ModernCandidateCard';
import { Candidate } from '../hooks/useCandidates';

interface ModernCandidateGridProps {
  candidates: Candidate[];
  isLoading: boolean;
  searchQuery: string;
  onContact?: (candidate: Candidate) => void;
  onView?: (candidate: Candidate) => void;
}

export const ModernCandidateGrid: React.FC<ModernCandidateGridProps> = ({
  candidates,
  isLoading,
  searchQuery,
  onContact,
  onView
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Searching for talent</h3>
        <p className="text-gray-600">Analyzing profiles and finding the best matches...</p>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {searchQuery ? 'No developers found' : 'No developers available'}
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          {searchQuery 
            ? `We couldn't find developers matching "${searchQuery}". Try adjusting your search terms.`
            : 'Start by collecting developer data to discover amazing talent.'
          }
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Results Header */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {candidates.length} Developer{candidates.length !== 1 ? 's' : ''} Found
        </h2>
        {searchQuery && (
          <p className="text-gray-600">
            Results for <span className="font-medium">"{searchQuery}"</span>
          </p>
        )}
      </div>

      {/* Candidate Grid */}
      <div className="space-y-4">
        {candidates.map((candidate) => (
          <ModernCandidateCard 
            key={candidate.id} 
            candidate={candidate}
            onContact={onContact}
            onView={onView}
          />
        ))}
      </div>

      {/* Load More */}
      {candidates.length >= 10 && (
        <div className="text-center mt-12">
          <button className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            Load More Developers
          </button>
        </div>
      )}
    </div>
  );
};
