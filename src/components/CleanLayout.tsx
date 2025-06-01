
import React, { useState } from 'react';
import { Search, Sparkles, Mic, Clock, Bookmark } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { CleanSidebar } from './CleanSidebar';

interface CleanLayoutProps {
  children: React.ReactNode;
  searchQuery: string;
  onSearch: (query: string) => void;
  isSearching: boolean;
  onDataCollection: () => void;
  onShowInsights: () => void;
  filters: any;
  setFilters: (filters: any) => void;
}

const quickSearches = [
  'React Developer',
  'Senior Full Stack',
  'Python Engineer',
  'DevOps Expert',
  'AI/ML Specialist',
  'Remote Frontend'
];

const searchSuggestions = [
  'JavaScript developer with 5+ years experience',
  'Senior React engineer in San Francisco',
  'Full-stack developer with Python and Django',
  'DevOps engineer with AWS certification',
  'Frontend developer with TypeScript expertise'
];

export const CleanLayout: React.FC<CleanLayoutProps> = ({
  children,
  searchQuery,
  onSearch,
  isSearching,
  onDataCollection,
  onShowInsights,
  filters,
  setFilters
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSearch(suggestion);
    setShowSuggestions(false);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <CleanSidebar 
          onDataCollection={onDataCollection}
          onShowInsights={onShowInsights}
          filters={filters}
          setFilters={setFilters}
        />
        
        <main className="flex-1 flex flex-col">
          {/* Enhanced Magic Search Bar Section */}
          <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
            <div className="max-w-5xl mx-auto px-6 py-10">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    TalentMind
                  </h1>
                  <Sparkles className="w-8 h-8 text-purple-600 animate-pulse" />
                </div>
                <p className="text-slate-600 text-lg">Discover exceptional developers with AI-powered precision</p>
              </div>
              
              {/* Enhanced Magic Search Bar */}
              <div className={`relative transition-all duration-500 ${isFocused ? 'scale-105 transform' : ''}`}>
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 transition-all duration-300 ${isFocused ? 'opacity-40' : ''}`}></div>
                  <div className="relative bg-white rounded-2xl border-2 border-slate-300 shadow-lg">
                    <Search className={`absolute left-5 top-1/2 transform -translate-y-1/2 transition-colors ${isFocused ? 'text-blue-600' : 'text-slate-400'} w-6 h-6`} />
                    <input
                      type="text"
                      placeholder="Search for developers by skills, location, experience... (Try 'React developer in NYC')"
                      value={searchQuery}
                      onChange={(e) => onSearch(e.target.value)}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      className={`w-full pl-16 pr-32 py-5 text-lg border-0 rounded-2xl transition-all duration-300 focus:outline-none ${
                        isFocused 
                          ? 'shadow-lg shadow-blue-500/20' 
                          : 'hover:shadow-md'
                      } bg-white`}
                    />
                    <div className="absolute right-5 top-1/2 transform -translate-y-1/2 flex items-center space-x-3">
                      <button className="p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-colors">
                        <Mic className="w-5 h-5" />
                      </button>
                      <SidebarTrigger className="p-2 hover:bg-slate-100 rounded-lg transition-colors" />
                    </div>
                  </div>
                </div>

                {/* Quick Search Chips */}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {quickSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => onSearch(search)}
                      className="px-4 py-2 bg-white/80 hover:bg-blue-50 border border-slate-200 rounded-full text-sm text-slate-700 hover:text-blue-700 hover:border-blue-300 transition-all duration-200 backdrop-blur-sm"
                    >
                      {search}
                    </button>
                  ))}
                </div>

                {/* Search Suggestions Dropdown */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl z-50 animate-fade-in">
                    <div className="p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">Recent & Suggested Searches</span>
                      </div>
                      <div className="space-y-2">
                        {searchSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-700 hover:text-blue-700"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Search Results Indicator */}
                {searchQuery && (
                  <div className="mt-4 text-center">
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border border-blue-200">
                      {isSearching ? (
                        <>
                          <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse mr-2"></div>
                          Searching with AI...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          AI-powered search for "{searchQuery}"
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 px-6 py-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
