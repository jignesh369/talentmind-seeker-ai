
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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

    try {
      console.log('Starting search with query:', query);
      
      // Try enhanced search first, fall back to basic search if it fails
      let searchResponse;
      
      try {
        searchResponse = await supabase.functions.invoke('enhanced-search-candidates', {
          body: { query, user_id: user.id }
        });
        
        if (searchResponse.error) {
          console.warn('Enhanced search failed, trying basic search:', searchResponse.error);
          throw new Error('Enhanced search failed');
        }
      } catch (enhancedError) {
        console.log('Enhanced search failed, falling back to basic search');
        
        // Fallback to basic search
        searchResponse = await supabase.functions.invoke('search-candidates', {
          body: { query, user_id: user.id }
        });
      }

      if (searchResponse.error) {
        console.error('Both search methods failed:', searchResponse.error);
        throw new Error(searchResponse.error.message || 'All search methods failed');
      }

      if (!searchResponse.data) {
        throw new Error('No data returned from search');
      }

      const searchData = searchResponse.data;
      setSearchResults(searchData.candidates || []);
      
      const resultCount = searchData.total_results || searchData.candidates?.length || 0;
      
      toast({
        title: "Search completed",
        description: `Found ${resultCount} candidates matching your search criteria.`,
      });

      console.log('Search completed successfully:', {
        query,
        resultCount,
        searchType: searchData.fallback_used ? 'basic' : 'enhanced'
      });

    } catch (error: any) {
      console.error('Search error:', error);
      
      let errorMessage = "Failed to search candidates";
      if (error.message?.includes('Edge Function')) {
        errorMessage = "Search service is currently unavailable. Please try again later.";
      } else if (error.message?.includes('timeout')) {
        errorMessage = "Search request timed out. Please try a simpler query.";
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
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  return {
    searchQuery,
    searchResults,
    isSearching,
    handleSearch,
    clearSearch
  };
};
