
import React, { useState } from 'react';
import { Search, Menu, Filter } from 'lucide-react';

interface ModernLayoutProps {
  children: React.ReactNode;
  searchQuery: string;
  onSearch: (query: string) => void;
  isSearching: boolean;
  onShowFilters: () => void;
  showFilters: boolean;
}

export const ModernLayout: React.FC<ModernLayoutProps> = ({
  children,
  searchQuery,
  onSearch,
  isSearching,
  onShowFilters,
  showFilters
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">TalentFind</h1>
              <p className="text-gray-500 text-sm mt-1">Discover exceptional developers</p>
            </div>
            <button
              onClick={onShowFilters}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
          
          {/* Clean Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search developers by skills, location, or experience..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`w-full pl-12 pr-4 py-3 border rounded-lg transition-all duration-200 ${
                isFocused 
                  ? 'border-gray-900 ring-1 ring-gray-900' 
                  : 'border-gray-200 hover:border-gray-300'
              } bg-white text-gray-900 placeholder-gray-500`}
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};
