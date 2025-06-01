
import React, { useState } from 'react';
import { Search, MessageCircle, Filter, Users, TrendingUp, Zap } from 'lucide-react';
import { ChatInterface } from '../components/ChatInterface';
import { CandidateCard } from '../components/CandidateCard';
import { FilterPanel } from '../components/FilterPanel';
import { StatsOverview } from '../components/StatsOverview';
import { mockCandidates } from '../data/mockCandidates';

const Index = () => {
  const [candidates, setCandidates] = useState(mockCandidates);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    minScore: 0,
    maxScore: 100,
    location: '',
    lastActive: '',
    skills: []
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Simulate search with mock data
    console.log('Searching for:', query);
  };

  const filteredCandidates = candidates.filter(candidate => {
    if (filters.minScore && candidate.overallScore < filters.minScore) return false;
    if (filters.maxScore && candidate.overallScore > filters.maxScore) return false;
    if (filters.location && !candidate.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                TalentMind
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <StatsOverview totalCandidates={candidates.length} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Chat Interface */}
          <div className="lg:col-span-1">
            <ChatInterface onSearch={handleSearch} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Results Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Candidate Results
                </h2>
                <p className="text-slate-600 mt-1">
                  {filteredCandidates.length} candidates found
                </p>
              </div>
              <select className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option>Sort by Overall Score</option>
                <option>Sort by Experience</option>
                <option>Sort by Last Active</option>
              </select>
            </div>

            {/* Filter Panel */}
            {isFilterOpen && (
              <div className="mb-6">
                <FilterPanel filters={filters} setFilters={setFilters} />
              </div>
            )}

            {/* Candidate Grid */}
            <div className="space-y-6">
              {filteredCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
