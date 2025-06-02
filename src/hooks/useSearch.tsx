
import { useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { Button } from '@/components/ui/button';
import { DatabaseSearchService, DatabaseSearchOptions } from '@/services/databaseSearchService';
import { DataCollectionService } from '@/services/dataCollectionService';

interface SearchError {
  type: 'validation' | 'network' | 'service' | 'unknown';
  message: string;
  retryable: boolean;
}

export const useSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState<any>(null);
  const [searchError, setSearchError] = useState<SearchError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
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

  const categorizeError = (error: any): SearchError => {
    const message = error.message || error.toString();
    
    if (message.includes('Invalid query') || message.includes('validation')) {
      return {
        type: 'validation',
        message: 'Please check your search terms and try again',
        retryable: false
      };
    }
    
    if (message.includes('timeout') || message.includes('network') || message.includes('fetch')) {
      return {
        type: 'network',
        message: 'Network connection issue. Please check your connection and try again',
        retryable: true
      };
    }
    
    if (message.includes('service') || message.includes('temporarily unavailable')) {
      return {
        type: 'service',
        message: 'Search service is temporarily unavailable. Please try again in a moment',
        retryable: true
      };
    }
    
    return {
      type: 'unknown',
      message: 'An unexpected error occurred. Please try again',
      retryable: true
    };
  };

  const handleSearch = async (query: string, isRetry: boolean = false): Promise<void> => {
    // Authentication check
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search candidates",
        variant: "destructive",
      });
      return;
    }

    // Input validation
    const validation = validateQuery(query);
    if (!validation.isValid) {
      const validationError: SearchError = {
        type: 'validation',
        message: validation.error || 'Invalid search query',
        retryable: false
      };
      
      setSearchError(validationError);
      toast({
        title: "Invalid search query",
        description: validationError.message,
        variant: "destructive",
      });
      return;
    }
    
    setSearchQuery(query);
    setIsSearching(true);
    setSearchMetadata(null);
    setSearchError(null);

    // Update retry count
    if (isRetry) {
      setRetryCount(prev => prev + 1);
    } else {
      setRetryCount(0);
    }

    try {
      console.log('🔍 Starting fast database search with query:', query);
      
      // Use database search service
      const searchOptions: DatabaseSearchOptions = {
        query: query.trim(),
        limit: 50
      };

      const searchResult = await DatabaseSearchService.hybridSearch(searchOptions);
      
      setSearchResults(searchResult.candidates);
      setSearchMetadata(searchResult.searchMetadata);
      
      // Success feedback
      const resultCount = searchResult.candidates.length;
      let toastDescription = `Found ${resultCount} candidates`;
      
      if (searchResult.searchMetadata.fallbackUsed) {
        toastDescription += " (showing existing candidates - try 'Find More' for comprehensive search)";
      }
      
      toast({
        title: "Search completed",
        description: toastDescription,
      });

      console.log('✅ Database search completed successfully:', {
        query,
        resultCount,
        processingTime: searchResult.searchMetadata.processingTime,
        retryCount
      });

      // Reset retry count on success
      setRetryCount(0);

    } catch (error: any) {
      console.error('❌ Search error:', error);
      
      const categorizedError = categorizeError(error);
      setSearchError(categorizedError);
      
      // Determine if we should auto-retry
      const shouldAutoRetry = categorizedError.retryable && 
                             retryCount < 2 && 
                             !isRetry &&
                             categorizedError.type === 'network';
      
      if (shouldAutoRetry) {
        console.log(`🔄 Auto-retrying search (attempt ${retryCount + 1})`);
        // Wait before retry with exponential backoff
        setTimeout(() => {
          handleSearch(query, true);
        }, 1000 * Math.pow(2, retryCount));
        return;
      }
      
      // Create retry action element if retryable
      const retryAction = categorizedError.retryable ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSearch(query, true)}
        >
          Retry
        </Button>
      ) : undefined;
      
      toast({
        title: "Search failed",
        description: categorizedError.message,
        variant: "destructive",
        action: retryAction
      });
      
      // Clear search results on error
      setSearchResults([]);
      setSearchMetadata(null);
    } finally {
      setIsSearching(false);
    }
  };

  const findMoreCandidates = async (): Promise<void> => {
    if (!searchQuery || !user) return;

    setIsSearching(true);
    
    try {
      console.log('🔍 Starting comprehensive data collection for:', searchQuery);
      
      // Use data collection service to find more candidates
      const collectionResult = await DataCollectionService.collectCandidates({
        query: searchQuery,
        sources: ['github', 'stackoverflow', 'linkedin'],
        timeBudget: 60 // 1 minute
      });

      // Combine existing search results with new data collection results
      // Note: The data collection service saves candidates to the database,
      // so we'll need to re-run the database search to get the updated results
      
      toast({
        title: "Data collection completed",
        description: `Found ${collectionResult.total_candidates} additional candidates`,
      });

      // Re-run database search to get updated results
      await handleSearch(searchQuery);
      
    } catch (error: any) {
      console.error('❌ Data collection error:', error);
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
    setRetryCount(0);
  };

  const retrySearch = (): Promise<void> => {
    if (searchQuery && searchError?.retryable) {
      return handleSearch(searchQuery, true);
    }
    return Promise.resolve();
  };

  return {
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
  };
};
