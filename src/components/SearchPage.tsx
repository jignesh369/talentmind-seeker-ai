
import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilterPanel } from './FilterPanel';
import { CandidateCard } from './candidates/CandidateCard';
import { SearchResults } from './candidates/SearchResults';
import { useNewSearchEngine } from '@/hooks/useNewSearchEngine';

export const SearchPage = () => {
  const {
    searchQuery,
    searchResults,
    isSearching,
    searchMetadata,
    searchError,
    filters,
    setFilters,
    handleSearch,
    clearSearch,
    clearFilters
  } = useNewSearchEngine();

  const [inputValue, setInputValue] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      handleSearch(inputValue.trim());
    }
  };

  const handleFindMore = () => {
    if (searchQuery) {
      handleSearch(searchQuery);
    }
  };

  // Apply client-side filtering to search results
  const filteredResults = searchResults.filter(candidate => {
    // Score range filter
    const score = candidate.overall_score || candidate.confidence_score || 0;
    if (score < filters.minScore || score > filters.maxScore) return false;
    
    // Location filter
    if (filters.location && filters.location.trim() !== '') {
      const candidateLocation = candidate.location || '';
      const filterLocation = filters.location.toLowerCase().trim();
      if (!candidateLocation.toLowerCase().includes(filterLocation)) return false;
    }
    
    // Skills filter
    if (filters.skills && filters.skills.length > 0) {
      const candidateSkills = candidate.skills || [];
      const hasMatchingSkill = filters.skills.some(filterSkill => 
        candidateSkills.some((skill: string) => 
          skill.toLowerCase().includes(filterSkill.toLowerCase())
        )
      );
      if (!hasMatchingSkill) return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Find Tech Talent
          </h1>
          <p className="text-slate-600">
            Search across multiple platforms with real data collection
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search for developers (e.g., 'React developer in San Francisco', 'Python AI engineer')"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full"
                disabled={isSearching}
              />
            </div>
            <Button 
              type="submit" 
              disabled={isSearching || !inputValue.trim()}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
            {searchQuery && (
              <Button 
                type="button" 
                variant="outline"
                onClick={clearSearch}
                disabled={isSearching}
              >
                Clear
              </Button>
            )}
          </form>
        </div>

        {/* Filters Panel */}
        <FilterPanel 
          filters={filters} 
          setFilters={setFilters}
          onClearFilters={clearFilters}
          isSearchActive={!!searchQuery}
        />

        {/* Search Results */}
        {(searchQuery || searchResults.length > 0) && (
          <>
            <SearchResults
              searchQuery={searchQuery}
              isSearching={isSearching}
              candidateCount={filteredResults.length}
              searchMetadata={searchMetadata}
              searchError={searchError}
              onRetry={() => handleSearch(searchQuery)}
              onFindMore={handleFindMore}
            />

            {/* Results Grid */}
            {filteredResults.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredResults.map((candidate) => (
                  <CandidateCard 
                    key={candidate.id} 
                    candidate={candidate} 
                  />
                ))}
              </div>
            )}

            {/* No Results Message */}
            {searchQuery && !isSearching && filteredResults.length === 0 && !searchError && (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No candidates found
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Try adjusting your search query or filters, or use "Find More" to search external sources.
                  </p>
                  <Button onClick={handleFindMore} disabled={isSearching}>
                    Find More Candidates
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Welcome State */}
        {!searchQuery && searchResults.length === 0 && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-slate-400 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              Start Your Real Data Search
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto mb-8">
              Search for developers using natural language queries. Our AI will parse your requirements 
              and find real candidates across LinkedIn (via Apify), GitHub, StackOverflow, and Google with intelligent filtering.
            </p>
            <div className="space-y-2 text-sm text-slate-500">
              <p>Try searching for:</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {[
                  "React developer in San Francisco",
                  "Python AI engineer",
                  "Senior full-stack developer",
                  "DevOps engineer with AWS"
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => {
                      setInputValue(example);
                      handleSearch(example);
                    }}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
