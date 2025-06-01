
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
    if (!candidates || candidates.length === 0) return [];

    return candidates.filter(candidate => {
      // Score range filter
      const score = candidate.overall_score || candidate.composite_score || 0;
      if (score < filters.minScore || score > filters.maxScore) return false;
      
      // Location filter
      if (filters.location && filters.location.trim() !== '') {
        const candidateLocation = candidate.location || '';
        if (!candidateLocation.toLowerCase().includes(filters.location.toLowerCase().trim())) {
          return false;
        }
      }
      
      // Skills filter
      if (filters.skills && filters.skills.length > 0) {
        const candidateSkills = candidate.skills || [];
        const hasMatchingSkill = filters.skills.some(filterSkill => 
          candidateSkills.some((candidateSkill: string) => 
            candidateSkill.toLowerCase().includes(filterSkill.toLowerCase().trim())
          )
        );
        if (!hasMatchingSkill) return false;
      }
      
      // Last active filter
      if (filters.lastActive && filters.lastActive !== '') {
        const daysAgo = parseInt(filters.lastActive);
        if (candidate.last_active) {
          const lastActiveDate = new Date(candidate.last_active);
          const daysSinceActive = Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceActive > daysAgo) return false;
        }
      }
      
      return true;
    });
  };

  const getFilterSummary = () => {
    const activeFilters = [];
    
    if (filters.minScore > 0 || filters.maxScore < 100) {
      activeFilters.push(`Score: ${filters.minScore}-${filters.maxScore}`);
    }
    
    if (filters.location.trim() !== '') {
      activeFilters.push(`Location: ${filters.location}`);
    }
    
    if (filters.skills.length > 0) {
      activeFilters.push(`Skills: ${filters.skills.join(', ')}`);
    }
    
    if (filters.lastActive !== '') {
      activeFilters.push(`Active: Last ${filters.lastActive} days`);
    }
    
    return activeFilters;
  };

  return {
    filters,
    setFilters,
    applyFilters,
    getFilterSummary,
    hasActiveFilters: () => getFilterSummary().length > 0
  };
};
