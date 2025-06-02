
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Zap } from 'lucide-react';

interface CollectionSource {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number;
  candidatesFound: number;
  timeElapsed: number;
  error?: string;
}

interface DataCollectionProgressProps {
  sources: CollectionSource[];
  totalProgress: number;
  isCollecting: boolean;
  estimatedTimeRemaining?: number;
}

export const DataCollectionProgress = ({
  sources,
  totalProgress,
  isCollecting,
  estimatedTimeRemaining
}: DataCollectionProgressProps) => {
  const getStatusIcon = (status: CollectionSource['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'active':
        return <Zap className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: CollectionSource['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const totalCandidates = sources.reduce((sum, source) => sum + source.candidatesFound, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Data Collection Progress</h3>
        {isCollecting && estimatedTimeRemaining && (
          <span className="text-sm text-slate-600">
            ~{estimatedTimeRemaining}s remaining
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Overall Progress</span>
          <span>{Math.round(totalProgress)}%</span>
        </div>
        <Progress value={totalProgress} className="w-full" />
        <div className="text-center text-sm text-slate-600">
          {totalCandidates} candidates found across {sources.filter(s => s.status === 'completed').length} sources
        </div>
      </div>

      <div className="space-y-3">
        {sources.map((source) => (
          <div key={source.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(source.status)}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{source.name}</span>
                  <Badge className={getStatusColor(source.status)}>
                    {source.status}
                  </Badge>
                </div>
                {source.error && (
                  <p className="text-xs text-red-600 mt-1">{source.error}</p>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm font-medium">
                {source.candidatesFound} candidates
              </div>
              <div className="text-xs text-slate-500">
                {source.timeElapsed}s elapsed
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
