
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { Button } from '@/components/ui/button';

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

  const handleSearch = async (query: string, isRetry: boolean = false) => {
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
      console.log('🔍 Starting robust search with query:', query);
      
      // Call the improved search function with timeout
      const searchPromise = supabase.functions.invoke('search-candidates', {
        body: { query: query.trim(), user_id: user.id }
      });

      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Search request timed out')), 15000);
      });

      const searchResponse = await Promise.race([searchPromise, timeoutPromise]) as any;

      if (searchResponse.error) {
        console.error('❌ Search failed:', searchResponse.error);
        throw new Error(searchResponse.error.message || 'Search failed');
      }

      if (!searchResponse.data) {
        throw new Error('No data returned from search service');
      }

      const searchData = searchResponse.data;
      const candidates = searchData.candidates || [];
      
      setSearchResults(candidates);
      setSearchMetadata({
        search_strategies: searchData.search_strategies,
        fallback_used: searchData.fallback_used,
        parsed_criteria: searchData.parsed_criteria,
        total_results: searchData.total_results,
        query_validation: searchData.query_validation,
        service_status: searchData.service_status
      });
      
      // Success feedback with enhanced details
      const resultCount = candidates.length;
      let toastDescription = `Found ${resultCount} candidates`;
      
      if (searchData.fallback_used) {
        toastDescription += " (showing top candidates due to broad search criteria)";
      } else if (searchData.search_strategies) {
        const strategyCounts = Object.values(searchData.search_strategies)
          .map((s: any) => s.count)
          .filter(count => count > 0);
        
        if (strategyCounts.length > 1) {
          toastDescription += ` using ${strategyCounts.length} search strategies`;
        }
      }
      
      // Add quality indicator
      if (searchData.service_status === 'degraded') {
        toastDescription += " (search service running in degraded mode)";
      }
      
      toast({
        title: "Search completed",
        description: toastDescription,
      });

      console.log('✅ Robust search completed successfully:', {
        query,
        resultCount,
        strategies: searchData.search_strategies,
        fallbackUsed: searchData.fallback_used,
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

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchMetadata(null);
    setSearchError(null);
    setRetryCount(0);
  };

  const retrySearch = () => {
    if (searchQuery && searchError?.retryable) {
      handleSearch(searchQuery, true);
    }
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
    retrySearch
  };
};
