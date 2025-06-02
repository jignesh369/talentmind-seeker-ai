
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Search, Plus, Settings, X, Zap } from 'lucide-react';

interface UnifiedSearchBarProps {
  // Search props
  searchValue: string;
  setSearchValue: (value: string) => void;
  onSearch: (query: string) => void;
  onDatabaseSearch: (query: string) => void;
  isSearching: boolean;
  isDbSearching: boolean;
  onShowAdvanced: () => void;

  // Collection props
  query: string;
  setQuery: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  sources: string[];
  setSources: (sources: string[]) => void;
  isCollecting: boolean;
  availableSources: string[];
  recommendedSources: string[];
  onCollectionSubmit: (e: React.FormEvent) => void;
}

const sourceOptions = [
  { id: 'github', label: 'GitHub', color: 'bg-gray-100 text-gray-800' },
  { id: 'stackoverflow', label: 'Stack Overflow', color: 'bg-orange-100 text-orange-800' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-blue-100 text-blue-800' },
  { id: 'google', label: 'Google', color: 'bg-green-100 text-green-800' }
];

export const UnifiedSearchBar = ({
  searchValue,
  setSearchValue,
  onSearch,
  onDatabaseSearch,
  isSearching,
  isDbSearching,
  onShowAdvanced,
  query,
  setQuery,
  location,
  setLocation,
  sources,
  setSources,
  isCollecting,
  availableSources,
  recommendedSources,
  onCollectionSubmit
}: UnifiedSearchBarProps) => {
  const [mode, setMode] = useState<'search' | 'collect'>('search');

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    
    await onDatabaseSearch(searchValue.trim());
    onSearch(searchValue.trim());
  };

  const toggleSource = (sourceId: string) => {
    if (sources.includes(sourceId)) {
      setSources(sources.filter(s => s !== sourceId));
    } else {
      setSources([...sources, sourceId]);
    }
  };

  const addRecommended = () => {
    const newSources = [...new Set([...sources, ...recommendedSources])];
    setSources(newSources);
  };

  const isLoading = mode === 'search' ? (isSearching || isDbSearching) : isCollecting;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Toggle
            pressed={mode === 'collect'}
            onPressedChange={(pressed) => setMode(pressed ? 'collect' : 'search')}
            className="data-[state=on]:bg-green-100 data-[state=on]:text-green-800"
          >
            {mode === 'search' ? (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search Existing
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Collect New Data
              </>
            )}
          </Toggle>
          
          <div className="text-sm text-slate-600">
            {mode === 'search' 
              ? 'Search your existing candidate database' 
              : 'Collect new candidates from external sources'
            }
          </div>
        </div>

        {mode === 'search' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onShowAdvanced}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Advanced
          </Button>
        )}
      </div>

      {/* Search Mode */}
      {mode === 'search' && (
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search existing candidates: 'React developer', 'Python engineer', etc."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              disabled={isLoading || !searchValue.trim()}
              className="flex items-center gap-2 min-w-[120px]"
            >
              <Search className="h-4 w-4" />
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </form>
      )}

      {/* Collection Mode */}
      {mode === 'collect' && (
        <form onSubmit={onCollectionSubmit} className="space-y-4">
          {/* Query and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="query" className="text-sm font-medium">Search Query</Label>
              <Input
                id="query"
                placeholder="React developer, ML engineer..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
                required
                className="h-9"
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="location" className="text-sm font-medium">Location (optional)</Label>
              <Input
                id="location"
                placeholder="San Francisco, Remote..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isLoading}
                className="h-9"
              />
            </div>
          </div>
          
          {/* Sources */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Data Sources</Label>
              {recommendedSources.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRecommended}
                  disabled={isLoading}
                  className="h-7 px-2 text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Add Recommended
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {sourceOptions.map((source) => {
                const isSelected = sources.includes(source.id);
                const isAvailable = availableSources.includes(source.id);
                const isRecommended = recommendedSources.includes(source.id);
                
                return (
                  <Badge
                    key={source.id}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer text-xs h-7 px-3 ${
                      isSelected ? source.color : 'hover:bg-slate-100'
                    } ${!isAvailable ? 'opacity-50' : ''} ${
                      isRecommended ? 'ring-2 ring-yellow-300' : ''
                    }`}
                    onClick={() => !isLoading && isAvailable && toggleSource(source.id)}
                  >
                    {source.label}
                    {isSelected && (
                      <X 
                        className="h-3 w-3 ml-1" 
                        onClick={(e) => {
                          e.stopPropagation();
                          !isLoading && toggleSource(source.id);
                        }}
                      />
                    )}
                    {isRecommended && !isSelected && (
                      <Plus className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                );
              })}
            </div>
            
            <div className="text-xs text-slate-500">
              Selected: {sources.length} sources
              {recommendedSources.length > 0 && (
                <span className="text-yellow-600"> • {recommendedSources.length} recommended</span>
              )}
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={isLoading || !query.trim() || sources.length === 0}
            className="w-full"
          >
            {isLoading ? "Collecting..." : "Start Collection"}
          </Button>
        </form>
      )}
    </div>
  );
};
