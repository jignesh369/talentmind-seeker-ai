
import React from 'react';
import { MapPin, Calendar, Star } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

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
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ filters, setFilters }) => {
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
    setFilters({
      minScore: 0,
      maxScore: 100,
      location: '',
      lastActive: '',
      skills: []
    });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Filters</h3>
      
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
            placeholder="Enter location..."
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
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
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
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
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={clearAllFilters}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Clear All
        </button>
        <div className="text-sm text-slate-600 px-3 py-2">
          Filters applied automatically
        </div>
      </div>
    </div>
  );
};
