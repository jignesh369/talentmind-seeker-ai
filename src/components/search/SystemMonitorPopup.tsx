
import React from 'react';
import { X, Activity, Clock, CheckCircle, AlertCircle, TrendingUp, Cpu, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MonitoringService } from '@/services/core/MonitoringService';

interface SystemMonitorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  availableSources: string[];
  isCollecting: boolean;
  collectionProgress: number;
}

export const SystemMonitorPopup = ({
  isOpen,
  onClose,
  availableSources,
  isCollecting,
  collectionProgress
}: SystemMonitorPopupProps) => {
  const monitoringService = new MonitoringService();
  const metrics = monitoringService.getPerformanceMetrics();

  const getSourceIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-4 w-4 text-green-500 animate-pulse" />;
      case 'idle': return <Clock className="h-4 w-4 text-slate-400" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">System Monitor</h2>
              <p className="text-sm text-slate-600">Real-time system status and performance</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* System Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Cpu className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{metrics.totalSearches}</div>
              <div className="text-sm text-slate-600">Total Searches</div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{Math.round(metrics.successRate * 100)}%</div>
              <div className="text-sm text-slate-600">Success Rate</div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{Math.round(metrics.averageDuration / 1000)}s</div>
              <div className="text-sm text-slate-600">Avg Response</div>
            </div>
          </div>

          {/* Source Health */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Data Source Health
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['github', 'stackoverflow', 'linkedin', 'google'].map((source) => {
                const isAvailable = availableSources.includes(source);
                const status = isCollecting ? 'active' : isAvailable ? 'idle' : 'error';
                
                return (
                  <div key={source} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getSourceIcon(status)}
                      <span className="font-medium capitalize text-slate-900">{source}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        isAvailable ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-xs text-slate-600">
                        {isAvailable ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Activity */}
          {isCollecting && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">Current Activity</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-900 font-medium">Data Collection in Progress</span>
                  <span className="text-blue-700 text-sm">{collectionProgress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${collectionProgress}%` }}
                  />
                </div>
                <p className="text-blue-700 text-sm mt-2">
                  Collecting candidates from multiple sources...
                </p>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {metrics.recentSearches.slice(0, 5).map((search: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <span className="text-sm text-slate-700 truncate">
                    {search.request?.query || 'Search query'}
                  </span>
                  <div className="flex items-center gap-2">
                    {search.status === 'completed' ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-xs text-slate-500">
                      {Math.round(search.duration / 1000)}s
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
