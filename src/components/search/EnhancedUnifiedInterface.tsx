
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Settings, Database, Plus, Zap, Shield, TrendingUp } from 'lucide-react';
import { AdvancedSearchPanel } from './AdvancedSearchPanel';
import { RealTimeSearchSuggestions } from './RealTimeSearchSuggestions';
import { SearchQualityIndicator } from './SearchQualityIndicator';
import { DataCollectionProgress } from './DataCollectionProgress';
import { useDataCollection } from '@/hooks/useDataCollection';
import { SourceHealthMonitor } from '@/services/core/SourceHealthMonitor';
import { CandidateValidator } from '@/services/core/CandidateValidator';

interface EnhancedUnifiedInterfaceProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
  searchQuery: string;
  onDataCollected: () => Promise<void>;
}

export const EnhancedUnifiedInterface = ({ 
  onSearch, 
  isSearching, 
  searchQuery,
  onDataCollected
}: EnhancedUnifiedInterfaceProps) => {
  const [activeTab, setActiveTab] = useState<'search' | 'collect'>('search');
  const [inputValue, setInputValue] = useState(searchQuery || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [recommendedSources, setRecommendedSources] = useState<string[]>([]);
  
  // Search quality state
  const [searchQuality, setSearchQuality] = useState({
    quality: 0,
    confidence: 0,
    matchedSkills: [] as string[],
    totalSkills: 0,
    searchStrategy: 'basic'
  });

  // Data collection state
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [sources, setSources] = useState<string[]>(['github', 'stackoverflow', 'linkedin', 'google']);
  const { collectData, isCollecting, collectionResult, progress } = useDataCollection();

  // Collection progress state
  const [collectionSources, setCollectionSources] = useState<any[]>([]);
  const [totalProgress, setTotalProgress] = useState(0);

  useEffect(() => {
    // Load available sources on component mount
    SourceHealthMonitor.getAvailableSources().then(setAvailableSources);
  }, []);

  useEffect(() => {
    // Get source recommendations when query changes
    if (inputValue.length > 2) {
      SourceHealthMonitor.getSourceRecommendations(inputValue).then(setRecommendedSources);
      
      // Calculate search quality preview
      const quality = calculateSearchQuality(inputValue);
      setSearchQuality(quality);
    }
  }, [inputValue]);

  const calculateSearchQuality = (query: string) => {
    const skills = extractSkills(query);
    const hasRole = /\b(developer|engineer|scientist|analyst|manager)\b/i.test(query);
    const hasLevel = /\b(senior|junior|lead|principal)\b/i.test(query);
    const hasLocation = /\bin\s+\w+/i.test(query);
    
    let quality = 50; // Base quality
    if (skills.length > 0) quality += 20;
    if (hasRole) quality += 15;
    if (hasLevel) quality += 10;
    if (hasLocation) quality += 5;
    
    return {
      quality: Math.min(quality, 100),
      confidence: Math.min(quality - 10, 95),
      matchedSkills: skills,
      totalSkills: skills.length,
      searchStrategy: hasLevel && hasRole ? 'advanced' : 'standard'
    };
  };

  const extractSkills = (query: string): string[] => {
    const commonSkills = [
      'react', 'javascript', 'typescript', 'python', 'java', 'go', 'rust',
      'node.js', 'django', 'flask', 'spring', 'aws', 'docker', 'kubernetes',
      'machine learning', 'ai', 'data science', 'devops'
    ];
    
    const queryLower = query.toLowerCase();
    return commonSkills.filter(skill => queryLower.includes(skill));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearch(inputValue.trim());
    }
  };

  const handleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Initialize progress tracking
    const initialSources = sources.map(source => ({
      name: source,
      status: 'pending' as const,
      progress: 0,
      candidatesFound: 0,
      timeElapsed: 0
    }));
    setCollectionSources(initialSources);
    setTotalProgress(0);

    // Start collection with real-time progress
    const result = await collectData(query, location || undefined, sources);
    
    if (result) {
      // Apply quality validation to results - fix: access correct properties
      const candidatesData = result.results ? Object.values(result.results).flat() : [];
      const validatedCandidates = CandidateValidator.filterHighQualityCandidates(
        candidatesData, 
        40 // Minimum quality score
      );
      
      console.log(`✅ Collection completed: ${validatedCandidates.length} high-quality candidates from ${result.total_candidates} total`);
      
      await onDataCollected();
      setQuery("");
      setLocation("");
      setTotalProgress(100);
    }
  };

  const productionQuickSearches = [
    'Senior React Developer',
    'Python Machine Learning Engineer',
    'Full Stack TypeScript Developer',
    'DevOps AWS Specialist',
    'Senior Data Scientist'
  ];

  const sourceOptions = [
    { id: 'github', label: 'GitHub', description: 'Open source developers' },
    { id: 'stackoverflow', label: 'Stack Overflow', description: 'Technical experts' },
    { id: 'linkedin', label: 'LinkedIn (Apify)', description: 'Professional profiles' },
    { id: 'google', label: 'Google Search', description: 'Web presence' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Production Talent Search</h3>
            <p className="text-sm text-slate-600">High-quality candidates from verified sources</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-500" />
          <span className="text-xs text-green-600 font-medium">Quality Validated</span>
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
            <div className="relative">
              <Input
                type="text"
                placeholder="e.g., 'Senior React Developer in SF' or 'Python AI Engineer'"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1"
                disabled={isSearching}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              
              <RealTimeSearchSuggestions
                query={inputValue}
                onSelectSuggestion={(suggestion) => {
                  setInputValue(suggestion);
                  onSearch(suggestion);
                  setShowSuggestions(false);
                }}
                isVisible={showSuggestions}
              />
            </div>

            <div className="flex gap-2">
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

          {inputValue.length > 2 && (
            <SearchQualityIndicator {...searchQuality} />
          )}

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-slate-600 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Production searches:
            </span>
            {productionQuickSearches.map((quick) => (
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
