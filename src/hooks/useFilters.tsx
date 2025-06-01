
import { useState } from 'react';

interface FilterState {
  minScore: number;
  maxScore: number;
  location: string;
  lastActive: string;
  skills: string[];
}

export const useFilters = () => {
  const [filters, setFilters] = useState<FilterState>({
    minScore: 0,
    maxScore: 100,
    location: '',
    lastActive: '',
    skills: []
  });

  const applyFilters = (candidates: any[]) => {
    return candidates.filter(candidate => {
      if (filters.minScore && candidate.overall_score < filters.minScore) return false;
      if (filters.maxScore && candidate.overall_score > filters.maxScore) return false;
      if (filters.location && !candidate.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;
      return true;
    });
  };

  return {
    filters,
    setFilters,
    applyFilters
  };
};
