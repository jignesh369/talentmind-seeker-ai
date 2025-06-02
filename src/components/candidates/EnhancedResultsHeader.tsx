
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown, ChevronUp, Brain, Info, SortAsc } from 'lucide-react';
import { FilterSummaryBadges } from './FilterSummaryBadges';
import { SortOption } from '../../hooks/useSorting';

interface EnhancedResultsHeaderProps {
  searchQuery: string;
  candidateCount: number;
  isSearching: boolean;
  searchMetadata?: any;
  enhancedQuery?: any;
  filters?: any;
  onClearFilter?: (filterType: string) => void;
  onClearAllFilters?: () => void;
  onClearSearch?: () => void;
  onFindMore?: () => void;
  onSortChange?: (sortBy: SortOption) => void;
  currentSort?: SortOption;
}

export const EnhancedResultsHeader = ({ 
  searchQuery,
  candidateCount,
  isSearching,
  searchMetadata,
  enhancedQuery,
  filters,
  onClearFilter,
  onClearAllFilters,
  onClearSearch,
  onFindMore,
  onSortChange,
  currentSort = 'relevance'
}: EnhancedResultsHeaderProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const showFindMore = searchQuery && !isSearching && candidateCount < 20;
  const hasActiveFilters = filters && (
    filters.minScore > 0 || 
    filters.maxScore < 100 || 
    filters.location?.trim() || 
    filters.skills?.length > 0 || 
    filters.lastActive
  );

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'ai_score', label: 'AI Score' },
    { value: 'overall_score', label: 'Overall Score' },
    { value: 'experience', label: 'Experience' },
    { value: 'recent_activity', label: 'Recent Activity' }
  ];

  const handleClearFilter = (filterType: string) => {
    if (!onClearFilter) return;
    onClearFilter(filterType);
  };

  return (
    <div className="space-y-4">
      {/* Filter Summary Badges */}
      {hasActiveFilters && onClearFilter && onClearAllFilters && (
        <FilterSummaryBadges
          filters={filters}
          onClearFilter={handleClearFilter}
          onClearAll={onClearAllFilters}
        />
      )}

      {/* Main Results Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {searchQuery ? 'Search Results' : 'All Candidates'}
            </h2>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>{candidateCount} candidate{candidateCount !== 1 ? 's' : ''} found</span>
              
              {searchMetadata?.confidence && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  {searchMetadata.confidence}% match confidence
                </Badge>
              )}
              
              {enhancedQuery && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                  <Brain className="h-3 w-3 mr-1" />
                  AI Enhanced
                </Badge>
              )}
            </div>
          </div>

          {searchQuery && (
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
              <span className="text-sm font-medium text-blue-700">
                Query: "{searchQuery}"
              </span>
              {onClearSearch && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSearch}
                  className="h-6 w-6 p-0 hover:bg-blue-100"
                >
                  ×
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <SortAsc className="h-4 w-4 text-slate-500" />
            <select 
              value={currentSort}
              onChange={(e) => onSortChange?.(e.target.value as SortOption)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  Sort by {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {showFindMore && onFindMore && (
              <Button
                onClick={onFindMore}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={isSearching}
              >
                <Search className="h-4 w-4" />
                Find More
              </Button>
            )}

            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Info className="h-4 w-4" />
              Details
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Details Panel */}
      {showDetails && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-slate-900">Search Details</h3>
          
          {enhancedQuery && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-700">Query Enhancement</h4>
              <div className="bg-white p-3 rounded border text-sm">
                <p><span className="font-medium">Original:</span> {searchQuery}</p>
                <p><span className="font-medium">Enhanced:</span> {enhancedQuery.enhanced_query || 'Processing...'}</p>
                {enhancedQuery.extracted_skills && (
                  <p><span className="font-medium">Skills detected:</span> {enhancedQuery.extracted_skills.join(', ')}</p>
                )}
              </div>
            </div>
          )}

          {searchMetadata && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {searchMetadata.sourcesUsed && (
                <div>
                  <span className="font-medium text-slate-700">Data Sources:</span>
                  <p className="text-slate-600">{searchMetadata.sourcesUsed.join(', ')}</p>
                </div>
              )}
              
              {searchMetadata.processingTime && (
                <div>
                  <span className="font-medium text-slate-700">Processing Time:</span>
                  <p className="text-slate-600">{searchMetadata.processingTime}ms</p>
                </div>
              )}
              
              {searchMetadata.confidence && (
                <div>
                  <span className="font-medium text-slate-700">Match Quality:</span>
                  <p className="text-slate-600">{searchMetadata.confidence}% confidence</p>
                </div>
              )}

              <div>
                <span className="font-medium text-slate-700">Data Freshness:</span>
                <p className="text-slate-600">Live & verified</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
