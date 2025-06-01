
import React, { useState, useEffect } from 'react';
import { Search, MessageCircle, Filter, Users, TrendingUp, Zap, LogOut } from 'lucide-react';
import { ChatInterface } from '../components/ChatInterface';
import { CandidateCard } from '../components/CandidateCard';
import { FilterPanel } from '../components/FilterPanel';
import { StatsOverview } from '../components/StatsOverview';
import { useCandidates } from '../hooks/useCandidates';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { candidates, loading, refetch } = useCandidates();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState({
    minScore: 0,
    maxScore: 100,
    location: '',
    lastActive: '',
    skills: []
  });

  const handleSearch = async (query: string) => {
    if (!user) return;
    
    setSearchQuery(query);
    setIsSearching(true);

    try {
      const { data, error } = await supabase.functions.invoke('search-candidates', {
        body: { query, user_id: user.id }
      });

      if (error) throw error;

      setSearchResults(data.candidates || []);
      
      toast({
        title: "Search completed",
        description: `Found ${data.total_results} candidates matching your criteria.`,
      });

    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: error.message || "Failed to search candidates",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  // Use search results if available, otherwise use all candidates
  const displayCandidates = searchResults.length > 0 ? searchResults : candidates;

  const filteredCandidates = displayCandidates.filter(candidate => {
    if (filters.minScore && candidate.overall_score < filters.minScore) return false;
    if (filters.maxScore && candidate.overall_score > filters.maxScore) return false;
    if (filters.location && !candidate.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;
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
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">Welcome, {user?.email}</span>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <StatsOverview totalCandidates={displayCandidates.length} />

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
                  {searchQuery ? 'Search Results' : 'All Candidates'}
                </h2>
                <p className="text-slate-600 mt-1">
                  {isSearching ? 'Searching...' : `${filteredCandidates.length} candidates found`}
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

            {/* Filter Panel */}
            {isFilterOpen && (
              <div className="mb-6">
                <FilterPanel filters={filters} setFilters={setFilters} />
              </div>
            )}

            {/* Loading State */}
            {(loading || isSearching) && (
              <div className="text-center py-8">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600">{isSearching ? 'Searching candidates...' : 'Loading candidates...'}</p>
              </div>
            )}

            {/* Candidate Grid */}
            {!loading && !isSearching && (
              <div className="space-y-6">
                {filteredCandidates.length > 0 ? (
                  filteredCandidates.map((candidate) => (
                    <CandidateCard key={candidate.id} candidate={candidate} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-600">
                      {searchQuery ? 'No candidates found matching your search criteria.' : 'No candidates available.'}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="mt-2 text-blue-600 hover:text-blue-700"
                      >
                        Show all candidates
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
