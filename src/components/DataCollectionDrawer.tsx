
import React, { useState } from 'react';
import { Search, Database, Github, Globe, Users, AlertCircle, CheckCircle, Loader2, X, Clock, Zap, Brain, Target, Star, Award } from 'lucide-react';
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
    { id: 'github', name: 'GitHub', icon: Github, description: 'Developers with public repositories and contributions', status: 'Semantic code analysis & quality scoring' },
    { id: 'stackoverflow', name: 'Stack Overflow', icon: Users, description: 'Active community contributors and problem solvers', status: 'AI-powered reputation & expertise analysis' },
    { id: 'google', name: 'Google Search', icon: Globe, description: 'General web presence, portfolios, and profiles', status: 'Advanced semantic search algorithms' },
    { id: 'linkedin', name: 'LinkedIn', icon: Users, description: 'Professional networks and career profiles', status: 'Enhanced profile extraction & validation' },
    { id: 'kaggle', name: 'Kaggle', icon: Database, description: 'Data science competitions and ML practitioners', status: 'Competition analysis & skill assessment' },
    { id: 'devto', name: 'Dev.to', icon: Globe, description: 'Active technical writers and community members', status: 'Content quality & thought leadership scoring' }
  ];

  const getTierBadge = (tier: string) => {
    const badges = {
      gold: { icon: Award, color: 'bg-yellow-100 text-yellow-800', label: 'Gold' },
      silver: { icon: Star, color: 'bg-gray-100 text-gray-800', label: 'Silver' },
      bronze: { icon: Target, color: 'bg-orange-100 text-orange-800', label: 'Bronze' }
    };
    return badges[tier as keyof typeof badges] || badges.bronze;
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <DrawerTitle className="flex items-center space-x-2">
                  <span>Phase 4: Intelligent Talent Discovery</span>
                  <div className="px-2 py-1 bg-gradient-to-r from-purple-100 to-green-100 text-purple-800 text-xs rounded-full font-medium">
                    Balanced AI + Semantic Search
                  </div>
                </DrawerTitle>
                <DrawerDescription>
                  Multi-tier quality system (Bronze/Silver/Gold) with semantic matching & market intelligence
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
          {/* Phase 4 Features Banner */}
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Phase 4: Intelligent Discovery Active</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-purple-700">
              <div className="flex items-center space-x-1">
                <Target className="w-3 h-3" />
                <span>Balanced Validation</span>
              </div>
              <div className="flex items-center space-x-1">
                <Brain className="w-3 h-3" />
                <span>Semantic Search</span>
              </div>
              <div className="flex items-center space-x-1">
                <Award className="w-3 h-3" />
                <span>Tier System (B/S/G)</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" />
                <span>Market Intelligence</span>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          {isCollecting && progress && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-blue-800">Phase 4 Processing...</div>
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
                🧠 Phase 4: Semantic AI extracts skills, creates embeddings, and builds intelligent search strategies across all sources
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
              <label className="block text-sm font-medium text-slate-700 mb-3">Intelligent Data Sources</label>
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
                        <div className="text-xs text-purple-600 font-medium mt-1">🚀 {source.status}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isCollecting || selectedSources.length === 0 || !query.trim()}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 text-white rounded-lg hover:from-purple-700 hover:via-blue-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isCollecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              <span>{isCollecting ? 'AI Processing & Enriching...' : 'Start Phase 4 Collection'}</span>
            </button>
          </form>

          {/* Results Summary */}
          {collectionResult && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h4 className="font-medium text-slate-900 mb-3 flex items-center space-x-2">
                <Target className="w-4 h-4 text-purple-600" />
                <span>Phase 4 Collection Results</span>
              </h4>
              
              {/* Enhanced Quality Metrics */}
              <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                  <div className="text-green-800">
                    <span className="font-medium">Success Rate:</span> {collectionResult.quality_metrics?.validation_rate}%
                  </div>
                  <div className="text-green-800">
                    <span className="font-medium">Semantic:</span> {collectionResult.quality_metrics?.semantic_search ? '✅' : '❌'}
                  </div>
                  <div className="text-green-800">
                    <span className="font-medium">Tier System:</span> {collectionResult.quality_metrics?.tier_system ? '✅ B/S/G' : '❌'}
                  </div>
                  <div className="text-green-800">
                    <span className="font-medium">Perplexity:</span> {collectionResult.quality_metrics?.perplexity_enriched ? '✅ Active' : '❌ Disabled'}
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
                      {result.error ? 'Failed' : `${result.validated || 0}/${result.total} quality candidates`}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 rounded-lg border border-purple-200">
                <div className="text-sm font-medium text-purple-800">
                  🎯 Total: {collectionResult.total_validated} quality candidates collected
                </div>
                <div className="text-xs text-purple-700 mt-1">
                  ⭐ Tier-based validation, semantic matching, and market intelligence scoring for optimal results
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Tips */}
          <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
            <h5 className="text-sm font-medium text-amber-800 mb-2 flex items-center space-x-1">
              <Brain className="w-4 h-4" />
              <span>Phase 4 Intelligent Features:</span>
            </h5>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• <strong>Balanced Validation:</strong> Bronze (30+), Silver (50+), Gold (70+) quality tiers for practical results</li>
              <li>• <strong>Semantic Search:</strong> AI embeddings for contextual skill matching beyond keyword search</li>
              <li>• <strong>Intelligent Scoring:</strong> Tier-appropriate expectations with market demand analysis</li>
              <li>• <strong>Smart Enrichment:</strong> Perplexity verification for Silver+ candidates to optimize API usage</li>
              <li>• <strong>Market Intelligence:</strong> Real-time skill demand, location factors, and experience multipliers</li>
              <li>• <strong>Advanced Deduplication:</strong> Semantic similarity detection and profile quality comparison</li>
            </ul>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
