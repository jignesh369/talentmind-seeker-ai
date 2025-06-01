import React, { useState } from 'react';
import { Search, Database, Github, Globe, Users, AlertCircle, CheckCircle, Loader2, X, Clock } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from './ui/drawer';
import { useEnhancedDataCollection } from '../hooks/useEnhancedDataCollection';

interface DataCollectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onDataCollected: () => void;
}

export const DataCollectionDrawer: React.FC<DataCollectionDrawerProps> = ({ 
  isOpen, 
  onClose, 
  onDataCollected 
}) => {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [selectedSources, setSelectedSources] = useState(['github', 'stackoverflow', 'google', 'linkedin', 'kaggle', 'devto']);
  const { collectData, isCollecting, collectionResult, progress } = useEnhancedDataCollection();

  const handleCollectData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const result = await collectData(query, location || undefined, selectedSources);
    if (result) {
      onDataCollected();
    }
  };

  const sources = [
    { id: 'github', name: 'GitHub', icon: Github, description: 'Developers with public repositories and contributions' },
    { id: 'stackoverflow', name: 'Stack Overflow', icon: Users, description: 'Active community contributors and problem solvers' },
    { id: 'google', name: 'Google Search', icon: Globe, description: 'General web presence, portfolios, and profiles' },
    { id: 'linkedin', name: 'LinkedIn', icon: Users, description: 'Professional networks and career profiles' },
    { id: 'kaggle', name: 'Kaggle', icon: Database, description: 'Data science competitions and ML practitioners' },
    { id: 'devto', name: 'Dev.to', icon: Globe, description: 'Active technical writers and community members' }
  ];

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <DrawerTitle>Enhanced Data Collection</DrawerTitle>
                <DrawerDescription>
                  Collect and enrich candidate data using AI-powered validation
                </DrawerDescription>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isCollecting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DrawerHeader>

        <div className="px-6 pb-6 overflow-y-auto">
          {/* Progress Indicator */}
          {isCollecting && progress && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-blue-800">Processing...</div>
                  <div className="text-xs text-blue-600">{progress}</div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleCollectData} className="space-y-6">
            <div>
              <label htmlFor="query" className="block text-sm font-medium text-slate-700 mb-2">
                Search Query
              </label>
              <input
                type="text"
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Senior Python machine learning engineer with TensorFlow experience"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
                disabled={isCollecting}
              />
              <p className="text-xs text-slate-500 mt-1">
                Be specific - AI will validate and enrich the results
              </p>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-2">
                Location (optional)
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., San Francisco, remote, United States"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={isCollecting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Data Sources</label>
              <div className="space-y-3">
                {sources.map((source) => {
                  const Icon = source.icon;
                  return (
                    <label key={source.id} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer border border-slate-200">
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
                        disabled={isCollecting}
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
              <span>{isCollecting ? 'Collecting & Enriching...' : 'Collect Data'}</span>
            </button>
          </form>

          {/* Results Summary */}
          {collectionResult && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h4 className="font-medium text-slate-900 mb-3">Collection Results</h4>
              <div className="space-y-2">
                {Object.entries(collectionResult.results).map(([source, result]) => (
                  <div key={source} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      {result.error ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      <span className="text-sm font-medium capitalize">{source}</span>
                      {result.error && (
                        <span className="text-xs text-red-600 ml-2">({result.error})</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">
                      {result.error ? 'Failed' : `${result.validated || 0}/${result.total} validated`}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-800">
                  Total: {collectionResult.total_validated} high-quality candidates collected
                </div>
                <div className="text-xs text-green-700 mt-1">
                  AI-validated and enriched with additional context
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h5 className="text-sm font-medium text-amber-800 mb-2">💡 Enhanced Data Collection Tips:</h5>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• <strong>Multi-platform search:</strong> Combines GitHub, LinkedIn, Kaggle, Dev.to & more</li>
              <li>• <strong>AI validation:</strong> Each candidate is validated for quality and relevance</li>
              <li>• <strong>Smart deduplication:</strong> Automatically merges profiles across platforms</li>
              <li>• <strong>Professional enrichment:</strong> Profiles enhanced with additional context</li>
              <li>• <strong>Quality scoring:</strong> Advanced algorithms rate candidate fit and quality</li>
            </ul>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
