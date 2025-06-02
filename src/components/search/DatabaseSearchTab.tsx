
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Settings, HardDrive } from 'lucide-react';
import { RealTimeSearchSuggestions } from './RealTimeSearchSuggestions';
import { SearchQualityIndicator } from './SearchQualityIndicator';
import { QuickSearchActions } from './QuickSearchActions';

interface DatabaseSearchTabProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  isSearching: boolean;
  isDbSearching: boolean;
  searchMetadata: any;
  onDatabaseSearch: (query: string) => void;
  onSearch: (query: string) => void;
  onShowAdvanced: () => void;
  searchQuality: {
    quality: number;
    confidence: number;
    matchedSkills: string[];
    totalSkills: number;
    searchStrategy: string;
  };
}

export const DatabaseSearchTab = ({
  inputValue,
  setInputValue,
  isSearching,
  isDbSearching,
  searchMetadata,
  onDatabaseSearch,
  onSearch,
  onShowAdvanced,
  searchQuality
}: DatabaseSearchTabProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    console.log('🔍 Starting database search for:', inputValue.trim());
    
    await onDatabaseSearch(inputValue.trim());
    onSearch(inputValue.trim());
  };

  return (
    <div className="space-y-4">
      {/* Database Statistics */}
      <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <HardDrive className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">
            Search {searchMetadata?.totalCandidatesInDb || '1,000+'} existing candidates
          </p>
          <p className="text-xs text-blue-700">
            Database-only search • Instant results • No external API calls
          </p>
        </div>
        {searchMetadata && (
          <div className="text-xs text-blue-600">
            Last search: {searchMetadata.searchTime}ms
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search existing candidates: 'React developer', 'Python engineer', etc."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1"
            disabled={isDbSearching || isSearching}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          
          <RealTimeSearchSuggestions
            query={inputValue}
            onSelectSuggestion={(suggestion) => {
              setInputValue(suggestion);
              onDatabaseSearch(suggestion);
              onSearch(suggestion);
              setShowSuggestions(false);
            }}
            isVisible={showSuggestions && inputValue.length > 1}
          />
        </div>

        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={isDbSearching || isSearching || !inputValue.trim()}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            {isDbSearching || isSearching ? 'Searching Database...' : 'Search Database'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onShowAdvanced}
            className="flex items-center gap-2"
            disabled={isDbSearching || isSearching}
          >
            <Settings className="h-4 w-4" />
            Advanced
          </Button>
        </div>
      </form>

      {inputValue.length > 2 && (
        <SearchQualityIndicator {...searchQuality} />
      )}

      <QuickSearchActions
        onQuickSearch={(query) => {
          setInputValue(query);
          onDatabaseSearch(query);
          onSearch(query);
        }}
        disabled={isDbSearching || isSearching}
      />
    </div>
  );
};
