
import React from 'react';
import { FilterPanel } from '../components/FilterPanel';
import { Header } from '../components/layout/Header';
import { CandidatesList } from '../components/candidates/CandidatesList';
import { ModernSearchInterface } from '../components/search/ModernSearchInterface';
import { LatestDataIndicator } from '../components/candidates/LatestDataIndicator';
import { EnhancedResultsHeader } from '../components/candidates/EnhancedResultsHeader';
import { useCandidates } from '../hooks/useCandidates';
import { useAuth } from '../hooks/useAuth';
import { useNewSearchEngine } from '../hooks/useNewSearchEngine';
import { useFilters } from '../hooks/useFilters';
import { useUIState } from '../hooks/useUIState';
import { useSorting, SortOption } from '../hooks/useSorting';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { candidates, loading, refetch } = useCandidates();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { 
    searchQuery, 
    searchResults, 
    isSearching, 
    searchMetadata, 
    searchError,
    enhancedQuery,
    aiStats,
    handleSearch, 
    clearSearch
  } = useNewSearchEngine();
  const { filters, setFilters, applyFilters } = useFilters();
  const { isFilterOpen, setIsFilterOpen } = useUIState();
  const { sortBy, setSortBy, sortCandidates } = useSorting();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const displayCandidates = searchResults.length > 0 ? searchResults : candidates;
  const filteredCandidates = applyFilters(displayCandidates);
  const sortedCandidates = sortCandidates(filteredCandidates);

  const handleDataCollected = async (): Promise<void> => {
    try {
      await refetch();
      if (searchQuery) {
        await handleSearch(searchQuery);
      }
      
      toast({
        title: "Data Collection Complete",
        description: "New high-quality candidates have been added to your database.",
      });
    } catch (error) {
      console.error('Error refreshing data after collection:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFindMore = async () => {
    if (!searchQuery) return;
    
    try {
      await handleSearch(searchQuery);
      toast({
        title: "Enhanced Search Expanded",
        description: "Searching for additional high-quality candidates",
      });
    } catch (error) {
      console.error('Error finding more candidates:', error);
      toast({
        title: "Search failed",
        description: "Unable to find more candidates at this time",
        variant: "destructive",
      });
    }
  };

  const handleClearFilter = (filterType: string) => {
    const newFilters = { ...filters };
    switch (filterType) {
      case 'score':
        newFilters.minScore = 0;
        newFilters.maxScore = 100;
        break;
      case 'location':
        newFilters.location = '';
        break;
      case 'skills':
        newFilters.skills = [];
        break;
      case 'lastActive':
        newFilters.lastActive = '';
        break;
    }
    setFilters(newFilters);
  };

  const handleClearAllFilters = () => {
    setFilters({
      minScore: 0,
      maxScore: 100,
      location: '',
      lastActive: '',
      skills: []
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header 
        user={user}
        onSignOut={handleSignOut}
        onToggleFilters={() => setIsFilterOpen(!isFilterOpen)}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Hero Search Interface with aligned stats */}
        <div className="mb-6">
          <ModernSearchInterface
            onSearch={handleSearch}
            isSearching={isSearching}
            searchQuery={searchQuery}
            onDataCollected={handleDataCollected}
          />
        </div>

        {/* Latest Data Indicator - prominently displayed */}
        <LatestDataIndicator
          searchMetadata={searchMetadata}
          aiStats={aiStats}
          isSearching={isSearching}
        />

        {/* Simplified Filter Panel */}
        {isFilterOpen && (
          <div className="mb-6">
            <FilterPanel filters={filters} setFilters={setFilters} />
          </div>
        )}

        {/* Enhanced Results Header */}
        <EnhancedResultsHeader
          searchQuery={searchQuery}
          candidateCount={sortedCandidates.length}
          isSearching={isSearching}
          searchMetadata={searchMetadata}
          enhancedQuery={enhancedQuery}
          filters={filters}
          onClearFilter={handleClearFilter}
          onClearAllFilters={handleClearAllFilters}
          onClearSearch={clearSearch}
          onFindMore={handleFindMore}
          onSortChange={setSortBy}
          currentSort={sortBy}
        />

        {/* Candidates List */}
        <div className="mt-6">
          <CandidatesList 
            candidates={sortedCandidates}
            loading={loading}
            searchQuery={searchQuery}
            currentSort={sortBy}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
