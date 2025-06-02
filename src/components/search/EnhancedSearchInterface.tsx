
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Settings, Zap, History } from 'lucide-react';
import { AdvancedSearchPanel } from './AdvancedSearchPanel';

interface EnhancedSearchInterfaceProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
  searchQuery: string;
}

export const EnhancedSearchInterface = ({ 
  onSearch, 
  isSearching, 
  searchQuery 
}: EnhancedSearchInterfaceProps) => {
  const [inputValue, setInputValue] = useState(searchQuery || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Smart search suggestions based on input
  const generateSuggestions = (input: string) => {
    if (input.length < 2) return [];
    
    const suggestions = [
      'React Developer',
      'Python Engineer', 
      'Full Stack Developer',
      'DevOps Engineer',
      'Data Scientist',
      'Mobile Developer',
      'Backend Developer',
      'Frontend Developer',
      'Machine Learning Engineer',
      'UI/UX Designer'
    ];
    
    const skills = ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'Swift'];
    const levels = ['Senior', 'Junior', 'Lead', 'Principal'];
    const locations = ['San Francisco', 'New York', 'Austin', 'Seattle', 'Remote'];
    
    const filtered = suggestions.filter(s => 
      s.toLowerCase().includes(input.toLowerCase())
    );
    
    // Add combination suggestions
    if (input.toLowerCase().includes('senior')) {
      filtered.push(...skills.map(skill => `Senior ${skill} Developer`));
    }
    
    if (input.toLowerCase().includes('react')) {
      filtered.push('React Native Developer', 'React Frontend Developer', 'Full Stack React Developer');
    }
    
    return filtered.slice(0, 5);
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    const suggestions = generateSuggestions(value);
    setSearchSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0 && value.length > 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearch(inputValue.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
  };

  const quickSearches = [
    'Senior React Developer',
    'Python AI Engineer', 
    'Full Stack JavaScript',
    'DevOps AWS',
    'Data Scientist ML'
  ];

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="relative">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Search for developers (e.g., 'Senior React Developer in SF', 'Python AI Engineer')"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              className="pr-10"
              disabled={isSearching}
              onFocus={() => {
                if (searchSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => {
                // Delay hiding suggestions to allow clicking
                setTimeout(() => setShowSuggestions(false), 200);
              }}
            />
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 mt-1">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-slate-400" />
                      <span className="text-sm">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
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
        </form>
      </div>

      {/* Quick Search Buttons */}
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

      {/* Advanced Search Panel */}
      <AdvancedSearchPanel
        isOpen={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        onSearch={onSearch}
        currentQuery={inputValue}
      />
    </div>
  );
};
