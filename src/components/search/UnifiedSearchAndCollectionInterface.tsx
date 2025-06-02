
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Search, Settings, Database, Plus, Zap } from 'lucide-react';
import { AdvancedSearchPanel } from './AdvancedSearchPanel';
import { useDataCollection } from '@/hooks/useDataCollection';

interface UnifiedSearchAndCollectionInterfaceProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
  searchQuery: string;
  onDataCollected: () => Promise<void>;
}

export const UnifiedSearchAndCollectionInterface = ({ 
  onSearch, 
  isSearching, 
  searchQuery,
  onDataCollected
}: UnifiedSearchAndCollectionInterfaceProps) => {
  const [activeTab, setActiveTab] = useState<'search' | 'collect'>('search');
  const [inputValue, setInputValue] = useState(searchQuery || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Data collection state
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [sources, setSources] = useState<string[]>(['github', 'stackoverflow', 'linkedin', 'google']);
  const { collectData, isCollecting, collectionResult, progress } = useDataCollection();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearch(inputValue.trim());
    }
  };

  const handleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const result = await collectData(query, location || undefined, sources);
    if (result) {
      await onDataCollected();
      setQuery("");
      setLocation("");
    }
  };

  const quickSearches = [
    'Senior React Developer',
    'Python AI Engineer', 
    'Full Stack JavaScript',
    'DevOps AWS Expert',
    'Data Scientist ML'
  ];

  const sourceOptions = [
    { id: 'github', label: 'GitHub' },
    { id: 'stackoverflow', label: 'Stack Overflow' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'google', label: 'Google Search' },
    { id: 'kaggle', label: 'Kaggle' },
    { id: 'devto', label: 'Dev.to' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">AI-Powered Talent Search</h3>
            <p className="text-sm text-slate-600">Search existing or collect new candidates</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'search' | 'collect')}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Existing
          </TabsTrigger>
          <TabsTrigger value="collect" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Collect New Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="e.g., 'Senior React Developer in SF' or 'Python AI Engineer'"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1"
                disabled={isSearching}
              />
              <Button 
                type="submit" 
                disabled={isSearching || !inputValue.trim()}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdvanced(true)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Advanced
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-slate-600 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Quick searches:
            </span>
            {quickSearches.map((quick) => (
              <button
                key={quick}
                onClick={() => {
                  setInputValue(quick);
                  onSearch(quick);
                }}
                className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                disabled={isSearching}
              >
                {quick}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="collect" className="space-y-4">
          <form onSubmit={handleCollectionSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="query">Search Query</Label>
              <Input
                id="query"
                placeholder="e.g., React developer, Machine learning engineer"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isCollecting}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                placeholder="e.g., San Francisco, Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isCollecting}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Sources to Search</Label>
              <div className="grid grid-cols-2 gap-2">
                {sourceOptions.map((source) => (
                  <label key={source.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={sources.includes(source.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSources([...sources, source.id]);
                        } else {
                          setSources(sources.filter(s => s !== source.id));
                        }
                      }}
                      disabled={isCollecting}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{source.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {isCollecting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Collecting data...</span>
                  <span>⚡ Time-budget optimized</span>
                </div>
                <Progress value={33} className="w-full" />
                {progress && (
                  <p className="text-sm text-gray-600">{progress}</p>
                )}
              </div>
            )}
            
            <Button 
              type="submit" 
              disabled={isCollecting || !query.trim() || sources.length === 0}
              className="w-full"
            >
              {isCollecting ? "Collecting..." : "Start Collection"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <AdvancedSearchPanel
        isOpen={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        onSearch={onSearch}
        currentQuery={inputValue}
      />
    </div>
  );
};
