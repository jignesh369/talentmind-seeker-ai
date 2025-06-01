
import React from 'react';
import { X, MapPin, Star, Calendar } from 'lucide-react';

interface ModernFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    minScore: number;
    maxScore: number;
    location: string;
    experience: string;
    availability: string;
    skills: string[];
  };
  setFilters: (filters: any) => void;
}

export const ModernFilters: React.FC<ModernFiltersProps> = ({
  isOpen,
  onClose,
  filters,
  setFilters
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-25 flex justify-end">
      <div className="w-80 bg-white h-full shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Score Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Star className="w-4 h-4 inline mr-2" />
              Score Range
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={filters.minScore}
                onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
                className="w-full accent-gray-900"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{filters.minScore}</span>
                <span>{filters.maxScore}</span>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Location
            </label>
            <input
              type="text"
              placeholder="Enter location..."
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>

          {/* Experience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Experience Level
            </label>
            <select
              value={filters.experience || ''}
              onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="">Any level</option>
              <option value="junior">Junior (1-3 years)</option>
              <option value="mid">Mid-level (3-6 years)</option>
              <option value="senior">Senior (6+ years)</option>
            </select>
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Availability
            </label>
            <select
              value={filters.availability || ''}
              onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="">Any time</option>
              <option value="immediate">Immediate</option>
              <option value="2weeks">Within 2 weeks</option>
              <option value="1month">Within 1 month</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-100 bg-white">
          <div className="flex space-x-3">
            <button
              onClick={() => setFilters({ minScore: 0, maxScore: 100, location: '', experience: '', availability: '', skills: [] })}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
