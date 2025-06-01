
import React from 'react';
import { TrendingUp, Clock, Shield } from 'lucide-react';
import { calculateDataQualityMetrics } from '../utils/riskAssessment';

interface DataQualityIndicatorProps {
  candidate: any;
}

export const DataQualityIndicator: React.FC<DataQualityIndicatorProps> = ({ candidate }) => {
  const metrics = calculateDataQualityMetrics(candidate);
  
  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };
  
  return (
    <div className="flex items-center space-x-4 text-sm">
      <div className="flex items-center space-x-1">
        <TrendingUp className="w-4 h-4 text-slate-500" />
        <span className="text-slate-600">Completeness:</span>
        <span className={`px-2 py-1 rounded-full font-medium ${getQualityColor(metrics.completeness)}`}>
          {metrics.completeness}%
        </span>
      </div>
      
      <div className="flex items-center space-x-1">
        <Clock className="w-4 h-4 text-slate-500" />
        <span className="text-slate-600">Freshness:</span>
        <span className={`px-2 py-1 rounded-full font-medium ${getQualityColor(metrics.freshness)}`}>
          {metrics.freshness}%
        </span>
      </div>
      
      <div className="flex items-center space-x-1">
        <Shield className="w-4 h-4 text-slate-500" />
        <span className="text-slate-600">Reliability:</span>
        <span className={`px-2 py-1 rounded-full font-medium ${getQualityColor(metrics.reliability)}`}>
          {metrics.reliability}%
        </span>
      </div>
    </div>
  );
};
