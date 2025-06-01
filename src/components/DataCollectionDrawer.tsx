
import React, { useState } from 'react';
import { Search, Database, Github, Globe, Users, AlertCircle, CheckCircle, Loader2, X, Clock, Zap, Brain, Target } from 'lucide-react';
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
    { id: 'github', name: 'GitHub', icon: Github, description: 'Developers with public repositories and contributions', status: 'Enhanced with AI code analysis' },
    { id: 'stackoverflow', name: 'Stack Overflow', icon: Users, description: 'Active community contributors and problem solvers', status: 'AI-powered reputation scoring' },
    { id: 'google', name: 'Google Search', icon: Globe, description: 'General web presence, portfolios, and profiles', status: 'Advanced search algorithms' },
    { id: 'linkedin', name: 'LinkedIn', icon: Users, description: 'Professional networks and career profiles', status: 'Apify-powered data extraction' },
    { id: 'kaggle', name: 'Kaggle', icon: Database, description: 'Data science competitions and ML practitioners', status: 'Competition ranking analysis' },
    { id: 'devto', name: 'Dev.to', icon: Globe, description: 'Active technical writers and community members', status: 'Content quality assessment' }
  ];

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <DrawerTitle className="flex items-center space-x-2">
                  <span>Phase 3: AI-Enhanced Data Collection</span>
                  <div className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                    Advanced AI
                  </div>
                </DrawerTitle>
                <DrawerDescription>
                  Multi-platform collection with Perplexity enrichment & advanced AI validation
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
          {/* Phase 3 Features Banner */}
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Phase 3 Enhancements Active</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-purple-700">
              <div className="flex items-center space-x-1">
                <Target className="w-3 h-3" />
                <span>Advanced AI Validation</span>
              </div>
              <div className="flex items-center space-x-1">
                <Brain className="w-3 h-3" />
                <span>Perplexity Enrichment</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" />
                <span>Quality Score: 60+ only</span>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          {isCollecting && progress && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-blue-800">Phase 3 Processing...</div>
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
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
                disabled={isCollecting}
              />
              <p className="text-xs text-slate-500 mt-1">
                🎯 Phase 3: Advanced AI will extract skills, experience level, and create optimized search strategies
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
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={isCollecting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Enhanced Data Sources</label>
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
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-slate-300 rounded"
                        disabled={isCollecting}
                      />
                      <Icon className="w-5 h-5 text-slate-600" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{source.name}</div>
                        <div className="text-xs text-slate-600">{source.description}</div>
                        <div className="text-xs text-purple-600 font-medium mt-1">✨ {source.status}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isCollecting || selectedSources.length === 0 || !query.trim()}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isCollecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              <span>{isCollecting ? 'AI Processing & Enriching...' : 'Start Phase 3 Collection'}</span>
            </button>
          </form>

          {/* Results Summary */}
          {collectionResult && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h4 className="font-medium text-slate-900 mb-3 flex items-center space-x-2">
                <Target className="w-4 h-4 text-purple-600" />
                <span>Phase 3 Collection Results</span>
              </h4>
              
              {/* Quality Metrics */}
              <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                  <div className="text-green-800">
                    <span className="font-medium">Validation Rate:</span> {collectionResult.quality_metrics?.validation_rate}%
                  </div>
                  <div className="text-green-800">
                    <span className="font-medium">AI Enhanced:</span> {collectionResult.quality_metrics?.ai_enhanced ? '✅' : '❌'}
                  </div>
                  <div className="text-green-800">
                    <span className="font-medium">Perplexity:</span> {collectionResult.quality_metrics?.perplexity_enriched ? '✅ Enriched' : '❌ Disabled'}
                  </div>
                </div>
              </div>

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
              
              <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <div className="text-sm font-medium text-purple-800">
                  🎯 Total: {collectionResult.total_validated} premium candidates collected
                </div>
                <div className="text-xs text-purple-700 mt-1">
                  ✨ AI-validated, Perplexity-enriched, and quality-scored for maximum relevance
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Tips */}
          <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
            <h5 className="text-sm font-medium text-amber-800 mb-2 flex items-center space-x-1">
              <Brain className="w-4 h-4" />
              <span>Phase 3 AI Enhancements:</span>
            </h5>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• <strong>Advanced Query Processing:</strong> AI extracts skills, experience, and creates platform-specific searches</li>
              <li>• <strong>Multi-Tier Validation:</strong> Each candidate validated for authenticity, relevance, and quality</li>
              <li>• <strong>Perplexity Enrichment:</strong> Real-time profile verification and additional context</li>
              <li>• <strong>Intelligent Scoring:</strong> 14+ scoring dimensions including technical depth and market demand</li>
              <li>• <strong>Smart Deduplication:</strong> Advanced matching and profile merging across platforms</li>
              <li>• <strong>Quality Gate:</strong> Only candidates scoring 60+ are stored (vs 50+ in previous phases)</li>
            </ul>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
