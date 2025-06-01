
import React, { useState } from 'react';
import { ModernLayout } from '../components/ModernLayout';
import { ModernCandidateGrid } from '../components/ModernCandidateGrid';
import { ModernFilters } from '../components/ModernFilters';
import { DataCollectionDrawer } from '../components/DataCollectionDrawer';
import { useCandidates } from '../hooks/useCandidates';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { candidates, loading, refetch } = useCandidates();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDataCollectionOpen, setIsDataCollectionOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [filters, setFilters] = useState({
    minScore: 0,
    maxScore: 100,
    location: '',
    experience: '',
    availability: '',
    skills: [] as string[]
  });

  const handleSearch = async (query: string) => {
    if (!user) return;
    
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);

    try {
      const { data, error } = await supabase.functions.invoke('enhanced-search-candidates', {
        body: { query, user_id: user.id }
      });

      if (error) throw error;

      setSearchResults(data.candidates || []);
      
      toast({
        title: "Search complete",
        description: `Found ${data.total_results || 0} matching developers.`,
      });

    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: error.message || "Failed to search candidates",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const displayCandidates = searchResults.length > 0 ? searchResults : candidates;

  return (
    <ModernLayout
      searchQuery={searchQuery}
      onSearch={handleSearch}
      isSearching={isSearching || loading}
      onShowFilters={() => setShowFilters(true)}
      showFilters={showFilters}
    >
      <ModernCandidateGrid
        candidates={displayCandidates}
        isLoading={loading || isSearching}
        searchQuery={searchQuery}
        onContact={(c) => console.log('Contact:', c.name)}
        onView={(c) => console.log('View:', c.name)}
      />

      <ModernFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={setFilters}
      />

      <DataCollectionDrawer 
        isOpen={isDataCollectionOpen} 
        onClose={() => setIsDataCollectionOpen(false)}
        onDataCollected={refetch}
      />
    </ModernLayout>
  );
};

export default Index;
