
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Zap } from 'lucide-react';

interface CompactDataCollectionTabProps {
  query: string;
  setQuery: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  sources: string[];
  setSources: (sources: string[]) => void;
  isCollecting: boolean;
  availableSources: string[];
  recommendedSources: string[];
  onSubmit: (e: React.FormEvent) => void;
}

const sourceOptions = [
  { id: 'github', label: 'GitHub', color: 'bg-gray-100 text-gray-800' },
  { id: 'stackoverflow', label: 'Stack Overflow', color: 'bg-orange-100 text-orange-800' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-blue-100 text-blue-800' },
  { id: 'google', label: 'Google', color: 'bg-green-100 text-green-800' }
];

export const CompactDataCollectionTab = ({
  query,
  setQuery,
  location,
  setLocation,
  sources,
  setSources,
  isCollecting,
  availableSources,
  recommendedSources,
  onSubmit
}: CompactDataCollectionTabProps) => {
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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Query and Location in a compact grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="query" className="text-xs font-medium">Search Query</Label>
          <Input
            id="query"
            placeholder="React developer, ML engineer..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isCollecting}
            required
            className="h-9 text-sm"
          />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="location" className="text-xs font-medium">Location (optional)</Label>
          <Input
            id="location"
            placeholder="San Francisco, Remote..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isCollecting}
            className="h-9 text-sm"
          />
        </div>
      </div>
      
      {/* Compact source selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Data Sources</Label>
          {recommendedSources.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRecommended}
              disabled={isCollecting}
              className="h-6 px-2 text-xs"
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
                className={`cursor-pointer text-xs h-6 px-2 ${
                  isSelected ? source.color : 'hover:bg-slate-100'
                } ${!isAvailable ? 'opacity-50' : ''} ${
                  isRecommended ? 'ring-2 ring-yellow-300' : ''
                }`}
                onClick={() => !isCollecting && isAvailable && toggleSource(source.id)}
              >
                {source.label}
                {isSelected && (
                  <X 
                    className="h-3 w-3 ml-1" 
                    onClick={(e) => {
                      e.stopPropagation();
                      !isCollecting && toggleSource(source.id);
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
          Selected: {sources.length} sources • 
          {recommendedSources.length > 0 && (
            <span className="text-yellow-600"> {recommendedSources.length} recommended</span>
          )}
        </div>
      </div>
      
      <Button 
        type="submit" 
        disabled={isCollecting || !query.trim() || sources.length === 0}
        className="w-full h-9"
        size="sm"
      >
        {isCollecting ? "Collecting..." : "Start Collection"}
      </Button>
    </form>
  );
};
