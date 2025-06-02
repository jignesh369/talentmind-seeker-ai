
import React from 'react';
import { Zap } from 'lucide-react';

interface QuickSearchActionsProps {
  onQuickSearch: (query: string) => void;
  disabled: boolean;
}

const productionQuickSearches = [
  'Senior React Developer',
  'Python Machine Learning Engineer', 
  'Full Stack TypeScript Developer',
  'DevOps AWS Specialist',
  'Senior Data Scientist'
];

export const QuickSearchActions = ({ onQuickSearch, disabled }: QuickSearchActionsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-sm text-slate-600 flex items-center gap-1">
        <Zap className="h-3 w-3" />
        Quick searches:
      </span>
      {productionQuickSearches.map((quick) => (
        <button
          key={quick}
          onClick={() => onQuickSearch(quick)}
          className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
          disabled={disabled}
        >
          {quick}
        </button>
      ))}
    </div>
  );
};
