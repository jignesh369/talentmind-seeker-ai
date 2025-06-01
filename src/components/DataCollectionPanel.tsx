
import React, { useState } from 'react';
import { Search, Database, Github, Globe, Users, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useEnhancedDataCollection } from '../hooks/useEnhancedDataCollection';
import { useCandidates } from '../hooks/useCandidates';
import { DeduplicationStatsCard } from './DeduplicationStatsCard';

export const DataCollectionPanel = () => {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [selectedSources, setSelectedSources] = useState(['github', 'stackoverflow', 'google']);
  const { collectData, isCollecting, collectionResult, progress } = useEnhancedDataCollection();
  const { refetch } = useCandidates();

  const handleCollectData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const result = await collectData(query, location || undefined, selectedSources);
    if (result) {
      // Refresh the candidates list
      await refetch();
    }
  };

  const sources = [
    { id: 'github', name: 'GitHub', icon: Github, description: 'Developers with public repositories' },
    { id: 'stackoverflow', name: 'Stack Overflow', icon: Users, description: 'Active community contributors' },
    { id: 'google', name: 'Google Search', icon: Globe, description: 'General web presence and portfolios' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Enhanced Data Collection</h3>
          <p className="text-sm text-slate-600">Collect and deduplicate candidate data from multiple sources</p>
        </div>
      </div>

      <form onSubmit={handleCollectData} className="space-y-4">
        <div>
          <label htmlFor="query" className="block text-sm font-medium text-slate-700 mb-1">
            Search Query
          </label>
          <input
            type="text"
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., JavaScript React developer"
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">
            Location (optional)
          </label>
          <input
            type="text"
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., San Francisco, remote"
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Data Sources</label>
          <div className="space-y-2">
            {sources.map((source) => {
              const Icon = source.icon;
              return (
                <label key={source.id} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSources.includes(source.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSources([...selectedSources, source.id]);
                      } else {
                        setSelectedSources(selectedSources.filter(s => s !== source.id));
                      }
                    }}
                    className="w-4 h-4 text-green-600 focus:ring-green-500 border-slate-300 rounded"
                  />
                  <Icon className="w-5 h-5 text-slate-600" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">{source.name}</div>
                    <div className="text-xs text-slate-600">{source.description}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={isCollecting || selectedSources.length === 0 || !query.trim()}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCollecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span>{isCollecting ? 'Collecting...' : 'Collect Data'}</span>
        </button>
      </form>

      {/* Progress Indicator */}
      {isCollecting && progress && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <p className="text-sm text-blue-700">{progress}</p>
          </div>
        </div>
      )}

      {/* Enhanced Results Summary with Deduplication Stats */}
      {collectionResult && (
        <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
          <h4 className="font-medium text-slate-900 mb-3">Collection Results</h4>
          
          {/* Enhanced Deduplication Stats Card */}
          {collectionResult.enhancement_stats?.deduplication_metrics && (
            <DeduplicationStatsCard
              originalCount={collectionResult.enhancement_stats.deduplication_metrics.original_count}
              deduplicatedCount={collectionResult.enhancement_stats.deduplication_metrics.deduplicated_count}
              duplicatesRemoved={collectionResult.enhancement_stats.deduplication_metrics.duplicates_removed}
              mergeDecisions={collectionResult.enhancement_stats.deduplication_metrics.merge_decisions}
              deduplicationRate={collectionResult.enhancement_stats.deduplication_metrics.deduplication_rate}
            />
          )}

          {/* Source Results */}
          <div className="space-y-2">
            {Object.entries(collectionResult.results)
              .filter(([source, result]) => selectedSources.includes(source) || result.validated > 0)
              .map(([source, result]) => (
                <div key={source} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    {result.error ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-sm font-medium capitalize">{source.replace('-', ' ')}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {result.error ? 'Failed' : `${result.validated}/${result.total} candidates`}
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-3 p-3 bg-green-50 rounded-lg">
            <div className="text-sm font-medium text-green-800">
              Total: {collectionResult.total_validated} unique candidates collected
              {collectionResult.enhancement_stats?.deduplication_metrics?.duplicates_removed > 0 && (
                <span className="text-xs text-green-600 ml-2">
                  ({collectionResult.enhancement_stats.deduplication_metrics.duplicates_removed} duplicates merged)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
