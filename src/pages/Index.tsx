
import React from 'react';
import { ChatInterface } from '../components/ChatInterface';
import { FilterPanel } from '../components/FilterPanel';
import { StatsOverview } from '../components/StatsOverview';
import { DataCollectionDrawer } from '../components/DataCollectionDrawer';
import { Header } from '../components/layout/Header';
import { SearchResults } from '../components/candidates/SearchResults';
import { CandidatesList } from '../components/candidates/CandidatesList';
import { useCandidates } from '../hooks/useCandidates';
import { useAuth } from '../hooks/useAuth';
import { useSearch } from '../hooks/useSearch';
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
    retryCount,
    handleSearch, 
    clearSearch,
    retrySearch,
    findMoreCandidates
  } = useSearch();
  const { filters, setFilters, applyFilters } = useFilters();
  const { isFilterOpen, setIsFilterOpen, isDataCollectionOpen, setIsDataCollectionOpen } = useUIState();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  // Use search results if available, otherwise use all candidates
  const displayCandidates = searchResults.length > 0 ? searchResults : candidates;
  const filteredCandidates = applyFilters(displayCandidates);

  const handleDataCollected = async (): Promise<void> => {
    try {
      await refetch();
      // If we have an active search, refresh the search results
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header 
        user={user}
        onSignOut={handleSignOut}
        onToggleFilters={() => setIsFilterOpen(!isFilterOpen)}
        onOpenDataCollection={() => setIsDataCollectionOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsOverview totalCandidates={displayCandidates.length} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Left Sidebar - Chat Only */}
          <div className="lg:col-span-1">
            <ChatInterface onSearch={handleSearch} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <SearchResults 
              searchQuery={searchQuery}
              isSearching={isSearching}
              candidateCount={filteredCandidates.length}
              searchMetadata={searchMetadata}
              searchError={searchError}
              retryCount={retryCount}
              onRetry={retrySearch}
              onFindMore={findMoreCandidates}
            />

            {/* Filter Panel */}
            {isFilterOpen && (
              <div className="mb-6">
                <FilterPanel filters={filters} setFilters={setFilters} />
              </div>
            )}

            <CandidatesList 
              candidates={filteredCandidates}
              loading={loading}
              isSearching={isSearching}
              searchQuery={searchQuery}
              onClearSearch={clearSearch}
              onOpenDataCollection={() => setIsDataCollectionOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Data Collection Drawer */}
      <DataCollectionDrawer 
        isOpen={isDataCollectionOpen} 
        onClose={() => setIsDataCollectionOpen(false)}
        onDataCollected={handleDataCollected}
      />
    </div>
  );
};

export default Index;
