
import { useState } from 'react';
import { EnhancedCandidate } from '../types/candidate';

export type SortOption = 'relevance' | 'ai_score' | 'experience' | 'recent_activity' | 'overall_score';

export const useSorting = () => {
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  const sortCandidates = (candidates: EnhancedCandidate[]): EnhancedCandidate[] => {
    if (!candidates || candidates.length === 0) return [];

    return [...candidates].sort((a, b) => {
      switch (sortBy) {
        case 'ai_score':
          return (b.technical_score || 0) - (a.technical_score || 0);
        
        case 'experience':
          return (b.experience_years || 0) - (a.experience_years || 0);
        
        case 'recent_activity':
          const aDate = a.last_active ? new Date(a.last_active).getTime() : 0;
          const bDate = b.last_active ? new Date(b.last_active).getTime() : 0;
          return bDate - aDate;
        
        case 'overall_score':
          return (b.overall_score || 0) - (a.overall_score || 0);
        
        case 'relevance':
        default:
          const aRelevance = (a.overall_score || 0) * 0.4 + 
                           (a.technical_score || 0) * 0.3 + 
                           (a.experience_score || 0) * 0.3;
          const bRelevance = (b.overall_score || 0) * 0.4 + 
                           (b.technical_score || 0) * 0.3 + 
                           (b.experience_score || 0) * 0.3;
          return bRelevance - aRelevance;
      }
    });
  };

  const getSortLabel = (option: SortOption): string => {
    switch (option) {
      case 'ai_score': return 'AI Score';
      case 'experience': return 'Experience';
      case 'recent_activity': return 'Recent Activity';
      case 'overall_score': return 'Overall Score';
      case 'relevance': 
      default: return 'Relevance';
    }
  };

  return {
    sortBy,
    setSortBy,
    sortCandidates,
    getSortLabel
  };
};
