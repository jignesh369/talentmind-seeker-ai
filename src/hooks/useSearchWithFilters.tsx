
import { useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { Button } from '@/components/ui/button';
import { EnhancedDatabaseSearchService } from '@/services/enhancedDatabaseSearchService';
import { DataCollectionService } from '@/services/dataCollectionService';

interface SearchFilters {
  minScore: number;
  maxScore: number;
  location: string;
  lastActive: string;
  skills: string[];
}

interface SearchError {
  type: 'validation' | 'network' | 'service' | 'unknown';
  message: string;
  retryable: boolean;
}

export const useSearchWithFilters = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState<any>(null);
  const [searchError, setSearchError] = useState<SearchError | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    minScore: 0,
    maxScore: 100,
    location: '',
    lastActive: '',
    skills: []
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const validateQuery = (query: string): { isValid: boolean; error?: string } => {
    if (!query || typeof query !== 'string') {
      return { isValid: false, error: 'Query cannot be empty' };
    }
    
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return { isValid: false, error: 'Search query must be at least 2 characters' };
    }
    
    if (trimmed.length > 500) {
      return { isValid: false, error: 'Search query is too long (max 500 characters)' };
    }
    
    return { isValid: true };
  };

  const applyFilters = (candidates: any[]): any[] => {
    if (!candidates || candidates.length === 0) return [];

    return candidates.filter(candidate => {
      // Score range filter
      const score = candidate.overall_score || candidate.composite_score || 0;
      if (score < filters.minScore || score > filters.maxScore) return false;
      
      // Location filter - enhanced matching
      if (filters.location && filters.location.trim() !== '') {
        const candidateLocation = candidate.location || '';
        const filterLocation = filters.location.toLowerCase().trim();
        const candidateLocationLower = candidateLocation.toLowerCase();
        
        // Check for exact match, partial match, or country match
        if (!candidateLocationLower.includes(filterLocation)) {
          // Check for country-city relationships
          const locationMappings = {
            'india': ['hyderabad', 'bangalore', 'mumbai', 'delhi', 'pune', 'chennai'],
            'usa': ['new york', 'san francisco', 'seattle', 'austin', 'boston'],
            'uk': ['london', 'manchester', 'edinburgh', 'birmingham'],
            'canada': ['toronto', 'vancouver', 'montreal', 'ottawa']
          };
          
          let matches = false;
          for (const [country, cities] of Object.entries(locationMappings)) {
            if (filterLocation === country && cities.some(city => candidateLocationLower.includes(city))) {
              matches = true;
              break;
            }
            if (cities.includes(filterLocation) && candidateLocationLower.includes(country)) {
              matches = true;
              break;
            }
          }
          
          if (!matches) return false;
        }
      }
      
      // Skills filter
      if (filters.skills && filters.skills.length > 0) {
        const candidateSkills = candidate.skills || [];
        const hasMatchingSkill = filters.skills.some(filterSkill => 
          candidateSkills.some((candidateSkill: string) => 
            candidateSkill.toLowerCase().includes(filterSkill.toLowerCase().trim())
          )
        );
        if (!hasMatchingSkill) return false;
      }
      
      // Last active filter
      if (filters.lastActive && filters.lastActive !== '') {
        const daysAgo = parseInt(filters.lastActive);
        if (candidate.last_active) {
          const lastActiveDate = new Date(candidate.last_active);
          const daysSinceActive = Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceActive > daysAgo) return false;
        }
      }
      
      return true;
    });
  };

  const handleSearchWithFilters = async (query: string): Promise<void> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search candidates",
        variant: "destructive",
      });
      return;
    }

    const validation = validateQuery(query);
    if (!validation.isValid) {
      setSearchError({
        type: 'validation',
        message: validation.error || 'Invalid search query',
        retryable: false
      });
      toast({
        title: "Invalid search query",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }
    
    setSearchQuery(query);
    setIsSearching(true);
    setSearchMetadata(null);
    setSearchError(null);

    try {
      console.log('🔍 Starting enhanced database search with filters:', {
        query,
        filters
      });
      
      // Use enhanced database search with filters
      const searchResult = await EnhancedDatabaseSearchService.searchCandidatesWithFilters({
        query: query.trim(),
        location: filters.location.trim() || undefined,
        minScore: filters.minScore,
        maxScore: filters.maxScore,
        skills: filters.skills,
        lastActiveDays: filters.lastActive ? parseInt(filters.lastActive) : undefined,
        limit: 50,
        includeQueryParsing: true
      });
      
      // Apply additional client-side filtering for edge cases
      const filteredResults = applyFilters(searchResult.candidates);
      
      setSearchResults(filteredResults);
      setSearchMetadata({
        ...searchResult.searchMetadata,
        filtersApplied: true,
        originalCount: searchResult.candidates.length,
        filteredCount: filteredResults.length
      });
      
      // Enhanced success feedback
      const resultCount = filteredResults.length;
      let toastDescription = `Found ${resultCount} candidates`;
      
      if (filters.location) {
        toastDescription += ` in ${filters.location}`;
      }
      
      if (resultCount < 5) {
        toastDescription += " - try 'Find More' for comprehensive search";
      }
      
      toast({
        title: "Search completed",
        description: toastDescription,
      });

      console.log('✅ Enhanced search with filters completed:', {
        query,
        originalResults: searchResult.candidates.length,
        filteredResults: filteredResults.length,
        filters
      });

    } catch (error: any) {
      console.error('❌ Enhanced search with filters error:', error);
      
      setSearchError({
        type: 'service',
        message: 'Search failed. Please try again.',
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
            onClick={() => handleSearchWithFilters(query)}
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

  const findMoreCandidatesWithFilters = async (): Promise<void> => {
    if (!searchQuery || !user) return;

    setIsSearching(true);
    
    try {
      console.log('🔍 Starting comprehensive data collection with filters:', {
        query: searchQuery,
        location: filters.location
      });
      
      // Use data collection service with location filter
      const collectionResult = await DataCollectionService.collectCandidates({
        query: searchQuery,
        location: filters.location.trim() || undefined,
        sources: ['github', 'stackoverflow', 'linkedin', 'google'],
        timeBudget: 60
      });

      toast({
        title: "Data collection completed",
        description: `Found ${collectionResult.total_candidates} additional candidates${filters.location ? ` in ${filters.location}` : ''}`,
      });

      // Re-run search with filters to get updated results
      await handleSearchWithFilters(searchQuery);
      
    } catch (error: any) {
      console.error('❌ Data collection with filters error:', error);
      toast({
        title: "Data collection failed",
        description: "Unable to find more candidates at this time",
        variant: "destructive",
      });
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
    handleSearchWithFilters,
    findMoreCandidatesWithFilters,
    clearSearch,
    clearFilters,
    applyFilters
  };
};
