
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface SearchResultsProps {
  searchQuery: string;
  isSearching: boolean;
  candidateCount: number;
  searchMetadata?: any;
}

export const SearchResults = ({ 
  searchQuery, 
  isSearching, 
  candidateCount, 
  searchMetadata 
}: SearchResultsProps) => {
  const getSearchQualityBadge = () => {
    if (!searchMetadata) return null;
    
    const { search_strategies, fallback_used } = searchMetadata;
    
    if (fallback_used) {
      return <Badge variant="secondary" className="ml-2">Broad Match</Badge>;
    }
    
    if (search_strategies) {
      const activeStrategies = Object.keys(search_strategies).filter(
        key => search_strategies[key].count > 0
      );
      
      if (activeStrategies.length >= 3) {
        return <Badge variant="default" className="ml-2 bg-green-500">High Precision</Badge>;
      } else if (activeStrategies.length >= 2) {
        return <Badge variant="default" className="ml-2 bg-blue-500">Good Match</Badge>;
      } else if (activeStrategies.length === 1) {
        return <Badge variant="outline" className="ml-2">Single Strategy</Badge>;
      }
    }
    
    return null;
  };

  const getSearchStrategyInfo = () => {
    if (!searchMetadata?.search_strategies) return null;
    
    const strategies = searchMetadata.search_strategies;
    const activeStrategies = Object.entries(strategies)
      .filter(([_, data]: [string, any]) => data.count > 0)
      .map(([name, data]: [string, any]) => ({
        name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: data.count
      }));
    
    if (activeStrategies.length === 0) return null;
    
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
        <Info className="w-3 h-3" />
        <span>
          Matched via: {activeStrategies.map(s => `${s.name} (${s.count})`).join(', ')}
        </span>
      </div>
    );
  };

  return (
    <div className="flex justify-between items-start mb-6">
      <div className="flex-1">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-slate-900">
            {searchQuery ? 'Search Results' : 'All Candidates'}
          </h2>
          {getSearchQualityBadge()}
        </div>
        
        <div className="mt-1">
          <p className="text-slate-600">
            {isSearching ? 'Searching...' : `${candidateCount} candidates found`}
            {searchQuery && (
              <span className="ml-2 text-blue-600">
                for "{searchQuery}"
              </span>
            )}
          </p>
          {getSearchStrategyInfo()}
          
          {searchMetadata?.fallback_used && (
            <p className="text-xs text-amber-600 mt-1">
              Showing top candidates - try more specific search terms for better matches
            </p>
          )}
        </div>
      </div>
      
      <select className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
        <option>Sort by Relevance</option>
        <option>Sort by Overall Score</option>
        <option>Sort by Experience</option>
        <option>Sort by Last Active</option>
      </select>
    </div>
  );
};
