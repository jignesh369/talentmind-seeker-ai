
import React, { useState, useMemo } from 'react';
import { Search, Filter, Grid, List, SortAsc, Users, Eye, BarChart3 } from 'lucide-react';
import { ModernCandidateCard } from './ModernCandidateCard';
import { AdvancedInsightsDashboard } from './AdvancedInsightsDashboard';
import { Candidate } from '../hooks/useCandidates';

interface EnhancedDashboardProps {
  candidates: Candidate[];
  isLoading: boolean;
  searchQuery: string;
  onSearch: (query: string) => void;
}

export const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({
  candidates,
  isLoading,
  searchQuery,
  onSearch
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'score' | 'recent' | 'name'>('score');
  const [filterBy, setFilterBy] = useState<'all' | 'high-score' | 'contactable'>('all');
  const [showInsights, setShowInsights] = useState(false);

  const filteredAndSortedCandidates = useMemo(() => {
    let filtered = candidates;

    // Apply filters
    switch (filterBy) {
      case 'high-score':
        filtered = candidates.filter(c => c.overall_score >= 80);
        break;
      case 'contactable':
        filtered = candidates.filter(c => c.email);
        break;
      default:
        filtered = candidates;
    }

    // Apply sorting
    switch (sortBy) {
      case 'score':
        return [...filtered].sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
      case 'recent':
        return [...filtered].sort((a, b) => 
          new Date(b.last_active || b.created_at).getTime() - 
          new Date(a.last_active || a.created_at).getTime()
        );
      case 'name':
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return filtered;
    }
  }, [candidates, filterBy, sortBy]);

  const stats = useMemo(() => ({
    total: candidates.length,
    highScore: candidates.filter(c => c.overall_score >= 80).length,
    contactable: candidates.filter(c => c.email).length,
    recent: candidates.filter(c => {
      const lastActive = new Date(c.last_active || c.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return lastActive > thirtyDaysAgo;
    }).length
  }), [candidates]);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Talent Dashboard</h1>
            <p className="text-blue-100 mt-1">Discover and connect with top developers</p>
          </div>
          <button
            onClick={() => setShowInsights(!showInsights)}
            className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Insights</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/20 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          
          <div className="bg-white/20 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm font-medium">High Score</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.highScore}</p>
          </div>
          
          <div className="bg-white/20 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span className="text-sm font-medium">Contactable</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.contactable}</p>
          </div>
          
          <div className="bg-white/20 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">Recent</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.recent}</p>
          </div>
        </div>
      </div>

      {/* Insights Dashboard */}
      {showInsights && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Advanced Insights</h2>
            <button
              onClick={() => setShowInsights(false)}
              className="text-slate-500 hover:text-slate-700 text-xl"
            >
              ✕
            </button>
          </div>
          <AdvancedInsightsDashboard candidates={candidates} />
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search candidates by name, skills, location..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-3">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Candidates</option>
              <option value="high-score">High Score (80+)</option>
              <option value="contactable">Contactable</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="score">Sort by Score</option>
              <option value="recent">Sort by Recent</option>
              <option value="name">Sort by Name</option>
            </select>

            <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {searchQuery ? 'Search Results' : 'All Candidates'}
          </h3>
          <p className="text-slate-600">
            {isLoading ? 'Loading...' : `${filteredAndSortedCandidates.length} candidates found`}
            {searchQuery && (
              <span className="ml-2 text-blue-600">
                for "{searchQuery}"
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Discovering amazing talent...</p>
        </div>
      )}

      {/* Candidates Grid/List */}
      {!isLoading && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredAndSortedCandidates.length > 0 ? (
            filteredAndSortedCandidates.map((candidate) => (
              <ModernCandidateCard 
                key={candidate.id} 
                candidate={candidate}
                onContact={(c) => console.log('Contact:', c.name)}
                onSave={(c) => console.log('Save:', c.name)}
                onView={(c) => console.log('View:', c.name)}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-xl text-slate-600 mb-2">
                {searchQuery ? 'No candidates found matching your search.' : 'No candidates available.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => onSearch('')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear search and show all candidates
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
