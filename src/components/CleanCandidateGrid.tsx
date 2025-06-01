
import React from 'react';
import { Users } from 'lucide-react';
import { EnhancedCandidateCard } from './EnhancedCandidateCard';
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
      <div className="text-center py-20">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-slate-300 rounded-full animate-spin"></div>
          <div className="absolute inset-2 bg-white rounded-full"></div>
          <div className="absolute inset-4 bg-slate-600 rounded-full"></div>
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-3">AI Talent Discovery in Progress</h3>
        <p className="text-slate-600 text-lg">Analyzing profiles and matching the perfect candidates...</p>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <Users className="w-12 h-12 text-slate-400" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-3">
          {searchQuery ? 'No matching developers found' : 'No developers in database'}
        </h3>
        <p className="text-slate-600 text-lg mb-6">
          {searchQuery 
            ? `We couldn't find developers matching "${searchQuery}". Try adjusting your search terms or explore our full talent pool.`
            : 'Start by collecting developer data or browse available profiles to discover amazing talent.'
          }
        </p>
        {searchQuery && (
          <button
            onClick={() => onSearch('')}
            className="px-8 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-semibold text-lg shadow-lg hover:shadow-xl"
          >
            Explore All Developers
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Results Header */}
      <div className="mb-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {searchQuery ? 'Search Results' : 'Discovered Talent'}
          </h2>
          <p className="text-slate-600 text-lg">
            Found <span className="font-bold text-slate-900">{candidates.length}</span> exceptional developer{candidates.length !== 1 ? 's' : ''}
            {searchQuery && (
              <span className="ml-2">
                matching <span className="font-semibold text-slate-700">"{searchQuery}"</span>
              </span>
            )}
          </p>
          {candidates.length > 0 && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-slate-500 rounded-full mr-2 animate-pulse"></div>
              AI-ranked by relevance and compatibility
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Candidate Cards - Single Column */}
      <div className="space-y-4">
        {candidates.map((candidate) => (
          <EnhancedCandidateCard 
            key={candidate.id} 
            candidate={candidate}
            onContact={onContact}
            onSave={onSave}
            onView={onView}
          />
        ))}
      </div>

      {/* Load More Section */}
      {candidates.length >= 10 && (
        <div className="text-center mt-12">
          <button className="px-8 py-4 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all font-semibold">
            Load More Candidates
          </button>
        </div>
      )}
    </div>
  );
};
