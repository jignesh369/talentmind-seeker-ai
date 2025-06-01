
import React, { useState } from 'react';
import { LogOut, Database } from 'lucide-react';
import { ChatInterface } from '../components/ChatInterface';
import { FilterPanel } from '../components/FilterPanel';
import { DataCollectionDrawer } from '../components/DataCollectionDrawer';
import { DataEnrichmentPanel } from '../components/DataEnrichmentPanel';
import { EnhancedDashboard } from '../components/EnhancedDashboard';
import { useCandidates } from '../hooks/useCandidates';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { candidates, loading, refetch } = useCandidates();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDataCollectionOpen, setIsDataCollectionOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
        title: "Search completed",
        description: `Found ${data.total_results || 0} candidates matching your criteria.`,
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

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  // Use search results if available, otherwise use all candidates
  const displayCandidates = searchResults.length > 0 ? searchResults : candidates;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Modern Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  TalentMind
                </h1>
                <p className="text-xs text-slate-500">AI-Powered Talent Discovery</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsDataCollectionOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
              >
                <Database className="w-4 h-4" />
                <span>Collect Data</span>
              </button>
              
              <div className="flex items-center space-x-3 bg-slate-100 rounded-lg px-3 py-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-700">{user?.email}</span>
                <button
                  onClick={handleSignOut}
                  className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Data Enrichment Panel */}
        {candidates.length > 0 && (
          <div className="mb-8">
            <DataEnrichmentPanel 
              candidates={candidates} 
              onEnrichmentComplete={refetch}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Chat */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <ChatInterface onSearch={handleSearch} />
              
              {/* Filter Panel */}
              {isFilterOpen && (
                <div className="mt-6">
                  <FilterPanel filters={{}} setFilters={() => {}} />
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Enhanced Dashboard */}
          <div className="lg:col-span-3">
            <EnhancedDashboard
              candidates={displayCandidates}
              isLoading={loading || isSearching}
              searchQuery={searchQuery}
              onSearch={handleSearch}
            />
          </div>
        </div>
      </div>

      {/* Data Collection Drawer */}
      <DataCollectionDrawer 
        isOpen={isDataCollectionOpen} 
        onClose={() => setIsDataCollectionOpen(false)}
        onDataCollected={refetch}
      />
    </div>
  );
};

export default Index;
