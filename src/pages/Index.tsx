
import React, { useState } from 'react';
import { CleanLayout } from '../components/CleanLayout';
import { CleanCandidateGrid } from '../components/CleanCandidateGrid';
import { DataCollectionDrawer } from '../components/DataCollectionDrawer';
import { AdvancedInsightsDashboard } from '../components/AdvancedInsightsDashboard';
import { useCandidates } from '../hooks/useCandidates';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { candidates, loading, refetch } = useCandidates();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDataCollectionOpen, setIsDataCollectionOpen] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Enhanced filters state with new properties
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
        title: "AI Search Complete",
        description: `Found ${data.total_results || 0} candidates with advanced matching algorithms.`,
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

  // Use search results if available, otherwise use all candidates
  const displayCandidates = searchResults.length > 0 ? searchResults : candidates;

  return (
    <CleanLayout
      searchQuery={searchQuery}
      onSearch={handleSearch}
      isSearching={isSearching || loading}
      onDataCollection={() => setIsDataCollectionOpen(true)}
      onShowInsights={() => setShowInsights(!showInsights)}
      filters={filters}
      setFilters={setFilters}
    >
      {/* Insights Dashboard */}
      {showInsights && (
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200 mb-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">AI Analytics Dashboard</h2>
              <p className="text-slate-600 mt-1">Advanced insights and talent intelligence</p>
            </div>
            <button
              onClick={() => setShowInsights(false)}
              className="text-slate-500 hover:text-slate-700 text-2xl font-bold hover:bg-slate-100 rounded-lg p-2 transition-colors"
            >
              ✕
            </button>
          </div>
          <AdvancedInsightsDashboard candidates={candidates} />
        </div>
      )}

      {/* Main Candidate Grid */}
      <CleanCandidateGrid
        candidates={displayCandidates}
        isLoading={loading || isSearching}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onContact={(c) => console.log('Contact:', c.name)}
        onSave={(c) => console.log('Save:', c.name)}
        onView={(c) => console.log('View:', c.name)}
      />

      {/* Data Collection Drawer */}
      <DataCollectionDrawer 
        isOpen={isDataCollectionOpen} 
        onClose={() => setIsDataCollectionOpen(false)}
        onDataCollected={refetch}
      />
    </CleanLayout>
  );
};

export default Index;
