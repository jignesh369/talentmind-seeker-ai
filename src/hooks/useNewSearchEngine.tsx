
import { useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { Button } from '@/components/ui/button';
import { newDataCollectionService } from '@/services/NewDataCollectionService';

interface SearchFilters {
  minScore: number;
  maxScore: number;
  location: string;
  lastActive: string;
  skills: string[];
}

export const useNewSearchEngine = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState<any>(null);
  const [searchError, setSearchError] = useState<any>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    minScore: 0,
    maxScore: 100,
    location: '',
    lastActive: '',
    skills: []
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSearch = async (query: string): Promise<void> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search candidates",
        variant: "destructive",
      });
      return;
    }

    if (!query || query.trim().length < 2) {
      toast({
        title: "Invalid search query",
        description: "Search query must be at least 2 characters",
        variant: "destructive",
      });
      return;
    }
    
    setSearchQuery(query);
    setIsSearching(true);
    setSearchMetadata(null);
    setSearchError(null);

    try {
      console.log('🔍 Starting new search engine search:', {
        query,
        filters
      });
      
      const searchResult = await newDataCollectionService.searchCandidates({
        query: query.trim(),
        location: filters.location.trim() || undefined,
        filters: {
          minScore: filters.minScore,
          maxScore: filters.maxScore,
          skills: filters.skills,
          lastActiveDays: filters.lastActive ? parseInt(filters.lastActive) : undefined,
        },
        sources: ['linkedin', 'github', 'stackoverflow', 'google'],
        limit: 50
      });
      
      setSearchResults(searchResult.candidates);
      setSearchMetadata(searchResult.metadata);
      
      const resultCount = searchResult.candidates.length;
      let toastDescription = `Found ${resultCount} real candidates`;
      
      if (filters.location) {
        toastDescription += ` in ${filters.location}`;
      }
      
      toast({
        title: "Search completed",
        description: toastDescription,
      });

      console.log('✅ New search engine completed:', {
        query,
        candidates: searchResult.candidates.length,
        sources: searchResult.metadata.sourcesUsed,
        processingTime: searchResult.metadata.processingTime
      });

    } catch (error: any) {
      console.error('❌ New search engine error:', error);
      
      setSearchError({
        type: 'service',
        message: error.message || 'Search failed. Please try again.',
        retryable: true
      });
      
      toast({
        title: "Search failed",
        description: error.message || 'Search failed. Please try again.',
        variant: "destructive",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSearch(query)}
          >
            Retry
          </Button>
        )
      });
      
      setSearchResults([]);
      setSearchMetadata(null);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchMetadata(null);
    setSearchError(null);
  };

  const clearFilters = () => {
    setFilters({
      minScore: 0,
      maxScore: 100,
      location: '',
      lastActive: '',
      skills: []
    });
  };

  return {
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
  };
};
