
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { DataCollectionProgress } from './DataCollectionProgress';

interface DataCollectionTabProps {
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
  collectionSources: any[];
  totalProgress: number;
}

const sourceOptions = [
  { id: 'github', label: 'GitHub', description: 'Open source developers' },
  { id: 'stackoverflow', label: 'Stack Overflow', description: 'Technical experts' },
  { id: 'linkedin', label: 'LinkedIn (Apify)', description: 'Professional profiles' },
  { id: 'google', label: 'Google Search', description: 'Web presence' }
];

export const DataCollectionTab = ({
  query,
  setQuery,
  location,
  setLocation,
  sources,
  setSources,
  isCollecting,
  availableSources,
  recommendedSources,
  onSubmit,
  collectionSources,
  totalProgress
}: DataCollectionTabProps) => {
  return (
    <div className="space-y-4">
      {/* Collection Information */}
      <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
        <Plus className="h-5 w-5 text-green-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-900">
            Collect new candidates from external sources
          </p>
          <p className="text-xs text-green-700">
            GitHub • Stack Overflow • LinkedIn • Google Search
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
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
          <Label>Data Sources (Real APIs)</Label>
          <div className="grid grid-cols-1 gap-3">
            {sourceOptions.map((source) => {
              const isAvailable = availableSources.includes(source.id);
              const isRecommended = recommendedSources.includes(source.id);
              
              return (
                <label key={source.id} className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
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
                    disabled={isCollecting || !isAvailable}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{source.label}</span>
                      {isRecommended && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Recommended
                        </span>
                      )}
                      {!isAvailable && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Unavailable
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-slate-600">{source.description}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={isCollecting || !query.trim() || sources.length === 0}
          className="w-full"
        >
          {isCollecting ? "Collecting High-Quality Data..." : "Start Professional Collection"}
        </Button>
      </form>

      {isCollecting && (
        <DataCollectionProgress
          sources={collectionSources}
          totalProgress={totalProgress}
          isCollecting={isCollecting}
          estimatedTimeRemaining={60}
        />
      )}
    </div>
  );
};
