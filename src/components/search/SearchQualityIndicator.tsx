
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle, Brain, TrendingUp } from 'lucide-react';

interface SearchQualityIndicatorProps {
  quality: number;
  confidence: number;
  matchedSkills: string[];
  totalSkills: number;
  searchStrategy: string;
}

export const SearchQualityIndicator = ({
  quality,
  confidence,
  matchedSkills,
  totalSkills,
  searchStrategy
}: SearchQualityIndicatorProps) => {
  const getQualityIcon = () => {
    if (quality >= 80) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (quality >= 60) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getQualityColor = () => {
    if (quality >= 80) return 'bg-green-100 text-green-800';
    if (quality >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
      <div className="flex items-center gap-2">
        {getQualityIcon()}
        <span className="text-sm font-medium">Search Quality</span>
        <Badge className={getQualityColor()}>
          {quality}%
        </Badge>
      </div>
      
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Brain className="h-4 w-4" />
        <span>Confidence: {confidence}%</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-600">
        <TrendingUp className="h-4 w-4" />
        <span>Skills: {matchedSkills.length}/{totalSkills}</span>
      </div>

      <Badge variant="outline" className="text-xs">
        {searchStrategy}
      </Badge>
    </div>
  );
};
