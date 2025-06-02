
import React from 'react';
import { MapPin, Calendar, Star, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface Filters {
  minScore: number;
  maxScore: number;
  location: string;
  lastActive: string;
  skills: string[];
}

interface FilterPanelProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  onClearFilters?: () => void;
  isSearchActive?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ 
  filters, 
  setFilters, 
  onClearFilters,
  isSearchActive = false
}) => {
  const handleScoreRangeChange = (values: number[]) => {
    setFilters({
      ...filters,
      minScore: values[0],
      maxScore: values[1]
    });
  };

  const handleSkillsChange = (skillsText: string) => {
    const skillsArray = skillsText
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);
    
    setFilters({
      ...filters,
      skills: skillsArray
    });
  };

  const clearAllFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    } else {
      setFilters({
        minScore: 0,
        maxScore: 100,
        location: '',
        lastActive: '',
        skills: []
      });
    }
  };

  const hasActiveFilters = () => {
    return filters.minScore > 0 || 
           filters.maxScore < 100 || 
           filters.location.trim() !== '' || 
           filters.lastActive !== '' || 
           filters.skills.length > 0;
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.minScore > 0 || filters.maxScore < 100) count++;
    if (filters.location.trim() !== '') count++;
    if (filters.lastActive !== '') count++;
    if (filters.skills.length > 0) count++;
    return count;
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
          {hasActiveFilters() && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {getActiveFilterCount()} active
            </span>
          )}
        </div>
        
        {hasActiveFilters() && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Score Range */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Star className="w-4 h-4 inline mr-1" />
            Score Range
          </label>
          <div className="space-y-3">
            <Slider
              value={[filters.minScore, filters.maxScore]}
              onValueChange={handleScoreRangeChange}
              max={100}
              min={0}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-600">
              <span>Min: {filters.minScore}</span>
              <span>Max: {filters.maxScore}</span>
            </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Location
          </label>
          <input
            type="text"
            placeholder="e.g., San Francisco, India, Remote"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          <div className="mt-1 text-xs text-slate-500">
            Supports countries, cities, and regions
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Skills (comma separated)
          </label>
          <input
            type="text"
            placeholder="React, TypeScript, Node.js"
            value={filters.skills.join(', ')}
            onChange={(e) => handleSkillsChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          <div className="mt-1 text-xs text-slate-500">
            Filter by specific technologies
          </div>
        </div>

        {/* Last Active */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Last Active
          </label>
          <select
            value={filters.lastActive}
            onChange={(e) => setFilters({ ...filters, lastActive: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">Any time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Filter Status */}
      {isSearchActive && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="text-sm text-slate-600">
            {hasActiveFilters() ? (
              <span>Filters are applied to search results automatically</span>
            ) : (
              <span>No filters applied - showing all results</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
