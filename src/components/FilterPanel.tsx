
import React from 'react';
import { MapPin, Calendar, Star } from 'lucide-react';

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
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Filters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Score Range */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Star className="w-4 h-4 inline mr-1" />
            Score Range
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="100"
              value={filters.minScore}
              onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
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
          onClick={() => setFilters({ minScore: 0, maxScore: 100, location: '', lastActive: '', skills: [] })}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Clear All
        </button>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Apply Filters
        </button>
      </div>
    </div>
  );
};
