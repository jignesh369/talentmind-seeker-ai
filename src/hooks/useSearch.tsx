
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSearch = async (query: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search candidates",
        variant: "destructive",
      });
      return;
    }
    
    setSearchQuery(query);
    setIsSearching(true);
    setSearchMetadata(null);

    try {
      console.log('Starting enhanced search with query:', query);
      
      // Use the improved search-candidates function
      const searchResponse = await supabase.functions.invoke('search-candidates', {
        body: { query, user_id: user.id }
      });

      if (searchResponse.error) {
        console.error('Search failed:', searchResponse.error);
        throw new Error(searchResponse.error.message || 'Search failed');
      }

      if (!searchResponse.data) {
        throw new Error('No data returned from search');
      }

      const searchData = searchResponse.data;
      const candidates = searchData.candidates || [];
      
      setSearchResults(candidates);
      setSearchMetadata({
        search_strategies: searchData.search_strategies,
        fallback_used: searchData.fallback_used,
        parsed_criteria: searchData.parsed_criteria,
        total_results: searchData.total_results
      });
      
      // Provide detailed feedback to user
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
      
      toast({
        title: "Search completed",
        description: toastDescription,
      });

      console.log('Enhanced search completed successfully:', {
        query,
        resultCount,
        strategies: searchData.search_strategies,
        fallbackUsed: searchData.fallback_used
      });

    } catch (error: any) {
      console.error('Search error:', error);
      
      let errorMessage = "Failed to search candidates";
      if (error.message?.includes('timeout')) {
        errorMessage = "Search request timed out. Please try a simpler query.";
      } else if (error.message?.includes('network')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Search failed",
        description: errorMessage,
        variant: "destructive",
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
  };

  return {
    searchQuery,
    searchResults,
    isSearching,
    searchMetadata,
    handleSearch,
    clearSearch
  };
};
