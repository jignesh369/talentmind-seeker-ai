
import React from 'react';
import { Activity, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { MonitoringService } from '@/services/core/MonitoringService';

interface CompactMonitoringDashboardProps {
  availableSources: string[];
  isCollecting: boolean;
  collectionSources: any[];
  totalProgress: number;
}

export const CompactMonitoringDashboard = ({
  availableSources,
  isCollecting,
  collectionSources,
  totalProgress
}: CompactMonitoringDashboardProps) => {
  const monitoringService = new MonitoringService();
  const metrics = monitoringService.getPerformanceMetrics();

  const getSourceStatus = (sourceName: string) => {
    const source = collectionSources.find(s => s.name === sourceName);
    if (!source) return 'idle';
    return source.status;
  };

  const getSourceIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'active': return <Activity className="h-3 w-3 text-blue-500 animate-pulse" />;
      case 'error': return <AlertCircle className="h-3 w-3 text-red-500" />;
      default: return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          System Monitor
        </h4>
        <div className="text-xs text-slate-500">
          {isCollecting ? `${totalProgress}% complete` : 'Ready'}
        </div>
      </div>

      {/* Source Status Grid */}
      <div className="grid grid-cols-2 gap-2">
        {availableSources.slice(0, 4).map((source) => {
          const status = getSourceStatus(source);
          const sourceData = collectionSources.find(s => s.name === source);
          
          return (
            <div
              key={source}
              className="flex items-center gap-2 p-2 bg-white rounded border text-xs"
            >
              {getSourceIcon(status)}
              <span className="capitalize font-medium">{source}</span>
              {sourceData?.candidatesFound && (
                <span className="text-slate-500 ml-auto">
                  {sourceData.candidatesFound}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center p-2 bg-white rounded border">
          <div className="font-medium text-slate-900">{metrics.totalSearches}</div>
          <div className="text-slate-500">Searches</div>
        </div>
        <div className="text-center p-2 bg-white rounded border">
          <div className="font-medium text-slate-900">{Math.round(metrics.successRate * 100)}%</div>
          <div className="text-slate-500">Success</div>
        </div>
        <div className="text-center p-2 bg-white rounded border">
          <div className="font-medium text-slate-900">{Math.round(metrics.averageDuration / 1000)}s</div>
          <div className="text-slate-500">Avg Time</div>
        </div>
      </div>

      {/* Collection Progress Bar */}
      {isCollecting && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Collection Progress</span>
            <span>{totalProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
