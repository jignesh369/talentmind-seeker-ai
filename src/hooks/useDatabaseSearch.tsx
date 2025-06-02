
import { useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { DatabaseSearchService } from '@/services/databaseSearchService';

interface DatabaseSearchMetadata {
  totalCandidatesInDb: number;
  searchTime: number;
  queryInterpretation: string;
  matchedFields: string[];
  lastCollectionDate?: string;
}

export const useDatabaseSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState<DatabaseSearchMetadata | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleDatabaseSearch = async (query: string): Promise<void> => {
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
        title: "Invalid search",
        description: "Please enter at least 2 characters",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchQuery(query);
    
    try {
      console.log('🔍 Starting database-only search for:', query);
      
      const startTime = Date.now();
      const result = await DatabaseSearchService.searchCandidates({
        query: query.trim(),
        limit: 100
      });
      
      const searchTime = Date.now() - startTime;
      
      console.log('✅ Database search results:', {
        candidatesFound: result.candidates.length,
        searchTime: searchTime + 'ms',
        totalInDb: result.total
      });
      
      setSearchResults(result.candidates);
      
      // Create enhanced metadata for database search
      const metadata: DatabaseSearchMetadata = {
        totalCandidatesInDb: result.total,
        searchTime,
        queryInterpretation: result.searchMetadata.query,
        matchedFields: ['name', 'title', 'summary', 'skills'], // Fields searched
        lastCollectionDate: new Date().toISOString() // Could be fetched from DB
      };
      
      setSearchMetadata(metadata);

      if (result.candidates.length > 0) {
        toast({
          title: "Database search complete",
          description: `Found ${result.candidates.length} candidates in ${searchTime}ms`,
        });
      } else {
        toast({
          title: "No results found",
          description: "Try adjusting your search terms or collect new data",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('❌ Database search failed:', error);
      setSearchError(error.message || 'Database search failed');
      
      toast({
        title: "Search failed",
        description: "Unable to search existing candidates. Please try again.",
        variant: "destructive",
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

  return {
    searchQuery,
    searchResults,
    isSearching,
    searchMetadata,
    searchError,
    handleDatabaseSearch,
    clearSearch
  };
};
