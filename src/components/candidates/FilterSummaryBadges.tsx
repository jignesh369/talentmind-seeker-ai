
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FilterSummaryBadgesProps {
  filters: any;
  onClearFilter: (filterType: string) => void;
  onClearAll: () => void;
}

export const FilterSummaryBadges = ({ 
  filters, 
  onClearFilter, 
  onClearAll 
}: FilterSummaryBadgesProps) => {
  const activeFilters = [];

  if (filters.minScore > 0 || filters.maxScore < 100) {
    activeFilters.push({
      type: 'score',
      label: `Score: ${filters.minScore}-${filters.maxScore}`,
      value: 'score'
    });
  }

  if (filters.location && filters.location.trim() !== '') {
    activeFilters.push({
      type: 'location',
      label: `Location: ${filters.location}`,
      value: 'location'
    });
  }

  if (filters.skills && filters.skills.length > 0) {
    activeFilters.push({
      type: 'skills',
      label: `Skills: ${filters.skills.slice(0, 2).join(', ')}${filters.skills.length > 2 ? '...' : ''}`,
      value: 'skills'
    });
  }

  if (filters.lastActive && filters.lastActive !== '') {
    const days = parseInt(filters.lastActive);
    activeFilters.push({
      type: 'activity',
      label: `Active: Last ${days} days`,
      value: 'lastActive'
    });
  }

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm font-medium text-slate-600">Active filters:</span>
      {activeFilters.map((filter) => (
        <Badge 
          key={filter.type} 
          variant="secondary" 
          className="flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-200"
        >
          {filter.label}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onClearFilter(filter.value)}
            className="h-4 w-4 p-0 hover:bg-blue-200"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={onClearAll}
        className="text-xs"
      >
        Clear All
      </Button>
    </div>
  );
};
