
import React, { useState, useEffect } from 'react';
import { Search, Plus, Settings, Activity, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { SystemMonitorPopup } from './SystemMonitorPopup';
import { useDatabaseSearch } from '@/hooks/useDatabaseSearch';
import { DataCollectionService } from '@/services/dataCollectionService';
import { SourceHealthMonitor } from '@/services/core/SourceHealthMonitor';
import { CandidateValidator } from '@/services/core/CandidateValidator';

interface ModernSearchInterfaceProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
  searchQuery: string;
  onDataCollected: () => Promise<void>;
}

export const ModernSearchInterface = ({ 
  onSearch, 
  isSearching, 
  searchQuery,
  onDataCollected
}: ModernSearchInterfaceProps) => {
  const [mode, setMode] = useState<'search' | 'collect'>('search');
  const [inputValue, setInputValue] = useState(searchQuery || '');
  const [showMonitor, setShowMonitor] = useState(false);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [recommendedSources, setRecommendedSources] = useState<string[]>([]);
  
  // Collection state
  const [location, setLocation] = useState("");
  const [sources, setSources] = useState<string[]>(['github', 'stackoverflow', 'linkedin', 'google']);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionProgress, setCollectionProgress] = useState(0);

  const {
    handleDatabaseSearch,
    isSearching: isDbSearching
  } = useDatabaseSearch();

  useEffect(() => {
    SourceHealthMonitor.getAvailableSources().then(setAvailableSources);
  }, []);

  useEffect(() => {
    if (inputValue.length > 2) {
      SourceHealthMonitor.getSourceRecommendations(inputValue).then(setRecommendedSources);
    }
  }, [inputValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    if (mode === 'search') {
      await handleDatabaseSearch(inputValue.trim());
      onSearch(inputValue.trim());
    } else {
      await handleCollection();
    }
  };

  const handleCollection = async () => {
    setIsCollecting(true);
    setCollectionProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setCollectionProgress(prev => Math.min(prev + 10, 90));
      }, 1000);

      const result = await DataCollectionService.collectCandidates({
        query: inputValue,
        location: location || undefined,
        sources,
        timeBudget: 70
      });
      
      clearInterval(progressInterval);
      
      if (result) {
        const candidatesData = result.results ? Object.values(result.results).flat() : [];
        const validatedCandidates = CandidateValidator.filterHighQualityCandidates(
          candidatesData, 
          40
        );
        
        console.log(`✅ Collection completed: ${validatedCandidates.length} high-quality candidates`);
        
        await onDataCollected();
        setInputValue("");
        setLocation("");
        setCollectionProgress(100);
      }
    } catch (error: any) {
      console.error('Collection failed:', error);
    } finally {
      setIsCollecting(false);
      setTimeout(() => setCollectionProgress(0), 2000);
    }
  };

  const isLoading = mode === 'search' ? (isSearching || isDbSearching) : isCollecting;

  return (
    <div className="relative">
      {/* Hero Search Container */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Find Your Perfect Candidates
            </h1>
            <p className="text-slate-600">
              Search existing talent or collect fresh candidates from across the web
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-slate-100 rounded-full p-1 flex">
              <Toggle
                pressed={mode === 'search'}
                onPressedChange={() => setMode('search')}
                className="rounded-full px-6 py-2 data-[state=on]:bg-white data-[state=on]:shadow-sm"
              >
                <Search className="h-4 w-4 mr-2" />
                Search Existing
              </Toggle>
              <Toggle
                pressed={mode === 'collect'}
                onPressedChange={() => setMode('collect')}
                className="rounded-full px-6 py-2 data-[state=on]:bg-white data-[state=on]:shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Collect New
              </Toggle>
            </div>
          </div>

          {/* Main Search Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type="text"
                placeholder={mode === 'search' 
                  ? "Search for 'React developer', 'Python engineer', etc." 
                  : "Collect 'ML engineers in SF', 'Senior React developers', etc."
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="h-14 text-lg pl-6 pr-32 rounded-xl border-2 border-slate-200 focus:border-blue-500 transition-colors"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                disabled={isLoading || !inputValue.trim()}
                className="absolute right-2 top-2 h-10 px-6 rounded-lg"
              >
                {isLoading ? 'Processing...' : mode === 'search' ? 'Search' : 'Collect'}
              </Button>
            </div>

            {/* Collection-specific fields */}
            {mode === 'collect' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <Input
                  placeholder="Location (optional)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-12 rounded-lg"
                  disabled={isLoading}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 min-w-fit">Sources:</span>
                  <div className="flex flex-wrap gap-1">
                    {['github', 'stackoverflow', 'linkedin', 'google'].map((source) => (
                      <Badge
                        key={source}
                        variant={sources.includes(source) ? "default" : "outline"}
                        className={`cursor-pointer capitalize text-xs ${
                          recommendedSources.includes(source) ? 'ring-2 ring-yellow-300' : ''
                        }`}
                        onClick={() => {
                          if (!isLoading) {
                            setSources(prev => 
                              prev.includes(source) 
                                ? prev.filter(s => s !== source)
                                : [...prev, source]
                            );
                          }
                        }}
                      >
                        {source}
                        {recommendedSources.includes(source) && <Zap className="h-3 w-3 ml-1" />}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Collection Progress */}
            {isCollecting && collectionProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Collecting candidates...</span>
                  <span>{collectionProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${collectionProgress}%` }}
                  />
                </div>
              </div>
            )}
          </form>

          {/* Quick Actions */}
          <div className="flex justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMonitor(true)}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              System Monitor
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Advanced
            </Button>
          </div>
        </div>
      </div>

      {/* Floating System Monitor Popup */}
      <SystemMonitorPopup
        isOpen={showMonitor}
        onClose={() => setShowMonitor(false)}
        availableSources={availableSources}
        isCollecting={isCollecting}
        collectionProgress={collectionProgress}
      />
    </div>
  );
};
