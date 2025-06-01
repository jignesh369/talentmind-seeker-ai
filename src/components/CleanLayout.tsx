
import React, { useState } from 'react';
import { Search, Menu, Filter, Database, BarChart3 } from 'lucide-react';
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
          {/* Magic Search Bar Section */}
          <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
            <div className="max-w-4xl mx-auto px-6 py-8">
              <div className="text-center mb-6">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  TalentMind
                </h1>
                <p className="text-slate-600">Discover exceptional developers with AI-powered search</p>
              </div>
              
              {/* Magic Search Bar */}
              <div className={`relative transition-all duration-300 ${isFocused ? 'scale-105' : ''}`}>
                <div className="relative">
                  <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors ${isFocused ? 'text-blue-600' : 'text-slate-400'} w-6 h-6`} />
                  <input
                    type="text"
                    placeholder="Search for developers by skills, location, experience..."
                    value={searchQuery}
                    onChange={(e) => onSearch(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className={`w-full pl-14 pr-12 py-4 text-lg border-2 rounded-2xl transition-all duration-300 focus:outline-none ${
                      isFocused 
                        ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                        : 'border-slate-300 hover:border-slate-400'
                    } bg-white`}
                  />
                  <SidebarTrigger className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 hover:bg-slate-100 rounded-lg transition-colors" />
                </div>
                
                {/* Search Results Indicator */}
                {searchQuery && (
                  <div className="mt-3 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                      {isSearching ? 'Searching...' : `Searching for "${searchQuery}"`}
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
