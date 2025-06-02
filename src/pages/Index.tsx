
import React from 'react';
import { FilterPanel } from '../components/FilterPanel';
import { StatsOverview } from '../components/StatsOverview';
import { Header } from '../components/layout/Header';
import { SimplifiedSearchResults } from '../components/candidates/SimplifiedSearchResults';
import { CandidatesList } from '../components/candidates/CandidatesList';
import { UnifiedSearchAndCollectionInterface } from '../components/search/UnifiedSearchAndCollectionInterface';
import { useCandidates } from '../hooks/useCandidates';
import { useAuth } from '../hooks/useAuth';
import { useNewSearchEngine } from '../hooks/useNewSearchEngine';
import { useFilters } from '../hooks/useFilters';
import { useUIState } from '../hooks/useUIState';
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

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const displayCandidates = searchResults.length > 0 ? searchResults : candidates;
  const filteredCandidates = applyFilters(displayCandidates);

  const handleDataCollected = async (): Promise<void> => {
    try {
      await refetch();
      if (searchQuery) {
        await handleSearch(searchQuery);
      }
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
        title: "AI-Enhanced Search Expanded",
        description: "Searching for additional candidates with AI intelligence",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header 
        user={user}
        onSignOut={handleSignOut}
        onToggleFilters={() => setIsFilterOpen(!isFilterOpen)}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsOverview totalCandidates={displayCandidates.length} />

        {/* Unified Search and Collection Interface */}
        <div className="mt-8 mb-6">
          <UnifiedSearchAndCollectionInterface
            onSearch={handleSearch}
            isSearching={isSearching}
            searchQuery={searchQuery}
            onDataCollected={handleDataCollected}
          />
        </div>

        {/* Simplified Filter Panel */}
        {isFilterOpen && (
          <div className="mb-6">
            <FilterPanel filters={filters} setFilters={setFilters} />
          </div>
        )}

        {/* Simplified Search Results */}
        <SimplifiedSearchResults 
          searchQuery={searchQuery}
          isSearching={isSearching}
          candidateCount={filteredCandidates.length}
          searchMetadata={searchMetadata}
          searchError={searchError}
          onRetry={() => handleSearch(searchQuery)}
          onFindMore={handleFindMore}
          enhancedQuery={enhancedQuery}
          aiStats={aiStats}
        />

        {/* Candidates List */}
        <CandidatesList 
          candidates={filteredCandidates}
          loading={loading}
          isSearching={isSearching}
          searchQuery={searchQuery}
          onClearSearch={clearSearch}
        />
      </div>
    </div>
  );
};

export default Index;
