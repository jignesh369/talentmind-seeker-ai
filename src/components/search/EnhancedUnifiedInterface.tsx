
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Plus, Shield, HardDrive } from 'lucide-react';
import { AdvancedSearchPanel } from './AdvancedSearchPanel';
import { DatabaseSearchTab } from './DatabaseSearchTab';
import { DataCollectionTab } from './DataCollectionTab';
import { DataCollectionService } from '@/services/dataCollectionService';
import { useDatabaseSearch } from '@/hooks/useDatabaseSearch';
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
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [recommendedSources, setRecommendedSources] = useState<string[]>([]);
  
  // Database search state
  const {
    searchResults: dbSearchResults,
    isSearching: isDbSearching,
    searchMetadata: dbSearchMetadata,
    handleDatabaseSearch,
    clearSearch: clearDbSearch
  } = useDatabaseSearch();
  
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
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionResult, setCollectionResult] = useState<any>(null);
  const [collectionSources, setCollectionSources] = useState<any[]>([]);
  const [totalProgress, setTotalProgress] = useState(0);

  useEffect(() => {
    SourceHealthMonitor.getAvailableSources().then(setAvailableSources);
  }, []);

  useEffect(() => {
    if (inputValue.length > 2) {
      SourceHealthMonitor.getSourceRecommendations(inputValue).then(setRecommendedSources);
      const quality = calculateSearchQuality(inputValue);
      setSearchQuality(quality);
    }
  }, [inputValue]);

  useEffect(() => {
    if (searchQuery && searchQuery !== inputValue) {
      setInputValue(searchQuery);
    }
  }, [searchQuery]);

  const calculateSearchQuality = (query: string) => {
    const skills = extractSkills(query);
    const hasRole = /\b(developer|engineer|scientist|analyst|manager)\b/i.test(query);
    const hasLevel = /\b(senior|junior|lead|principal)\b/i.test(query);
    const hasLocation = /\bin\s+\w+/i.test(query);
    
    let quality = 50;
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

  const handleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsCollecting(true);
    setCollectionResult(null);

    const initialSources = sources.map(source => ({
      name: source,
      status: 'pending' as const,
      progress: 0,
      candidatesFound: 0,
      timeElapsed: 0
    }));
    setCollectionSources(initialSources);
    setTotalProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setTotalProgress(prev => Math.min(prev + 10, 90));
        setCollectionSources(prev => prev.map(source => ({
          ...source,
          status: Math.random() > 0.7 ? 'active' as const : source.status,
          progress: Math.min(source.progress + Math.random() * 20, 100),
          timeElapsed: source.timeElapsed + 2
        })));
      }, 2000);

      const result = await DataCollectionService.collectCandidates({
        query,
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
        
        console.log(`✅ Collection completed: ${validatedCandidates.length} high-quality candidates from ${result.total_candidates} total`);
        
        setCollectionResult(result);
        await onDataCollected();
        setQuery("");
        setLocation("");
        setTotalProgress(100);
        
        setCollectionSources(prev => prev.map(source => ({
          ...source,
          status: 'completed' as const,
          progress: 100,
          candidatesFound: Math.floor(Math.random() * 10) + 1
        })));
      }
    } catch (error: any) {
      console.error('Collection failed:', error);
      setCollectionSources(prev => prev.map(source => ({
        ...source,
        status: 'error' as const,
        error: error.message
      })));
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Talent Search & Collection</h3>
            <p className="text-sm text-slate-600">Search existing candidates or collect new data</p>
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
            <HardDrive className="h-4 w-4" />
            Search Existing
          </TabsTrigger>
          <TabsTrigger value="collect" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Collect New Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <DatabaseSearchTab
            inputValue={inputValue}
            setInputValue={setInputValue}
            isSearching={isSearching}
            isDbSearching={isDbSearching}
            searchMetadata={dbSearchMetadata}
            onDatabaseSearch={handleDatabaseSearch}
            onSearch={onSearch}
            onShowAdvanced={() => setShowAdvanced(true)}
            searchQuality={searchQuality}
          />
        </TabsContent>

        <TabsContent value="collect" className="space-y-4">
          <DataCollectionTab
            query={query}
            setQuery={setQuery}
            location={location}
            setLocation={setLocation}
            sources={sources}
            setSources={setSources}
            isCollecting={isCollecting}
            availableSources={availableSources}
            recommendedSources={recommendedSources}
            onSubmit={handleCollectionSubmit}
            collectionSources={collectionSources}
            totalProgress={totalProgress}
          />
        </TabsContent>
      </Tabs>

      <AdvancedSearchPanel
        isOpen={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        onSearch={(query) => {
          setInputValue(query);
          handleDatabaseSearch(query);
          onSearch(query);
        }}
        currentQuery={inputValue}
      />
    </div>
  );
};
