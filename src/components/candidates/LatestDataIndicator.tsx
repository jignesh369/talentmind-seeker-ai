
import React from 'react';
import { Clock, Database, Zap, CheckCircle, RefreshCw, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LatestDataIndicatorProps {
  searchMetadata?: any;
  aiStats?: any;
  isSearching?: boolean;
}

export const LatestDataIndicator = ({ searchMetadata, aiStats, isSearching }: LatestDataIndicatorProps) => {
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Extract StackOverflow enrichment data
  const stackoverflowEnrichment = searchMetadata?.stackoverflowEnrichment;

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {isSearching ? (
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <span className="font-medium text-slate-900">
              {isSearching ? 'Collecting Latest Data...' : 'Latest Data Sourced & Enriched'}
            </span>
          </div>

          {searchMetadata?.lastUpdated && (
            <div className="flex items-center space-x-1 text-sm text-slate-600">
              <Clock className="h-3 w-3" />
              <span>{formatTimeAgo(searchMetadata.lastUpdated)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {searchMetadata?.sourcesUsed && (
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-600" />
              <div className="flex space-x-1">
                {searchMetadata.sourcesUsed.map((source: string) => (
                  <Badge key={source} variant="outline" className="text-xs bg-white">
                    {source}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {stackoverflowEnrichment?.applied && (
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-slate-600">
                {stackoverflowEnrichment.enrichedCount}/{stackoverflowEnrichment.totalProcessed} SO Enhanced
              </span>
              {stackoverflowEnrichment.averageConfidence > 0 && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                  {stackoverflowEnrichment.averageConfidence}% confidence
                </Badge>
              )}
            </div>
          )}

          {aiStats && (
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-slate-600">
                {aiStats.scored}/{aiStats.totalProcessed} AI Enhanced
              </span>
            </div>
          )}

          {searchMetadata?.processingTime && (
            <Badge variant="outline" className="bg-white text-green-700">
              {searchMetadata.processingTime}ms
            </Badge>
          )}
        </div>
      </div>

      {stackoverflowEnrichment?.applied && stackoverflowEnrichment.enrichedCount > 0 && (
        <div className="mt-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Award className="h-3 w-3 text-orange-500" />
            StackOverflow enrichment added technical credibility scoring and community reputation data
          </span>
        </div>
      )}
    </div>
  );
};
